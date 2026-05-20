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

const missingDocumentRows = [
  'ENS-AST-PRO-012 Electrical Testing Procedure',
  'ENS-AST-FRM-016 Electrical Bulkhead Test Records',
  'ENS-AST-FRM-017 Electrical Harness Test Records',
  'ENS-AST-FRM-018 Umbilicol Inspection and Test',
  'ENS-AST-FRM-019 Transformer Inspection Test Results',
  'ENS-AST-FRM-020 Motor Inspection Test Results',
  'ENS-AST-MI-001 Electrical Harness and Bulkhead Testing Instruction',
  'ENS-AST-MI-002 Transformer Inspection and Testing',
  'E11-AST-LIS-001 ENS1100 Asset Documentation List',
  'E11-AST-LIS-002 ENS1100 Equipment List',
  'E11-AST-LIS-003 ENS1100 Pre-Post Dive Checklist',
  'E11-AST-LOG-001 ENS1100 Dive Log',
  'E11-AST-PLA-011 ENS1100 Emergency Intervention Trial Task Plan - Jetting',
  'E11-AST-PLA-012 ENS1100 Emergency Intervention Trial Task Plan - Cutting',
  'E11-AST-SPC-001 ENS1100 Asset Specification',
  'RG-AST-SPC-001 Rock Grab Specification',
  'ENS-HSEQ-FRM-063 Project Management Review',
  'ENS-HSEQ-FRM-090 Weekly Project Inspection Report',
  'ENS-HSEQ-LOG-002 Project MOC Log',
  'ENS-HSEQ-TEM-001 Inspection Test Plan Template',
  'ENS-PROC-FRM-008 Terms of Reference',
]

const departmentByCode: Record<string, string> = {
  AST: 'Assets',
  COM: 'Commercial',
  CRW: 'Crewing',
  ENG: 'Engineering',
  FIN: 'Finance',
  HR: 'Human Resources',
  HSEQ: 'HSEQ',
  LOGI: 'Logistics',
  MAR: 'Marketing',
  OPS: 'Operations',
  PROC: 'Procurement',
  PROJ: 'Project',
  SUR: 'Survey',
}

const documentTypeByCode: Record<string, string> = {
  FRM: 'Form',
  LIS: 'List',
  LOG: 'Log',
  MI: 'Instruction',
  PLA: 'Plan',
  POL: 'Policy',
  PRE: 'Presentation',
  PRO: 'Procedure',
  SPC: 'Specification',
  TEM: 'Template',
}

function parseDocumentDescriptor(descriptor: string) {
  const match = descriptor.match(/^([A-Z0-9]+)-([A-Z]+)-([A-Z]+)-(\d+)\s+(.+)$/)
  if (!match) throw new Error(`Could not parse document descriptor: ${descriptor}`)
  const [, prefix, moduleCode, typeCode, sequence, title] = match
  const documentNumber = `${prefix}-${moduleCode}-${typeCode}-${sequence}`

  return {
    document_number: documentNumber,
    title,
    document_type: documentTypeByCode[typeCode] || typeCode,
    department_owner: departmentByCode[moduleCode] || moduleCode,
    status: 'Live',
    review_approval_status: 'Approved',
    current_revision: 'A',
    current_issue: 'A',
    review_cycle_years: 3,
    document_scope: 'Company/System',
  }
}

async function main() {
  const { data: ens1100 } = await supabase
    .from('assets')
    .select('id, name, asset_code, document_id_code')
    .eq('name', 'ENS1100')
    .single()

  const { data: existingRows, error: existingError } = await supabase
    .from('documents')
    .select('document_number')

  if (existingError) throw existingError

  const existingNumbers = new Set((existingRows || []).map(row => row.document_number))

  const rowsToInsert = missingDocumentRows
    .map(parseDocumentDescriptor)
    .filter(row => !existingNumbers.has(row.document_number))
    .map(row => {
      if (row.document_number.startsWith('E11-')) {
        return {
          ...row,
          document_scope: 'Asset',
          asset_id: ens1100?.id || null,
          asset_name: ens1100?.name || 'ENS1100',
          asset_code: ens1100?.asset_code || null,
          asset_document_id_code: ens1100?.document_id_code || '1100',
        }
      }

      if (row.document_number.startsWith('RG-')) {
        return {
          ...row,
          document_scope: 'Asset',
          asset_name: 'Rock Grab',
          asset_document_id_code: 'RG',
        }
      }

      return row
    })

  let inserted: string[] = []
  if (rowsToInsert.length > 0) {
    const { data, error } = await supabase
      .from('documents')
      .insert(rowsToInsert)
      .select('document_number')

    if (error) throw error
    inserted = (data || []).map(row => row.document_number)
  }

  const { data: updatedE11, error: updateError } = await supabase
    .from('documents')
    .update({
      document_scope: 'Asset',
      asset_id: ens1100?.id || null,
      asset_name: ens1100?.name || 'ENS1100',
      asset_code: ens1100?.asset_code || null,
      asset_document_id_code: ens1100?.document_id_code || '1100',
    })
    .like('document_number', 'E11-%')
    .select('document_number')

  if (updateError) throw updateError

  console.log(JSON.stringify({
    insertedCount: inserted.length,
    inserted,
    updatedE11Scope: updatedE11?.length || 0,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
