import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

type StagedAuditRow = {
  audit_number: string
  title: string | null
  audit_type: string | null
  auditee: string | null
  lead_auditor: string | null
  audit_date: string | null
  audit_month: string | null
  status: string | null
  standards: string[]
  procedure_reference: string | null
  certification_body: string | null
  location: string | null
  linked_ncrs: string[]
  linked_actions: string[]
  source_row_number?: number
}

type StagedFindingRow = {
  audit_reference: string
  reference: string
  clause: string | null
  category: string | null
  description: string | null
  owner: string | null
  status: string | null
  due_date: string | null
  closure_date: string | null
  root_cause: string | null
  containment_action: string | null
  corrective_action: string | null
  source_row_number?: number
}

type ImportRowsFile = {
  audits: StagedAuditRow[]
  audit_findings: StagedFindingRow[]
}

type AuditRecord = {
  id: string
  audit_number: string | null
}

type FindingRecord = {
  id: string
  audit_id: string
  reference: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const importRowsPath = path.join(
  process.cwd(),
  'scripts',
  'output',
  'audit-import-2026',
  'import_rows_2026.json'
)

const auditDateOverrides: Record<string, string> = {
  'EXT-26-001': '2026-01-30',
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function uniqueValues(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))]
}

function normaliseText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length ? text : null
}

function normaliseAuditDate(auditNumber: string, value: string | null) {
  return auditDateOverrides[auditNumber] || value || null
}

async function fetchExistingAuditsByNumber(auditNumbers: string[]) {
  const results: AuditRecord[] = []

  for (const chunk of chunkArray(auditNumbers, 200)) {
    const { data, error } = await supabase
      .from('audits')
      .select('id,audit_number')
      .in('audit_number', chunk)

    if (error) {
      throw new Error(`Audit lookup failed: ${error.message}`)
    }

    results.push(...(((data || []) as AuditRecord[])))
  }

  return results
}

async function fetchExistingFindings(auditIds: string[]) {
  const results: FindingRecord[] = []

  for (const chunk of chunkArray(auditIds, 200)) {
    const { data, error } = await supabase
      .from('audit_findings')
      .select('id,audit_id,reference')
      .in('audit_id', chunk)

    if (error) {
      throw new Error(`Finding lookup failed: ${error.message}`)
    }

    results.push(...(((data || []) as FindingRecord[])))
  }

  return results
}

async function insertAudits(rows: StagedAuditRow[]) {
  const inserted: AuditRecord[] = []

  for (const chunk of chunkArray(rows, 100)) {
    const payload = chunk.map((row) => ({
      audit_number: row.audit_number,
      title: normaliseText(row.title),
      audit_type: normaliseText(row.audit_type),
      auditee: normaliseText(row.auditee),
      lead_auditor: normaliseText(row.lead_auditor),
      audit_date: normaliseAuditDate(row.audit_number, row.audit_date),
      audit_month: normaliseText(row.audit_month),
      status: normaliseText(row.status),
      standards: Array.isArray(row.standards) ? row.standards.filter(Boolean) : [],
      procedure_reference: normaliseText(row.procedure_reference),
      certification_body: normaliseText(row.certification_body),
      location: normaliseText(row.location),
      linked_ncrs: Array.isArray(row.linked_ncrs) ? row.linked_ncrs : [],
      linked_actions: Array.isArray(row.linked_actions) ? row.linked_actions : [],
    }))

    const { data, error } = await supabase
      .from('audits')
      .insert(payload)
      .select('id,audit_number')

    if (error) {
      throw new Error(`Audit insert failed: ${error.message}`)
    }

    inserted.push(...(((data || []) as AuditRecord[])))
  }

  return inserted
}

async function updateAudits(rows: StagedAuditRow[]) {
  let updatedCount = 0

  for (const row of rows) {
    const auditDate = normaliseAuditDate(row.audit_number, row.audit_date)
    const payload = {
      title: normaliseText(row.title),
      audit_type: normaliseText(row.audit_type),
      auditee: normaliseText(row.auditee),
      lead_auditor: normaliseText(row.lead_auditor),
      audit_date: auditDate,
      audit_month: normaliseText(row.audit_month),
      status: normaliseText(row.status),
      standards: Array.isArray(row.standards) ? row.standards.filter(Boolean) : [],
      procedure_reference: normaliseText(row.procedure_reference),
      certification_body: normaliseText(row.certification_body),
      location: normaliseText(row.location),
      linked_ncrs: Array.isArray(row.linked_ncrs) ? row.linked_ncrs : [],
      linked_actions: Array.isArray(row.linked_actions) ? row.linked_actions : [],
    }

    const { error } = await supabase
      .from('audits')
      .update(payload)
      .eq('audit_number', row.audit_number)

    if (error) {
      throw new Error(`Audit update failed for ${row.audit_number}: ${error.message}`)
    }

    updatedCount += 1
  }

  return updatedCount
}

