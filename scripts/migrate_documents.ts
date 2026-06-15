/**
 * Document Migration Script
 * =========================
 * Migrates files from Z:\HSEQS\00 - Management System Master into Supabase.
 *
 * For each document folder it will:
 *   1. Match the folder to a document record in Supabase via document number
 *   2. Upload the Current Version file(s) to Supabase storage
 *   3. Upload Archive/Rev X files as historical revision records
 *   4. Attempt to extract Originator / Reviewer / Approver from .docx or .pdf
 *   5. Log every skipped / unmatched document to a CSV and a full JSON log
 *
 * Usage
 * -----
 *   # Install optional extraction packages (one-time)
 *   npm install --save-dev mammoth pdf-parse @types/pdf-parse
 *
 *   # Dry run first — no uploads, no DB changes, just logs what would happen
 *   npx ts-node scripts/migrate_documents.ts --dry-run
 *
 *   # Full run
 *   npx ts-node scripts/migrate_documents.ts
 *
 *   # Process a single document (useful for testing)
 *   npx ts-node scripts/migrate_documents.ts --doc-number ENS-HSEQ-PRO-001
 *
 * Outputs (written to scripts/output/)
 * -------------------------------------
 *   migration_YYYYMMDD_HHMMSS.json   Full structured log
 *   skipped_YYYYMMDD_HHMMSS.csv      Skipped documents — open in Excel to review
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// ── Optional extraction libraries ─────────────────────────────────────────────
// These are optional. The script runs fine without them; metadata extraction
// is simply skipped.  Install with:
//   npm install --save-dev mammoth pdf-parse @types/pdf-parse

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mammoth: any = null
let pdfParse: ((buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>) | null = null
type PdfParseFn = NonNullable<typeof pdfParse>

async function loadOptionalLibs() {
  try {
    // Dynamic import works in both CJS and ESM mode
    const mod = await import('mammoth')
    mammoth = mod.default ?? mod
  } catch {
    console.warn('⚠  mammoth not installed — Word metadata extraction disabled')
    console.warn('   Run: npm install --save-dev mammoth\n')
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
    console.warn('⚠  pdf-parse not installed — PDF metadata extraction disabled')
    console.warn('   Run: npm install --save-dev pdf-parse @types/pdf-parse\n')
  }
}

// ── Configuration ─────────────────────────────────────────────────────────────

const Z_ROOT = path.join('Z:\\', 'HSEQS', '00 - Management System Master')

type SectionLayout = 'flat' | 'dept'

const SCAN_SECTIONS: Array<{ name: string; root: string; layout: SectionLayout }> = [
  { name: 'Policies',   root: path.join(Z_ROOT, '1. Policies'),   layout: 'flat' },
  { name: 'Procedures', root: path.join(Z_ROOT, '2. Procedures'), layout: 'dept' },
  { name: 'Linked',     root: path.join(Z_ROOT, '3. Linked'),     layout: 'dept' },
]

const STORAGE_BUCKET = 'document-files'

const SUPPORTED_EXTENSIONS = new Set([
  '.docx', '.doc',
  '.odt', '.ods', '.odp',
  '.xlsx', '.xls',
  '.pptx', '.ppt',
  '.vsdx', '.vsd',
  '.pdf',
])

// Temp / hidden file prefixes to ignore
const SKIP_PREFIXES = ['~$', '.']

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbDocRow {
  id: string
  document_number: string
  current_revision: string | null
  issue_date: string | null
  file_path: string | null
  originator_name: string | null
  originator_email?: string | null
  reviewed_by: string | null
  reviewed_at?: string | null
  approved_by: string | null
  approved_at?: string | null
}

interface PersonRow {
  name: string
  email: string | null
  active: boolean | null
}

interface ExtractedMetadata {
  originator_name?: string
  reviewed_by?: string
  reviewed_at?: string
  approved_by?: string
  approved_at?: string
  issue_date?: string
}

interface MatchedResult {
  doc_number: string
  primary_file: string
  all_current_files: string[]
  storage_path: string
  revisions_added: number
  revision_errors: number
  meta_extracted: boolean
  meta_fields: Record<string, string>
}

interface SkippedResult {
  doc_number: string
  folder: string
  reason: string
}

interface ErrorResult {
  doc_number: string
  file: string
  error: string
}

interface RunResults {
  matched: MatchedResult[]
  skipped: SkippedResult[]
  errors: ErrorResult[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Matches ENS-HSEQ-PRO-001 and C4-AST-FRM-001 style document numbers
const DOC_NUM_RE = /[A-Z0-9]+-[A-Z]+-[A-Z]+-\d+/i

function extractDocNumber(name: string): string | null {
  const m = name.match(DOC_NUM_RE)
  return m ? m[0].toUpperCase() : null
}

function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  const base = path.basename(filePath)
  return (
    SUPPORTED_EXTENSIONS.has(ext) &&
    !SKIP_PREFIXES.some(p => base.startsWith(p))
  )
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.pdf':  'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc':  'application/msword',
    '.odt':  'application/vnd.oasis.opendocument.text',
    '.ods':  'application/vnd.oasis.opendocument.spreadsheet',
    '.odp':  'application/vnd.oasis.opendocument.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls':  'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt':  'application/vnd.ms-powerpoint',
    '.vsdx': 'application/vnd.visio',
    '.vsd':  'application/vnd.visio',
  }
  return map[ext] ?? 'application/octet-stream'
}

function filePriority(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase()
  const order: Record<string, number> = {
    '.pdf': 0, '.docx': 1, '.doc': 2, '.odt': 3,
    '.xlsx': 4, '.xls': 5, '.ods': 6,
    '.pptx': 7, '.ppt': 8, '.odp': 9,
    '.vsdx': 10, '.vsd': 11,
  }
  return order[ext] ?? 9
}

function utcNow(): string {
  return new Date().toISOString()
}

function formatTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15)
}

function normalisePersonLookupKey(name: string | null | undefined): string {
  return cleanPersonValue(name || '').trim().toLowerCase()
}

function buildPeopleLookup(people: PersonRow[]) {
  const names = new Set<string>()
  const emails = new Map<string, string>()

  people.forEach(person => {
    if (!person.name) return

    const key = normalisePersonLookupKey(person.name)
    if (!key) return

    names.add(key)
    if (person.email) emails.set(key, person.email.trim())
  })

  return { names, emails }
}

function resolvePeopleEmail(name: string | undefined, emailMap: Map<string, string>): string | undefined {
  if (!name) return undefined
  return emailMap.get(normalisePersonLookupKey(name))
}

function isKnownPeopleName(name: string | null | undefined, peopleNames: Set<string>): name is string {
  if (!isUsablePersonValue(name)) return false
  return peopleNames.has(normalisePersonLookupKey(name))
}

function shouldReplaceDocumentPerson(
  field: 'originator_name' | 'reviewed_by' | 'approved_by',
  current: string | null | undefined,
  extracted: string | undefined,
  peopleNames: Set<string>,
) {
  if (!isKnownPeopleName(extracted, peopleNames)) return false
  if (!current || !current.trim()) return true

  const currentClean = current.trim()
  if (GENERIC_PERSON_VALUES.has(currentClean.toLowerCase())) return true
  if (!isKnownPeopleName(currentClean, peopleNames)) return true

  return false
}

function buildDocumentMetadataPayload(
  dbRow: DbDocRow,
  meta: ExtractedMetadata,
  peopleNames: Set<string>,
  peopleEmailMap: Map<string, string>,
): Record<string, string> {
  const payload: Record<string, string> = {}

  if (shouldReplaceDocumentPerson('originator_name', dbRow.originator_name, meta.originator_name, peopleNames)) {
    payload.originator_name = cleanPersonValue(meta.originator_name || '')
    const email = resolvePeopleEmail(payload.originator_name, peopleEmailMap)
    if (email) payload.originator_email = email
  }

  if (shouldReplaceDocumentPerson('reviewed_by', dbRow.reviewed_by, meta.reviewed_by, peopleNames)) {
    payload.reviewed_by = cleanPersonValue(meta.reviewed_by || '')
  }

  if (shouldReplaceDocumentPerson('approved_by', dbRow.approved_by, meta.approved_by, peopleNames)) {
    payload.approved_by = cleanPersonValue(meta.approved_by || '')
  }

  if (meta.reviewed_at && !dbRow.reviewed_at) payload.reviewed_at = meta.reviewed_at
  if (meta.approved_at && !dbRow.approved_at) payload.approved_at = meta.approved_at
  if (meta.issue_date && !dbRow.issue_date) payload.issue_date = meta.issue_date

  return payload
}

function buildRevisionMetadataPayload(
  meta: ExtractedMetadata,
  fallbackIssueDate: string | null,
  peopleNames: Set<string>,
) {
  const payload: Record<string, string> = {}
  const issueDate = meta.issue_date || fallbackIssueDate

  if (issueDate) payload.issue_date = issueDate
  if (isKnownPeopleName(meta.reviewed_by, peopleNames)) payload.reviewed_by = cleanPersonValue(meta.reviewed_by || '')
  if (meta.reviewed_at) payload.reviewed_at = meta.reviewed_at
  if (isKnownPeopleName(meta.approved_by, peopleNames)) payload.approved_by = cleanPersonValue(meta.approved_by || '')
  if (meta.approved_at) payload.approved_at = meta.approved_at

  return payload
}

// ── File system scanning ──────────────────────────────────────────────────────

function mergeRevisionEvidence(meta: ExtractedMetadata, evidence: ReviewApprovalEvidence | undefined): ExtractedMetadata {
  if (!evidence) return meta
  return {
    ...meta,
    reviewed_by: meta.reviewed_by || evidence.reviewed_by,
    reviewed_at: meta.reviewed_at || evidence.reviewed_at,
    approved_by: meta.approved_by || evidence.approved_by,
    approved_at: meta.approved_at || evidence.approved_at,
  }
}

const TECHNICAL_FOLDER_RE = /^(archive|current\s+version|current\s+revision|curernt\s+version|review\s*(and|&)\s*approval|review|approval|rev\s+[a-z].*)$/i

function collectDocumentFolders(root: string): string[] {
  const found = new Set<string>()

  function walk(folder: string) {
    if (!fs.existsSync(folder)) return

    for (const name of fs.readdirSync(folder)) {
      const full = path.join(folder, name)
      if (!fs.statSync(full).isDirectory()) continue
      if (TECHNICAL_FOLDER_RE.test(name.trim())) continue

      if (extractDocNumber(name)) {
        found.add(full)
      }

      walk(full)
    }
  }

  walk(root)
  return [...found].sort()
}

function findCurrentFolder(docFolder: string): string | null {
  const candidateNames = [
    'Current Version',
    'Current Revision',
    'Curernt Version',
    'Current',
  ]

  for (const name of candidateNames) {
    const candidate = path.join(docFolder, name)
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate
  }

  const fuzzy = fs
    .readdirSync(docFolder)
    .map(name => path.join(docFolder, name))
    .find(full => {
      if (!fs.statSync(full).isDirectory()) return false
      const normalised = path.basename(full).toLowerCase().replace(/[^a-z]/g, '')
      return normalised === 'currentversion' || normalised === 'currentrevision' || normalised === 'curerntversion'
    })

  return fuzzy || null
}

function listCurrentFiles(currentDir: string): string[] {
  if (!fs.existsSync(currentDir)) return []

  // Case 1: files sit directly inside Current Version/
  const directFiles = fs
    .readdirSync(currentDir)
    .filter(name => {
      const full = path.join(currentDir, name)
      return fs.statSync(full).isFile() && isSupportedFile(name)
    })
    .map(name => path.join(currentDir, name))

  if (directFiles.length > 0) return directFiles

  // Case 2: files are inside Current Version/Rev X/ subfolders.
  // Pick the most recent non-draft sub-folder (highest letter alphabetically).
  const revFolders = fs
    .readdirSync(currentDir)
    .filter(name => {
      const full = path.join(currentDir, name)
      return fs.statSync(full).isDirectory() && /^Rev\s+[A-Z]/i.test(name)
    })
    // Sort: non-draft first, then by revision letter descending
    .sort((a, b) => {
      const aDraft = /draft/i.test(a)
      const bDraft = /draft/i.test(b)
      if (aDraft !== bDraft) return aDraft ? 1 : -1   // drafts go last
      return b.localeCompare(a)                        // descending letter
    })

  for (const revFolder of revFolders) {
    const revDir = path.join(currentDir, revFolder)
    const revFiles = fs
      .readdirSync(revDir)
      .filter(name => {
        const full = path.join(revDir, name)
        return fs.statSync(full).isFile() && isSupportedFile(name)
      })
      .map(name => path.join(revDir, name))
    if (revFiles.length > 0) return revFiles
  }

  return []
}

interface ArchiveRevision {
  label: string
  files: string[]
}

interface ReviewApprovalEvidence {
  revision: string
  reviewed_by?: string
  reviewed_at?: string
  approved_by?: string
  approved_at?: string
}

function listArchiveRevisions(archiveDir: string): ArchiveRevision[] {
  if (!fs.existsSync(archiveDir)) return []
  return fs
    .readdirSync(archiveDir)
    .filter(name => {
      const full = path.join(archiveDir, name)
      return fs.statSync(full).isDirectory()
    })
    .sort()
    .map(revFolderName => {
      const revMatch = revFolderName.match(/^Rev\s+([A-Z])/i)
      const label = revMatch ? revMatch[1].toUpperCase() : revFolderName.trim()
      const revDir = path.join(archiveDir, revFolderName)
      const files = fs
        .readdirSync(revDir)
        .filter(f => isSupportedFile(f))
        .map(f => path.join(revDir, f))
      return { label, files }
    })
    .filter(r => r.files.length > 0)
}

function parseEmailDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().slice(0, 10)
}

function extractEmailSenderAndDate(filePath: string): { name?: string; date?: string } {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.eml') {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const fromMatch = content.match(/^From:\s*"?([^"<\r\n]+?)"?\s*(?:<[^>\r\n]+>)?\s*$/im)
      const dateMatch = content.match(/^Date:\s*([^\r\n]+)/im)
      const name = fromMatch?.[1] ? cleanPersonValue(fromMatch[1]) : undefined
      return {
        name: isUsablePersonValue(name) ? name : undefined,
        date: parseEmailDate(dateMatch?.[1]),
      }
    } catch {
      return {}
    }
  }

  // Legacy .msg files are binary Outlook messages. Without adding a parser
  // package, try a best-effort scan of UTF-16/Latin text for common headers.
  if (ext === '.msg') {
    try {
      const buffer = fs.readFileSync(filePath)
      const text = `${buffer.toString('utf16le')}\n${buffer.toString('latin1')}`
      const fromMatch = text.match(/From:\s*"?([^"<\r\n]+?)"?\s*(?:<[^>\r\n]+>)?/i)
      const dateMatch = text.match(/(?:Sent|Date):\s*([A-Za-z]{3,9},?\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}[^<\r\n]*)/i)
      const name = fromMatch?.[1] ? cleanPersonValue(fromMatch[1]) : undefined
      return {
        name: isUsablePersonValue(name) ? name : undefined,
        date: parseEmailDate(dateMatch?.[1]),
      }
    } catch {
      return {}
    }
  }

  return {}
}

function collectReviewApprovalEvidence(docFolder: string): Map<string, ReviewApprovalEvidence> {
  const root = path.join(docFolder, 'Review and Approval')
  const byRevision = new Map<string, ReviewApprovalEvidence>()
  if (!fs.existsSync(root)) return byRevision

  const revisionFolders = fs
    .readdirSync(root)
    .map(name => path.join(root, name))
    .filter(full => fs.statSync(full).isDirectory())

  for (const revisionFolder of revisionFolders) {
    const revisionName = path.basename(revisionFolder)
    const match = revisionName.match(/^Rev\s+([A-Z])/i)
    const revision = match ? match[1].toUpperCase() : revisionName.trim()
    const evidence: ReviewApprovalEvidence = { revision }

    for (const kind of ['Review', 'Approval'] as const) {
      const kindDir = path.join(revisionFolder, kind)
      if (!fs.existsSync(kindDir) || !fs.statSync(kindDir).isDirectory()) continue

      const evidenceFiles = fs
        .readdirSync(kindDir)
        .map(name => path.join(kindDir, name))
        .filter(full => fs.statSync(full).isFile())
        .filter(full => ['.eml', '.msg'].includes(path.extname(full).toLowerCase()))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

      for (const file of evidenceFiles) {
        const parsed = extractEmailSenderAndDate(file)
        const fallbackDate = fileModifiedDate(file)
        if (kind === 'Review') {
          if (!evidence.reviewed_by && parsed.name) evidence.reviewed_by = parsed.name
          if (!evidence.reviewed_at) evidence.reviewed_at = parsed.date || fallbackDate || undefined
        } else {
          if (!evidence.approved_by && parsed.name) evidence.approved_by = parsed.name
          if (!evidence.approved_at) evidence.approved_at = parsed.date || fallbackDate || undefined
        }
        if (
          (kind === 'Review' && evidence.reviewed_by && evidence.reviewed_at) ||
          (kind === 'Approval' && evidence.approved_by && evidence.approved_at)
        ) {
          break
        }
      }
    }

    byRevision.set(revision, evidence)
  }

  return byRevision
}

// ── Metadata extraction ───────────────────────────────────────────────────────

const META_PATTERNS: Record<keyof Pick<ExtractedMetadata, 'originator_name' | 'reviewed_by' | 'approved_by'>, RegExp> = {
  originator_name: /(?:prepared\s+by|originator|author|authored\s+by|created\s+by)[:\s]+([A-Za-z][A-Za-z\s\-'.]{1,40}?)(?:\n|\r|$|[|/]|reviewed|approved|date)/i,
  reviewed_by:     /(?:reviewed\s+by|reviewer)[:\s]+([A-Za-z][A-Za-z\s\-'.]{1,40}?)(?:\n|\r|$|[|/]|approved|originator|prepared|date)/i,
  approved_by:     /(?:approved\s+by|approver|authorised\s+by|authorized\s+by)[:\s]+([A-Za-z][A-Za-z\s\-'.]{1,40}?)(?:\n|\r|$|[|/]|reviewed|originator|prepared|date)/i,
}

const DATE_PATTERNS: Record<keyof Pick<ExtractedMetadata, 'issue_date' | 'reviewed_at' | 'approved_at'>, RegExp[]> = {
  issue_date: [
    /(?:issue\s+date|date\s+issued|effective\s+date)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  ],
  reviewed_at: [
    /(?:reviewed\s+date|review\s+date|date\s+reviewed)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  ],
  approved_at: [
    /(?:approved\s+date|approval\s+date|date\s+approved|authorised\s+date|authorized\s+date)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
  ],
}

const GENERIC_PERSON_VALUES = new Set([
  'applicable director',
  'approval',
  'approval date',
  'approved by',
  'approver',
  'author',
  'date',
  'document owner',
  'ens site manager',
  'name',
  'position',
  'prepared by',
  'project',
  'reviewed by',
  'reviewer',
  'revision',
  'revision record',
  'signature',
])

function cleanPersonValue(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^(name|by|date|signature)\s*[:\-]?\s*/i, '')
    .replace(/\s*(date|signature|position|revision record).*$/i, '')
    .replace(/[|/,;:]+$/g, '')
    .trim()
}

