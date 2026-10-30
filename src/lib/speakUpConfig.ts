// Settings for the Speak Up reporting channel. Change them here.

export const SPEAK_UP_CATEGORIES = [
  "Health and safety",
  "Environmental",
  "Quality or inspection integrity",
  "Fraud or financial",
  "Legal or regulatory breach",
  "Bullying or harassment",
  "Something else",
];

// Who may report. For now only Enshore employees: the page then does not ask. Add "Contractor" and/or
// "Supplier" to open it up; the page then asks "I am a..." and records the answer with the report.
export const SPEAK_UP_REPORTER_GROUPS = ["Employee"];

export const SPEAK_UP_REPORT_MODES = ["anonymous", "confidential", "named"] as const;
export type SpeakUpReportMode = (typeof SPEAK_UP_REPORT_MODES)[number];

export const SPEAK_UP_STATUSES = ["Received", "Acknowledged", "Investigating", "Awaiting reporter", "Outcome shared", "Closed"] as const;
export type SpeakUpStatus = (typeof SPEAK_UP_STATUSES)[number];

// Internal targets (there is no UK statutory deadline): acknowledge within 7 days, give feedback within 3 months.
export const SPEAK_UP_ACKNOWLEDGE_DAYS = 7;
export const SPEAK_UP_FEEDBACK_MONTHS = 3;

// How long a closed case is kept before it is due for deletion. To be confirmed by HR and legal.
export const SPEAK_UP_RETENTION_MONTHS = { no_action: 12, action_taken: 72 } as const;
export type SpeakUpOutcome = keyof typeof SPEAK_UP_RETENTION_MONTHS;

export const SPEAK_UP_OUTCOME_LABELS: Record<SpeakUpOutcome, string> = {
  no_action: "No further action",
  action_taken: "Action taken",
};

export const SPEAK_UP_LIMITS = {
  bodyChars: 8000,
  messageChars: 4000,
  contactChars: 300,
  evidenceFiles: 5,
  // photos are passed through the server, which has a request size limit, so they are kept small
  evidenceBytes: 4_000_000,
};

// A ceiling on new reports per hour across the whole channel, to stop flooding.
export const SPEAK_UP_GLOBAL_CASES_PER_HOUR = 60;

export const SPEAK_UP_EVIDENCE_BUCKET = "speak-up-evidence";