async function insertFindings(rows: StagedFindingRow[], auditIdByNumber: Map<string, string>) {
  let insertedCount = 0

  for (const chunk of chunkArray(rows, 100)) {
    const payload = chunk.map((row) => {
      const auditId = auditIdByNumber.get(row.audit_reference)
      if (!auditId) {
        throw new Error(`Missing audit_id for finding ${row.reference} (${row.audit_reference})`)
      }

      return {
        audit_id: auditId,
        reference: row.reference,
        clause: normaliseText(row.clause),
        category: normaliseText(row.category),
        description: normaliseText(row.description),
        owner: normaliseText(row.owner),
        status: normaliseText(row.status),
        due_date: row.due_date || null,
        closure_date: row.closure_date || null,
        root_cause: normaliseText(row.root_cause),
        containment_action: normaliseText(row.containment_action),
        corrective_action: normaliseText(row.corrective_action),
      }
    })

    const { data, error } = await supabase
      .from('audit_findings')
      .insert(payload)
      .select('id')

    if (error) {
      throw new Error(`Finding insert failed: ${error.message}`)
    }

    insertedCount += (data || []).length
  }

  return insertedCount
}

async function runImport() {
  if (!fs.existsSync(importRowsPath)) {
    throw new Error(`import_rows_2026.json not found at: ${importRowsPath}`)
  }

  const dryRun = process.argv.includes('--dry-run')
  const fileContents = fs.readFileSync(importRowsPath, 'utf-8')
  const importRows = JSON.parse(fileContents) as ImportRowsFile

  const stagedAudits = importRows.audits || []
  const stagedFindings = importRows.audit_findings || []

  console.log(`Starting 2026 audit import${dryRun ? ' (dry run)' : ''}...`)
  console.log(`Staged audits: ${stagedAudits.length}`)
  console.log(`Staged findings: ${stagedFindings.length}`)

  const auditNumbers = uniqueValues(stagedAudits.map((row) => row.audit_number))
  const existingAudits = await fetchExistingAuditsByNumber(auditNumbers)
  const auditIdByNumber = new Map<string, string>()

  existingAudits.forEach((audit) => {
    if (audit.audit_number) {
      auditIdByNumber.set(audit.audit_number, audit.id)
    }
  })

  const auditsToInsert = stagedAudits.filter((row) => !auditIdByNumber.has(row.audit_number))
  const auditsToUpdate = stagedAudits.filter((row) => auditIdByNumber.has(row.audit_number))

  let insertedAudits = 0
  let updatedAudits = 0

  if (dryRun) {
    console.log(`Dry run: would insert ${auditsToInsert.length} audit(s).`)
    console.log(`Dry run: would update ${auditsToUpdate.length} audit(s).`)
    auditsToInsert.forEach((row) => {
      auditIdByNumber.set(row.audit_number, `dry-run:${row.audit_number}`)
    })
  } else {
    if (auditsToInsert.length > 0) {
      const inserted = await insertAudits(auditsToInsert)
      insertedAudits = inserted.length
      inserted.forEach((audit) => {
        if (audit.audit_number) {
          auditIdByNumber.set(audit.audit_number, audit.id)
        }
      })
    }

    if (auditsToUpdate.length > 0) {
      updatedAudits = await updateAudits(auditsToUpdate)
    }
  }

  if (!dryRun && (auditsToInsert.length > 0 || auditsToUpdate.length > 0)) {
    const refreshedAudits = await fetchExistingAuditsByNumber(auditNumbers)
    refreshedAudits.forEach((audit) => {
      if (audit.audit_number) {
        auditIdByNumber.set(audit.audit_number, audit.id)
      }
    })
  }

  const parentAuditIds = [...auditIdByNumber.values()].filter((value) => !value.startsWith('dry-run:'))
  const existingFindings = parentAuditIds.length ? await fetchExistingFindings(parentAuditIds) : []
  const existingFindingKeys = new Set(
    existingFindings
      .map((finding) =>
        finding.reference ? `${finding.audit_id}::${finding.reference.trim()}` : null
      )
      .filter((value): value is string => Boolean(value))
  )

  const findingsToInsert: StagedFindingRow[] = []
  let skippedFindings = 0

  for (const row of stagedFindings) {
    const auditId = auditIdByNumber.get(row.audit_reference)

    if (!auditId) {
      skippedFindings += 1
      console.warn(
        `Skipping finding ${row.reference}: parent audit ${row.audit_reference} does not exist in target set.`
      )
      continue
    }

    const key = `${auditId}::${row.reference}`
    if (existingFindingKeys.has(key)) {
      skippedFindings += 1
      continue
    }

    findingsToInsert.push(row)
    existingFindingKeys.add(key)
  }

  let insertedFindings = 0

  if (dryRun) {
    console.log(`Dry run: would insert ${findingsToInsert.length} finding(s).`)
  } else if (findingsToInsert.length > 0) {
    insertedFindings = await insertFindings(findingsToInsert, auditIdByNumber)
  }

  console.log('')
  console.log('Import summary')
  console.log(`Inserted audits: ${dryRun ? 0 : insertedAudits}`)
  console.log(`Updated audits: ${dryRun ? 0 : updatedAudits}`)
  console.log(`Inserted findings: ${dryRun ? 0 : insertedFindings}`)
  console.log(`Skipped findings: ${skippedFindings}`)

  if (dryRun) {
    console.log('')
    console.log(`Dry run audits to insert: ${auditsToInsert.length}`)
    console.log(`Dry run audits to update: ${auditsToUpdate.length}`)
    console.log(`Dry run findings to insert: ${findingsToInsert.length}`)
    console.log(`Dry run findings to skip: ${skippedFindings}`)
  }
}

runImport().catch((error) => {
  console.error('Fatal audit import error:', error)
  process.exit(1)
})
