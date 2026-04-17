import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

type ImportRow = {
  document_number: string
  title: string
  document_type?: string | null
  department?: string | null
  revision?: string | null
  review_cycle?: number | null
  issue_date?: string | null
  next_review_date?: string | null
  status?: string | null
  comments?: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const jsonPath = path.join(process.cwd(), 'scripts', 'documents.json')

function normaliseText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length ? text : null
}

function normaliseRevision(value: unknown): string {
  const text = normaliseText(value)
  if (!text) return 'A'

  const lettersOnly = text.replace(/[^a-z]/gi, '').toUpperCase()
  if (!lettersOnly) return 'A'

  return lettersOnly.charAt(0)
}

function normaliseReviewCycle(value: unknown): number {
  const num = Number(value)
  if ([1, 2, 3].includes(num)) return num
  return 3
}

function normaliseStatus(value: unknown): string {
  const text = (normaliseText(value) || 'Live').toUpperCase()

  if (text === 'LIVE') return 'Live'
  if (text === 'DRAFT') return 'Draft'
  if (text === 'VOID') return 'Void'
  if (text === 'ARCHIVED') return 'Archived'
  if (text === 'PROPOSED') return 'Proposed'
  if (text === 'NOT DRAFTED') return 'Not drafted'

  return normaliseText(value) || 'Live'
}

function normaliseDate(value: unknown): string | null {
  const text = normaliseText(value)
  if (!text) return null

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

async function runImport() {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`documents.json not found at: ${jsonPath}`)
  }

  const fileContents = fs.readFileSync(jsonPath, 'utf-8')
  const rows = JSON.parse(fileContents) as ImportRow[]

  console.log(`Starting import for ${rows.length} document(s)...`)

  for (const row of rows) {
    try {
      const documentNumber = normaliseText(row.document_number)
      const title = normaliseText(row.title)

      if (!documentNumber || !title) {
        console.error('Skipped row because document_number or title is missing:', row)
        continue
      }

      const revision = normaliseRevision(row.revision)
      const reviewCycle = normaliseReviewCycle(row.review_cycle)
      const issueDate = normaliseDate(row.issue_date)
      const nextReviewDate = normaliseDate(row.next_review_date)
      const status = normaliseStatus(row.status)

      const { data: existingDocument, error: existingError } = await supabase
        .from('documents')
        .select('id, document_number')
        .eq('document_number', documentNumber)
        .maybeSingle()

      if (existingError) {
        console.error(`Lookup error for ${documentNumber}:`, existingError)
        continue
      }

      if (existingDocument) {
        console.log(`Skipped existing document: ${documentNumber}`)
        continue
      }

      const { data: insertedDocument, error: insertDocumentError } = await supabase
        .from('documents')
        .insert({
          document_number: documentNumber,
          title,
          document_type: normaliseText(row.document_type),
          department_owner: normaliseText(row.department),
          status,
          current_revision: revision,
          current_issue: revision,
          issue_date: issueDate,
          review_cycle_years: reviewCycle,
          next_review_date: nextReviewDate,
          comments: normaliseText(row.comments),
          review_approval_status: 'Draft',
          reviewed_by: null,
          reviewed_at: null,
          approved_by: null,
          approved_at: null
        })
        .select('id, document_number')
        .single()

      if (insertDocumentError || !insertedDocument) {
        console.error(`Insert error for ${documentNumber}:`, insertDocumentError)
        continue
      }

      const { error: insertRevisionError } = await supabase
        .from('document_revisions')
        .insert({
          document_id: insertedDocument.id,
          revision,
          revision_notes: 'Initial import from legacy document register',
          issue_date: issueDate,
          reviewed_by: null,
          reviewed_at: null,
          approved_by: null,
          approved_at: null,
          is_current: true
        })

      if (insertRevisionError) {
        console.error(`Revision insert error for ${documentNumber}:`, insertRevisionError)
        continue
      }

      console.log(`Imported: ${documentNumber}`)
    } catch (error) {
      console.error('Unexpected import error:', error)
    }
  }

  console.log('Import complete')
}

runImport().catch((error) => {
  console.error('Fatal import error:', error)
  process.exit(1)
})