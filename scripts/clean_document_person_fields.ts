import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceKey)

type DocumentRow = {
  id: string
  document_number: string
  originator_name: string | null
  originator_email: string | null
  reviewed_by: string | null
  approved_by: string | null
}

type RevisionRow = {
  id: string
  document_id: string
  revision: string | null
  reviewed_by: string | null
  approved_by: string | null
}

type CleanSummary = {
  documentRowsUpdated: number
  documentFieldsCleared: number
  revisionRowsUpdated: number
  revisionFieldsCleared: number
  documentExamples: Array<{ document_number: string; fields: string[] }>
  revisionExamples: Array<{ document_id: string; revision: string | null; fields: string[] }>
}

function normaliseName(value: string | null | undefined) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to)

    if (error) throw new Error(`${table} fetch failed: ${error.message}`)
    if (!data || data.length === 0) break

    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }

  return rows
}

function shouldClearPersonField(value: string | null | undefined, peopleNames: Set<string>) {
  const key = normaliseName(value)
  return Boolean(key) && !peopleNames.has(key)
}

async function main() {
  const people = await fetchAll<{ name: string | null }>('people', 'name')
  const peopleNames = new Set(
    people
      .map(person => normaliseName(person.name))
      .filter(Boolean),
  )

  if (peopleNames.size === 0) {
    throw new Error('People Management lookup is empty; aborting cleanup')
  }

  const summary: CleanSummary = {
    documentRowsUpdated: 0,
    documentFieldsCleared: 0,
    revisionRowsUpdated: 0,
    revisionFieldsCleared: 0,
    documentExamples: [],
    revisionExamples: [],
  }

  const documents = await fetchAll<DocumentRow>(
    'documents',
    'id, document_number, originator_name, originator_email, reviewed_by, approved_by',
  )

  for (const document of documents) {
    const patch: Partial<DocumentRow> = {}
    const clearedFields: string[] = []

    if (shouldClearPersonField(document.originator_name, peopleNames)) {
      patch.originator_name = null
      patch.originator_email = null
      clearedFields.push('originator_name')
    }

    if (shouldClearPersonField(document.reviewed_by, peopleNames)) {
      patch.reviewed_by = null
      clearedFields.push('reviewed_by')
    }

    if (shouldClearPersonField(document.approved_by, peopleNames)) {
      patch.approved_by = null
      clearedFields.push('approved_by')
    }

    if (clearedFields.length === 0) continue

    const { error } = await supabase
      .from('documents')
      .update(patch)
      .eq('id', document.id)

    if (error) {
      throw new Error(`Document cleanup failed for ${document.document_number}: ${error.message}`)
    }

    summary.documentRowsUpdated += 1
    summary.documentFieldsCleared += clearedFields.length
    if (summary.documentExamples.length < 10) {
      summary.documentExamples.push({ document_number: document.document_number, fields: clearedFields })
    }
  }

  const revisions = await fetchAll<RevisionRow>(
    'document_revisions',
    'id, document_id, revision, reviewed_by, approved_by',
  )

  for (const revision of revisions) {
    const patch: Partial<RevisionRow> = {}
    const clearedFields: string[] = []

    if (shouldClearPersonField(revision.reviewed_by, peopleNames)) {
      patch.reviewed_by = null
      clearedFields.push('reviewed_by')
    }

    if (shouldClearPersonField(revision.approved_by, peopleNames)) {
      patch.approved_by = null
      clearedFields.push('approved_by')
    }

    if (clearedFields.length === 0) continue

    const { error } = await supabase
      .from('document_revisions')
      .update(patch)
      .eq('id', revision.id)

    if (error) {
      throw new Error(`Revision cleanup failed for ${revision.document_id} ${revision.revision || ''}: ${error.message}`)
    }

    summary.revisionRowsUpdated += 1
    summary.revisionFieldsCleared += clearedFields.length
    if (summary.revisionExamples.length < 10) {
      summary.revisionExamples.push({
        document_id: revision.document_id,
        revision: revision.revision,
        fields: clearedFields,
      })
    }
  }

  const remainingDocuments = (await fetchAll<DocumentRow>(
    'documents',
    'id, document_number, originator_name, originator_email, reviewed_by, approved_by',
  )).filter(document => {
    return (
      shouldClearPersonField(document.originator_name, peopleNames) ||
      shouldClearPersonField(document.reviewed_by, peopleNames) ||
      shouldClearPersonField(document.approved_by, peopleNames)
    )
  })

  const remainingRevisions = (await fetchAll<RevisionRow>(
    'document_revisions',
    'id, document_id, revision, reviewed_by, approved_by',
  )).filter(revision => {
    return (
      shouldClearPersonField(revision.reviewed_by, peopleNames) ||
      shouldClearPersonField(revision.approved_by, peopleNames)
    )
  })

  console.log(JSON.stringify({
    ...summary,
    remainingDocumentRowsWithNonPeopleNames: remainingDocuments.length,
    remainingRevisionRowsWithNonPeopleNames: remainingRevisions.length,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
