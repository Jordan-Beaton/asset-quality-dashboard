import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import {
  buildDigestEmail,
  bulkReviewUrl,
  createBatch,
  sendHtmlEmail,
  todayIsoDate,
  updateCurrentRevisionSnapshots,
  writeBulkActivity,
} from '../src/lib/documentBulkReview'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Starts a review round for the documents whose number contains a prefix (default HSEQ) and whose review date has passed.
// It sets the reviewer and approver, resets the revision date to today, puts each document into Pending Review, and emails
// the reviewer one link that fast-tracks the whole group. The approver is emailed automatically once the review is accepted.
//
//   npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"esModuleInterop\":true}" scripts/start_hseq_bulk_review.ts            (dry run)
//   ... scripts/start_hseq_bulk_review.ts --execute --origin=https://your-site   (--prefix=XXX changes the prefix, --no-email only prints the link)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase environment variables')
const supabase = createClient(supabaseUrl, serviceKey)

const REVIEWER_NAME = 'Jordan Beaton'
const APPROVER_NAME = 'Louise Harvey'

function argValue(name: string) {
  const hit = process.argv.find(arg => arg.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : ''
}

async function personEmail(name: string) {
  const { data, error } = await supabase.from('people').select('name, email, active').eq('name', name).eq('active', true)
  if (error) throw new Error(`people lookup failed: ${error.message}`)
  if (!data || data.length !== 1 || !data[0].email) throw new Error(`Expected exactly one active person called ${name} with an email, found ${data?.length ?? 0}`)
  return data[0].email as string
}

async function main() {
  const execute = process.argv.includes('--execute')
  const prefix = argValue('prefix') || 'HSEQ'
  const origin = argValue('origin').replace(/\/+$/, '')
  const noEmail = process.argv.includes('--no-email')
  const today = todayIsoDate()

  if (execute && !noEmail && !/^https:\/\//.test(origin)) throw new Error('--origin=https://<production site> is required with --execute, so the emailed link opens the live site.')
  if (execute && noEmail && !origin) throw new Error('--origin is still required with --no-email, so the link can be printed.')

  const reviewerEmail = await personEmail(REVIEWER_NAME)
  const approverEmail = await personEmail(APPROVER_NAME)

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .ilike('document_number', `%${prefix}%`)
    .lt('next_review_date', today)
    .order('document_number')
  if (error) throw new Error(`documents fetch failed: ${error.message}`)

  const all = data || []
  const skipped = all.filter(doc => ['Archived', 'Superseded', 'Draft'].includes(doc.status) || doc.workflow_status !== 'Approved')
  const documents = all.filter(doc => !skipped.includes(doc))

  console.log(`${all.length} ${prefix} documents are past their review date (today ${today}).`)
  for (const doc of skipped) console.log(`  SKIPPED ${doc.document_number} (${doc.status} / ${doc.workflow_status})`)
  console.log(`${documents.length} will go into the review round, reviewer ${REVIEWER_NAME}, approver ${APPROVER_NAME}:`)
  for (const doc of documents) {
    console.log(`  ${doc.document_number} rev ${doc.current_revision} | was reviewer ${doc.workflow_reviewer_name || '-'} / approver ${doc.workflow_approver_name || '-'} | issue ${doc.issue_date} -> ${today}`)
  }

  if (!execute) {
    console.log('\nDry run only. Nothing was changed. Add --execute --origin=<site url> to run it.')
    return
  }

  const ids = documents.map(doc => doc.id)
  const { data: revisionRows, error: revisionError } = await supabase.from('document_revisions').select('*').in('document_id', ids).eq('is_current', true)
  if (revisionError) throw new Error(`revision fetch failed: ${revisionError.message}`)

  const backupDir = path.join(process.cwd(), 'tmp')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupFile = path.join(backupDir, `bulk-review-backup-${prefix}-${today}.json`)
  fs.writeFileSync(backupFile, JSON.stringify({ takenAt: new Date().toISOString(), documents, currentRevisions: revisionRows }, null, 2))
  console.log(`\nBackup of the rows before any change: ${backupFile}`)

  const { error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'Under Review',
      review_approval_status: 'Pending Review',
      workflow_status: 'Pending Review',
      workflow_reviewer_name: REVIEWER_NAME,
      workflow_reviewer_email: reviewerEmail,
      workflow_approver_name: APPROVER_NAME,
      workflow_approver_email: approverEmail,
      reviewed_by: null,
      reviewed_at: null,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      issue_date: today,
    })
    .in('id', ids)
    .eq('workflow_status', 'Approved')
  if (updateError) throw new Error(`document update failed: ${updateError.message}`)

  const snapshotError = await updateCurrentRevisionSnapshots(supabase, documents, {
    issue_date: today,
    reviewed_by: null,
    reviewed_at: null,
    approved_by: null,
    approved_at: null,
  })
  if (snapshotError) throw new Error(`revision snapshot update failed: ${snapshotError}`)

  const byId = new Map(documents.map(doc => [doc.id, doc]))
  const activityError = await writeBulkActivity(supabase, documents, {
    action: 'sent_to_reviewer',
    fromStatus: 'Approved',
    toStatus: 'Pending Review',
    actorName: REVIEWER_NAME,
    actorEmail: reviewerEmail,
    note: doc => {
      const before = byId.get(doc.id)
      return `Overdue review, bulk review round. Reviewer: ${REVIEWER_NAME}. Approver: ${APPROVER_NAME}. Before this: reviewer ${before?.workflow_reviewer_name || 'not set'}, approver ${before?.workflow_approver_name || 'not set'}, issue date ${before?.issue_date || 'not set'}, review due ${before?.next_review_date || 'not set'}.`
    },
  })
  if (activityError) throw new Error(`activity log failed: ${activityError}`)

  const created = await createBatch(supabase, {
    kind: 'review',
    intendedName: REVIEWER_NAME,
    intendedEmail: reviewerEmail,
    documentIds: ids,
    createdBy: REVIEWER_NAME,
  })
  if (!created.batch) throw new Error(created.error)

  const url = bulkReviewUrl(origin, created.batch.token)
  const email = buildDigestEmail({ kind: 'review', name: REVIEWER_NAME, documents, url, reason: 'their review date has passed' })
  if (noEmail) {
    console.log(`\n--no-email: nothing was emailed. The review link is ${url}`)
  } else {
    const emailError = await sendHtmlEmail({ to: [reviewerEmail], subject: email.subject, html: email.html })
    if (emailError) throw new Error(`The documents were updated but the email failed: ${emailError}`)
  }

  await supabase.from('ims_notifications').insert({
    recipient_email: reviewerEmail.toLowerCase(),
    source_module: 'Document Control',
    title: `${documents.length} documents to review`,
    body: 'Overdue review round',
    link: `/documents/bulk-review?token=${encodeURIComponent(created.batch.token)}`,
  })

  console.log(`\nDone. ${documents.length} documents are Pending Review${noEmail ? '.' : ` and the email has been sent to ${reviewerEmail}.`}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