function isUsablePersonValue(value: string | null | undefined): value is string {
  if (!value) return false
  const cleaned = cleanPersonValue(value)
  if (!cleaned) return false
  if (cleaned.length < 3 || cleaned.length > 60) return false
  if (!/[A-Za-z]/.test(cleaned)) return false
  if (GENERIC_PERSON_VALUES.has(cleaned.toLowerCase())) return false
  if (/^(rev|revision|document|controlled|procedure|form|template)\b/i.test(cleaned)) return false
  return true
}

function normaliseDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += year >= 70 ? 1900 : 2000

  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return null
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  return date.toISOString().slice(0, 10)
}

function fileModifiedDate(filePath: string): string | null {
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

function parseMetaFromText(text: string): ExtractedMetadata {
  const found: ExtractedMetadata = {}
  const normalised = text.replace(/\u00a0/g, ' ')
  const lines = normalised
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  for (const [field, pattern] of Object.entries(META_PATTERNS)) {
    const m = normalised.match(pattern)
    if (m) {
      const val = cleanPersonValue(m[1])
      if (isUsablePersonValue(val)) found[field as keyof typeof META_PATTERNS] = val
    }
  }

  const labelMap: Array<{ field: keyof Pick<ExtractedMetadata, 'originator_name' | 'reviewed_by' | 'approved_by'>; labels: RegExp[] }> = [
    { field: 'originator_name', labels: [/^(prepared|prepared by|originator|author|authored by|created by)$/i] },
    { field: 'reviewed_by', labels: [/^(reviewed|reviewed by|reviewer)$/i] },
    { field: 'approved_by', labels: [/^(approved|approved by|approver|authorised by|authorized by)$/i] },
  ]

  for (let index = 0; index < lines.length; index++) {
    for (const item of labelMap) {
      if (found[item.field]) continue
      if (!item.labels.some(pattern => pattern.test(lines[index]))) continue

      const next = lines.slice(index + 1, index + 5).find(candidate => {
        return isUsablePersonValue(candidate) && !labelMap.some(other => other.labels.some(pattern => pattern.test(candidate)))
      })

      if (next) found[item.field] = cleanPersonValue(next)
    }
  }

  for (const [field, patterns] of Object.entries(DATE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = normalised.match(pattern)
      const parsed = match ? normaliseDate(match[1]) : null
      if (parsed) {
        found[field as keyof typeof DATE_PATTERNS] = parsed
        break
      }
    }
  }

  return found
}

async function extractFromDocx(filePath: string): Promise<ExtractedMetadata> {
  if (!mammoth) return {}
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return parseMetaFromText(result.value)
  } catch {
    return {}
  }
}

