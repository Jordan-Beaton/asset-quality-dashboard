import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mammoth: any = null
let pdfParse: ((buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>) | null = null
type PdfParseFn = NonNullable<typeof pdfParse>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceKey)

const Z_ROOT = path.join('Z:\\', 'HSEQS', '00 - Management System Master')
const SCAN_ROOTS = [
  path.join(Z_ROOT, '1. Policies'),
  path.join(Z_ROOT, '2. Procedures'),
  path.join(Z_ROOT, '3. Linked'),
]

const DOC_NUM_RE = /[A-Z0-9]+-[A-Z]+-[A-Z]+-\d+/i
const TECHNICAL_FOLDER_RE = /^(archive|current\s+version|current\s+revision|curernt\s+version|review\s*(and|&)\s*approval|review|approval|rev\s+[a-z].*)$/i
const SUPPORTED_EXTENSIONS = new Set(['.docx', '.doc', '.pdf'])
const SKIP_PREFIXES = ['~$', '.']

type DocumentRow = {
  id: string
  document_number: string
  current_revision: string | null
  issue_date: string | null
}

type UpdateResult = {
  document_number: string
  current_revision: string | null
  previous_issue_date: string | null
  extracted_issue_date: string
  file: string
}

function extractDocNumber(name: string): string | null {
  const match = name.match(DOC_NUM_RE)
  return match ? match[0].toUpperCase() : null
}

function isSupportedFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath)
  return SUPPORTED_EXTENSIONS.has(ext) && !SKIP_PREFIXES.some(prefix => base.startsWith(prefix))
}

function filePriority(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.docx') return 0
  if (ext === '.doc') return 1
  if (ext === '.pdf') return 2
  return 9
}

async function loadOptionalLibs() {
  try {
    const mod = await import('mammoth')
    mammoth = mod.default ?? mod
  } catch {
    console.warn('WARNING: mammoth unavailable; DOCX issue-date extraction disabled')
  }

  try {
    const mod = (await import('pdf-parse')) as {
      default?: unknown
      PDFParse?: new (options: { data: Buffer }) => {
        getText: () => Promise<{ text?: string }>
        destroy?: () => Promise<void> | void
      }
    }
    const fn = mod.default ?? mod
    if (typeof fn === 'function') {
      pdfParse = fn as PdfParseFn
    } else if (typeof mod.PDFParse === 'function') {
      const PDFParse = mod.PDFParse
      pdfParse = async (buffer: Buffer) => {
        const parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        if (typeof parser.destroy === 'function') await parser.destroy()
        return { text: result.text || '' }
      }
    }
  } catch {
    console.warn('WARNING: pdf-parse unavailable; PDF issue-date extraction disabled')
  }
}

function collectDocumentFolders(root: string) {
  const found = new Set<string>()

  function walk(folder: string) {
    if (!fs.existsSync(folder)) return

    for (const name of fs.readdirSync(folder)) {
      const full = path.join(folder, name)
      if (!fs.statSync(full).isDirectory()) continue
      if (TECHNICAL_FOLDER_RE.test(name.trim())) continue

      if (extractDocNumber(name)) found.add(full)
      walk(full)
    }
  }

  walk(root)
  return [...found]
}

function findCurrentFolder(docFolder: string) {
  const candidates = ['Current Version', 'Current Revision', 'Curernt Version', 'Current']
  for (const candidate of candidates) {
    const folder = path.join(docFolder, candidate)
    if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) return folder
  }
  return null
}

function listCurrentFiles(folder: string) {
  if (!fs.existsSync(folder)) return []

  const directFiles = fs
    .readdirSync(folder)
    .map(name => path.join(folder, name))
    .filter(file => fs.statSync(file).isFile() && isSupportedFile(file))
    .sort((a, b) => filePriority(a) - filePriority(b))

  if (directFiles.length > 0) return directFiles

  const revisionFolders = fs
    .readdirSync(folder)
    .map(name => path.join(folder, name))
    .filter(candidate => fs.statSync(candidate).isDirectory() && /^Rev\s+[A-Z]/i.test(path.basename(candidate)))
    .sort((a, b) => {
      const aDraft = /draft/i.test(a)
      const bDraft = /draft/i.test(b)
      if (aDraft !== bDraft) return aDraft ? 1 : -1
      return path.basename(b).localeCompare(path.basename(a))
    })

  for (const revisionFolder of revisionFolders) {
    const revisionFiles = fs
      .readdirSync(revisionFolder)
      .map(name => path.join(revisionFolder, name))
      .filter(file => fs.statSync(file).isFile() && isSupportedFile(file))
      .sort((a, b) => filePriority(a) - filePriority(b))

    if (revisionFiles.length > 0) return revisionFiles
  }

  return []
}

async function readDocumentText(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()

  try {
    if (ext === '.docx' && mammoth) {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value || ''
    }

    if (ext === '.pdf' && pdfParse) {
      const result = await pdfParse(fs.readFileSync(filePath), { max: 5 })
      return result.text || ''
    }
  } catch {
    return ''
  }

  return ''
}

