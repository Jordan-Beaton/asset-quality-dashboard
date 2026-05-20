import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mammoth: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: ((buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>) | null = null

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
  originator_name: string | null
  originator_email: string | null
}

type PersonRow = {
  name: string | null
  email: string | null
}

type MatchResult = {
  document_number: string
  originator_name: string
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

function cleanPersonValue(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(by|name|signature)\s*[:\-]?\s*/i, '')
    .replace(/\s*(date|signature|position)\s*[:\-]?.*$/i, '')
    .trim()
}

function normaliseName(value: string | null | undefined) {
  return cleanPersonValue(value || '').toLowerCase()
}

function isUsablePersonValue(value: string | null | undefined) {
  if (!value) return false
  const cleaned = cleanPersonValue(value)
  if (!cleaned) return false
  if (cleaned.length < 3 || cleaned.length > 60) return false
  if (!/[A-Za-z]/.test(cleaned)) return false
  if (/^(author|prepared by|originator|reviewer|approver|date|signature|position)$/i.test(cleaned)) return false
  if (/^(document|controlled|procedure|form|template|description|checker)\b/i.test(cleaned)) return false
  return true
}

async function loadOptionalLibs() {
  try {
    const mod = await import('mammoth')
    mammoth = mod.default ?? mod
  } catch {
    console.warn('WARNING: mammoth unavailable; DOCX author extraction disabled')
  }

  try {
    const mod: any = await import('pdf-parse')
    const fn = mod.default ?? mod
    if (typeof fn === 'function') {
      pdfParse = fn
    } else if (typeof mod.PDFParse === 'function') {
      pdfParse = async (buffer: Buffer) => {
        const parser = new mod.PDFParse({ data: buffer })
        const result = await parser.getText()
        if (typeof parser.destroy === 'function') await parser.destroy()
        return { text: result.text || '' }
      }
    }
  } catch {
    console.warn('WARNING: pdf-parse unavailable; PDF author extraction disabled')
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

function listFiles(folder: string) {
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

function extractAuthorFromText(text: string, peopleByName: Map<string, PersonRow>) {
  const normalised = text.replace(/\r/g, '\n')
  const lines = normalised
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const inlinePatterns = [
    /(?:author|prepared\s+by|originator)[:\s]+([A-Za-z][A-Za-z\s\-'.]{1,40}?)(?:\n|$|[|/]|reviewed|approved|date)/i,
  ]

  for (const pattern of inlinePatterns) {
    const match = normalised.match(pattern)
    if (!match) continue
    const candidate = cleanPersonValue(match[1])
    const key = normaliseName(candidate)
    const person = peopleByName.get(key)
    if (isUsablePersonValue(candidate) && person) return person
  }

  for (let index = 0; index < lines.length; index++) {
    if (!/^(author|prepared|prepared by|originator)$/i.test(lines[index])) continue

    for (const candidateLine of lines.slice(index + 1, index + 6)) {
      const candidate = cleanPersonValue(candidateLine)
      const key = normaliseName(candidate)
      const person = peopleByName.get(key)
      if (isUsablePersonValue(candidate) && person) return person
    }
  }

  return null
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`${table} fetch failed: ${error.message}`)
    if (!data || data.length === 0) break

    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }

  return rows
}

async function main() {
  await loadOptionalLibs()

  const peopleRows = await fetchAll<PersonRow>('people', 'name, email')
  const peopleByName = new Map<string, PersonRow>()
  for (const person of peopleRows) {
    const key = normaliseName(person.name)
    if (key) peopleByName.set(key, person)
  }

  const documents = await fetchAll<DocumentRow>('documents', 'id, document_number, originator_name, originator_email')
  const docsNeedingOriginator = new Map(
    documents
      .filter(document => !document.originator_name || !document.originator_name.trim())
      .map(document => [document.document_number.toUpperCase(), document]),
  )

  const matches: MatchResult[] = []
  const unmatched: string[] = []
  const seen = new Set<string>()

  for (const root of SCAN_ROOTS) {
    for (const folder of collectDocumentFolders(root)) {
      const docNumber = extractDocNumber(path.basename(folder))
      if (!docNumber || seen.has(docNumber)) continue
      seen.add(docNumber)

      const document = docsNeedingOriginator.get(docNumber)
      if (!document) continue

      const currentFolder = findCurrentFolder(folder) || folder
      const files = listFiles(currentFolder)
      let matchedPerson: PersonRow | null = null
      let matchedFile = ''

      for (const file of files) {
        const text = await readDocumentText(file)
        matchedPerson = extractAuthorFromText(text, peopleByName)
        if (matchedPerson) {
          matchedFile = file
          break
        }
      }

      if (!matchedPerson?.name) {
        unmatched.push(docNumber)
        continue
      }

      const { error } = await supabase
        .from('documents')
        .update({
          originator_name: matchedPerson.name.trim(),
          originator_email: matchedPerson.email || null,
        })
        .eq('id', document.id)

      if (error) throw new Error(`Failed updating ${docNumber}: ${error.message}`)

      matches.push({
        document_number: docNumber,
        originator_name: matchedPerson.name.trim(),
        file: matchedFile,
      })
    }
  }

  console.log(JSON.stringify({
    blankOriginatorsBefore: docsNeedingOriginator.size,
    originatorsBackfilled: matches.length,
    remainingWithoutAuthorMatch: unmatched.length,
    examples: matches.slice(0, 20),
    unmatchedExamples: unmatched.slice(0, 20),
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