async function extractFromPdf(filePath: string): Promise<ExtractedMetadata> {
  if (!pdfParse) return {}
  try {
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer, { max: 2 }) // first 2 pages only
    return parseMetaFromText(data.text)
  } catch {
    return {}
  }
}

async function extractMetadata(files: string[]): Promise<ExtractedMetadata> {
  const sorted = [...files].sort((a, b) => filePriority(a) - filePriority(b))
  for (const file of sorted) {
    const ext = path.extname(file).toLowerCase()
    let result: ExtractedMetadata = {}
    if (ext === '.pdf') {
      result = await extractFromPdf(file)
    } else if (ext === '.docx' || ext === '.doc') {
      result = await extractFromDocx(file)
    }
    if (Object.keys(result).length > 0) return result
  }
  return {}
}

// ── Supabase upload ───────────────────────────────────────────────────────────

async function uploadFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  localPath: string,
  storagePath: string,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) return true
  try {
    const buffer = fs.readFileSync(localPath)
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: getMimeType(localPath),
        upsert: true,
      })
    return !error
  } catch {
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── Parse args ───────────────────────────────────────────────────────────────
  const args = process.argv.slice(2)
  const dryRun     = args.includes('--dry-run')
  const docFilter  = args.find(a => a.startsWith('--doc-number='))?.split('=')[1]?.toUpperCase()
               ?? (args.includes('--doc-number') ? args[args.indexOf('--doc-number') + 1]?.toUpperCase() : undefined)

  // ── Load optional extraction libraries ───────────────────────────────────────
  await loadOptionalLibs()

  if (dryRun) {
    console.log('⚡ DRY RUN — no files will be uploaded, no DB rows will change\n')
  }

  // ── Load env ─────────────────────────────────────────────────────────────────
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '❌  Missing environment variables.\n' +
      '    Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local'
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // ── Fetch document register ───────────────────────────────────────────────────
  console.log('📋 Fetching document register from Supabase...')
  const { data: docRows, error: fetchError } = await supabase
    .from('documents')
    .select('id, document_number, current_revision, issue_date, file_path, originator_name, originator_email, reviewed_by, reviewed_at, approved_by, approved_at')

  if (fetchError || !docRows) {
    console.error('❌  Failed to fetch documents:', fetchError?.message)
    process.exit(1)
  }

  const dbDocs = new Map<string, DbDocRow>(
    (docRows as DbDocRow[]).map(row => [row.document_number.toUpperCase(), row])
  )
  console.log(`   ${dbDocs.size} documents in database\n`)

  const { data: peopleRows, error: peopleError } = await supabase
    .from('people')
    .select('name, email, active')

  if (peopleError) {
    console.warn(`WARNING: People lookup failed: ${peopleError.message}`)
  }

  const peopleLookup = buildPeopleLookup((peopleRows || []) as PersonRow[])

  // ── Prepare output ────────────────────────────────────────────────────────────
  const runTs  = formatTimestamp()
  const outDir = path.join(process.cwd(), 'scripts', 'output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const logPath  = path.join(outDir, `migration_${runTs}.json`)
  const skipPath = path.join(outDir, `skipped_${runTs}.csv`)

  const results: RunResults = { matched: [], skipped: [], errors: [] }

  const logSkip = (docNum: string, folder: string, reason: string) => {
    results.skipped.push({ doc_number: docNum, folder, reason })
  }

  const logError = (docNum: string, file: string, error: string) => {
    results.errors.push({ doc_number: docNum, file, error })
  }

  // ── Walk document folders ─────────────────────────────────────────────────────
  const processedDocNumbers = new Set<string>()

  for (const section of SCAN_SECTIONS) {
    if (!fs.existsSync(section.root)) {
      console.warn(`⚠  Section folder not found, skipping: ${section.root}`)
      continue
    }

    console.log(`\n📂  Scanning ${section.name} (${path.basename(section.root)})...`)

    // Build list of document folders recursively. Asset-specific and some
    // department documents are nested more deeply than the original import
    // expected, so this intentionally does not assume a fixed depth.
    const docFolders = collectDocumentFolders(section.root)


    for (const docFolder of docFolders) {
      const folderName = path.basename(docFolder)

      // ── Extract document number ─────────────────────────────────────────────
      const docNum = extractDocNumber(folderName)
      if (!docNum) {
        logSkip('UNKNOWN', docFolder, 'Could not extract document number from folder name')
        continue
      }

      // ── Single-doc filter ───────────────────────────────────────────────────
      if (docFilter && docNum !== docFilter) continue

      if (processedDocNumbers.has(docNum)) {
        logSkip(docNum, docFolder, 'Duplicate document folder for same document number; skipped to avoid overwriting an earlier match')
        continue
      }
      processedDocNumbers.add(docNum)

      // ── Match to DB ─────────────────────────────────────────────────────────
      const dbRow = dbDocs.get(docNum)
      if (!dbRow) {
        logSkip(docNum, docFolder, 'No matching record found in database')
        continue
      }

      const docId = dbRow.id
      const reviewApprovalEvidence = collectReviewApprovalEvidence(docFolder)

      // ── Current version files ───────────────────────────────────────────────
      const currentDir = findCurrentFolder(docFolder) || docFolder
      const currentFiles = listCurrentFiles(currentDir)

      if (currentFiles.length === 0) {
        logSkip(docNum, docFolder, 'Current Version/Revision folder is empty or missing')
        continue
      }

      // PDF preferred, then DOCX, then anything
      const primaryFile    = [...currentFiles].sort((a, b) => filePriority(a) - filePriority(b))[0]
      const storageCurrent = `${docId}/current/${path.basename(primaryFile)}`

      // ── Upload current version ──────────────────────────────────────────────
      const uploadOk = await uploadFile(supabase, primaryFile, storageCurrent, dryRun)
      if (!uploadOk) {
        logError(docNum, primaryFile, 'Current version upload failed')
        console.log(`  ❌  ${docNum} — current version upload failed`)
        continue
      }

      // ── Extract metadata ────────────────────────────────────────────────────
      const meta      = await extractMetadata(currentFiles)
      const metaFields = buildDocumentMetadataPayload(dbRow, meta, peopleLookup.names, peopleLookup.emails)

      // ── Update documents table ──────────────────────────────────────────────
      const updatePayload: Record<string, unknown> = {
        file_name:   path.basename(primaryFile),
        file_path:   storageCurrent,
        file_size:   fs.statSync(primaryFile).size,
        uploaded_at: utcNow(),
        ...metaFields,
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('documents')
          .update(updatePayload)
          .eq('id', docId)

        if (updateError) {
          logError(docNum, primaryFile, `DB update failed: ${updateError.message}`)
        }
      }

      // ── Archive revisions ───────────────────────────────────────────────────
      const currentRevision = (dbRow.current_revision || 'A').trim().toUpperCase()
      const currentMetaWithEvidence = mergeRevisionEvidence(meta, reviewApprovalEvidence.get(currentRevision))
      const currentRevisionMeta = buildRevisionMetadataPayload(
        currentMetaWithEvidence,
        currentMetaWithEvidence.issue_date || dbRow.issue_date || fileModifiedDate(primaryFile),
        peopleLookup.names,
      )

      if (!dryRun) {
        await supabase
          .from('document_revisions')
          .update({ is_current: false })
          .eq('document_id', docId)

        const { data: existingCurrentRevision } = await supabase
          .from('document_revisions')
          .select('id')
          .eq('document_id', docId)
          .eq('revision', currentRevision)
          .limit(1)

        const currentRevisionPayload = {
          revision_notes: 'Current controlled copy imported from legacy document folder',
          file_name:   path.basename(primaryFile),
          file_path:   storageCurrent,
          file_size:   fs.statSync(primaryFile).size,
          uploaded_at: utcNow(),
          ...currentRevisionMeta,
          is_current:  true,
        }

        if (existingCurrentRevision && existingCurrentRevision.length > 0) {
          await supabase
            .from('document_revisions')
            .update(currentRevisionPayload)
            .eq('id', existingCurrentRevision[0].id)
        } else {
          await supabase.from('document_revisions').insert({
            document_id: docId,
            revision: currentRevision,
            ...currentRevisionPayload,
          })
        }
      }

      const archiveDir  = path.join(docFolder, 'Archive')
      const revisions   = listArchiveRevisions(archiveDir)
      let revCount      = 0
      let revErrors     = 0

      for (const { label, files } of revisions) {
        const revPrimary  = [...files].sort((a, b) => filePriority(a) - filePriority(b))[0]
        const storageRev  = `${docId}/archive/${label}/${path.basename(revPrimary)}`
        const revMeta = mergeRevisionEvidence(await extractMetadata(files), reviewApprovalEvidence.get(label))
        const revisionMetadataPayload = buildRevisionMetadataPayload(revMeta, fileModifiedDate(revPrimary), peopleLookup.names)

        const revOk = await uploadFile(supabase, revPrimary, storageRev, dryRun)
        if (!revOk) {
          logError(docNum, revPrimary, `Archive Rev ${label} upload failed`)
          revErrors++
          continue
        }

        if (!dryRun) {
          // Only insert if this revision doesn't already exist
          const { data: existing } = await supabase
            .from('document_revisions')
            .select('id')
            .eq('document_id', docId)
            .eq('revision', label)

          const revisionPayload = {
            file_name:   path.basename(revPrimary),
            file_path:   storageRev,
            file_size:   fs.statSync(revPrimary).size,
            uploaded_at: utcNow(),
            ...revisionMetadataPayload,
            is_current:  false,
          }

          if (!existing || existing.length === 0) {
            await supabase.from('document_revisions').insert({
              document_id: docId,
              revision:    label,
              revision_notes: 'Historic revision imported from legacy archive',
              ...revisionPayload,
            })
          } else {
            await supabase
              .from('document_revisions')
              .update(revisionPayload)
              .eq('id', existing[0].id)
          }
        }

        revCount++
      }

      // ── Record result ───────────────────────────────────────────────────────
      results.matched.push({
        doc_number:        docNum,
        primary_file:      path.basename(primaryFile),
        all_current_files: currentFiles.map(f => path.basename(f)),
        storage_path:      storageCurrent,
        revisions_added:   revCount,
        revision_errors:   revErrors,
        meta_extracted:    Object.keys(meta).length > 0,
        meta_fields:       metaFields,
      })

      const statusParts = [`${revCount} archive rev(s)`]
      if (revErrors) statusParts.push(`${revErrors} rev error(s)`)
      const metaStr = Object.keys(metaFields).length
        ? `✔ ${Object.keys(metaFields).join(', ')}`
        : '–'
      statusParts.push(`meta: ${metaStr}`)

      const icon = dryRun ? '🔍' : '✅'
      console.log(
        `  ${icon}  ${docNum.padEnd(28)}  ${path.basename(primaryFile).padEnd(55)}  ${statusParts.join(' | ')}`
      )
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70))
  console.log(`  ${dryRun ? 'DRY RUN — ' : ''}Migration complete`)
  console.log(`  ✅  Matched & processed : ${results.matched.length}`)
  console.log(`  ⏭   Skipped             : ${results.skipped.length}`)
  console.log(`  ❌  Errors              : ${results.errors.length}`)
  console.log('='.repeat(70))

  // ── Write logs ────────────────────────────────────────────────────────────────
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8')

  const csvLines = [
    'doc_number,folder,reason',
    ...results.skipped.map(s =>
      `"${s.doc_number}","${s.folder.replace(/"/g, '""')}","${s.reason}"`
    ),
  ]
  fs.writeFileSync(skipPath, csvLines.join('\r\n'), 'utf-8')

  console.log(`\n  📄  Full log    → ${logPath}`)
  console.log(`  📄  Skipped CSV → ${skipPath}\n`)

  if (results.skipped.length > 0) {
    console.log('  Skipped documents (review in Excel — add to DB or match Z drive folders):')
    for (const s of results.skipped) {
      console.log(`    ${s.doc_number.padEnd(28)}  ${s.reason}`)
    }
    console.log()
  }
}

main().catch(err => {
  console.error('❌  Unhandled error:', err)
  process.exit(1)
})