function normaliseRevision(value: string | null | undefined) {
  return (value || '')
    .trim()
    .replace(/^rev(?:ision)?\s*/i, '')
    .toUpperCase()
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function isoDate(year: number, month: number, day: number) {
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function parseDateValue(value: string | null | undefined) {
  const trimmed = (value || '').trim()
  if (!trimmed) return null

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const numeric = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (numeric) return isoDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]))

  const named = trimmed.match(/^(\d{1,2})[\s\-.]+([A-Za-z]{3,9})[\s\-.]+(\d{2,4})$/)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    if (month) return isoDate(Number(named[3]), month, Number(named[1]))
  }

  return null
}

function findDateInLines(lines: string[], start: number, count: number) {
  const datePattern = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[\s\-.]+[A-Za-z]{3,9}[\s\-.]+\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/

  for (const line of lines.slice(start, start + count)) {
    const match = line.match(datePattern)
    const parsed = match ? parseDateValue(match[1]) : null
    if (parsed) return parsed
  }

  return null
}

function extractIssueDateFromText(text: string, currentRevision: string | null) {
  const revision = normaliseRevision(currentRevision)
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (revision) {
    const authIndex = lines.findIndex(line => /revisions?\s*&?\s*authorisations?/i.test(line))
    if (authIndex >= 0) {
      for (let index = authIndex + 1; index < Math.min(lines.length, authIndex + 25); index += 1) {
        if (normaliseRevision(lines[index]) === revision) {
          const parsed = findDateInLines(lines, index + 1, 8)
          if (parsed) return parsed
        }
      }
    }

    const revisionRecordIndex = lines.findIndex(line => /^revision record$/i.test(line))
    if (revisionRecordIndex >= 0) {
      for (let index = revisionRecordIndex + 1; index < Math.min(lines.length, revisionRecordIndex + 120); index += 1) {
        if (normaliseRevision(lines[index]) === revision) {
          const parsed = findDateInLines(lines, index + 1, 6)
          if (parsed) return parsed
        }
      }
    }
  }

  const labelIndex = lines.findIndex(line => /^(issue date|date issued|effective date|date)$/i.test(line))
  if (labelIndex >= 0) {
    const parsed = findDateInLines(lines, labelIndex + 1, 4)
    if (parsed) return parsed
  }

  return null
}

async function fetchAllDocuments(): Promise<DocumentRow[]> {
  const rows: DocumentRow[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, document_number, current_revision, issue_date')
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`documents fetch failed: ${error.message}`)
    if (!data || data.length === 0) break

    rows.push(...(data as DocumentRow[]))
    if (data.length < pageSize) break
  }

  return rows
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  await loadOptionalLibs()

  const documents = await fetchAllDocuments()
  const documentsByNumber = new Map(documents.map(document => [document.document_number.toUpperCase(), document]))
  const seen = new Set<string>()
  const updates: UpdateResult[] = []
  const unchanged: UpdateResult[] = []
  const noDateFound: string[] = []

  for (const root of SCAN_ROOTS) {
    for (const folder of collectDocumentFolders(root)) {
      const documentNumber = extractDocNumber(path.basename(folder))
      if (!documentNumber || seen.has(documentNumber)) continue
      seen.add(documentNumber)

      const document = documentsByNumber.get(documentNumber)
      if (!document) continue

      const currentFolder = findCurrentFolder(folder) || folder
      const files = listCurrentFiles(currentFolder)
      let extractedIssueDate: string | null = null
      let matchedFile = ''

      for (const file of files) {
        const text = await readDocumentText(file)
        extractedIssueDate = extractIssueDateFromText(text, document.current_revision)
        if (extractedIssueDate) {
          matchedFile = file
          break
        }
      }

      if (!extractedIssueDate) {
        noDateFound.push(documentNumber)
        continue
      }

      const result = {
        document_number: documentNumber,
        current_revision: document.current_revision,
        previous_issue_date: document.issue_date,
        extracted_issue_date: extractedIssueDate,
        file: matchedFile,
      }

      if (document.issue_date === extractedIssueDate) {
        unchanged.push(result)
        continue
      }

      if (!dryRun) {
        const { error } = await supabase
          .from('documents')
          .update({ issue_date: extractedIssueDate })
          .eq('id', document.id)

        if (error) throw new Error(`Failed updating ${documentNumber}: ${error.message}`)

        if (document.current_revision) {
          await supabase
            .from('document_revisions')
            .update({ issue_date: extractedIssueDate })
            .eq('document_id', document.id)
            .eq('revision', document.current_revision)
        }
      }

      updates.push(result)
    }
  }

  console.log(JSON.stringify({
    dryRun,
    documentsInDatabase: documents.length,
    documentFoldersScanned: seen.size,
    issueDatesChanged: updates.length,
    issueDatesAlreadyCorrect: unchanged.length,
    noIssueDateFound: noDateFound.length,
    changedExamples: updates.slice(0, 30),
    noDateExamples: noDateFound.slice(0, 30),
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
