// Shared helpers for an action's source and its link to an audit record.
// These copy the rules used on the main Actions page (app/actions/page.tsx) so the Quality Actions page shows an
// action the same way: a stored "Audit" source with no finding stays "Audit", and the audit link is found from the
// stored audit id or number, or from the linked finding when only that is stored.

export type AuditLookup = {
  auditOptions: Array<{ id: string; audit_number: string }>;
  findingOptions: Array<{ id: string; audit_id: string; reference: string }>;
};

export type AuditRefFields = {
  linked_audit_id?: string | null;
  linked_audit_number?: string | null;
  linked_finding_id?: string | null;
  linked_finding_reference?: string | null;
};

export type ActionSourceFields = AuditRefFields & { source?: string | null };

/** The source shown for an action. The stored value is not changed. */
export function getActionSourceValue(action: ActionSourceFields) {
  const source = (action.source || "").trim();
  if (!source) return "Manual";
  if (source === "Audit") {
    return action.linked_finding_id || action.linked_finding_reference ? "Audit Finding" : "Audit";
  }
  return source;
}

export function isAuditLinkedSource(source: string | null | undefined) {
  return source === "Audit Finding" || source === "Audit";
}

/**
 * The audit an action belongs to. Uses the stored audit id or number first; when only a finding is stored, the audit is
 * taken from that finding (by id, or by reference when exactly one finding has it). Returns null when the action carries
 * no audit reference at all.
 */
export function resolveActionAudit(action: AuditRefFields, lookup?: AuditLookup): { id: string; number: string } | null {
  let id = (action.linked_audit_id || "").trim();
  let number = (action.linked_audit_number || "").trim();
  if (lookup) {
    if (!id && number) id = lookup.auditOptions.find((option) => option.audit_number === number)?.id || "";
    if (!id && !number) {
      const findingId = (action.linked_finding_id || "").trim();
      const findingRef = (action.linked_finding_reference || "").trim();
      const matches = findingId
        ? lookup.findingOptions.filter((finding) => finding.id === findingId)
        : findingRef
        ? lookup.findingOptions.filter((finding) => finding.reference === findingRef)
        : [];
      if (matches.length === 1) id = matches[0].audit_id;
    }
    if (id && !number) number = lookup.auditOptions.find((option) => option.id === id)?.audit_number || "";
  }
  return id || number ? { id, number } : null;
}

/** Opens the Audits programme tab on that audit (the audit page keeps the open audit in ?selected=). */
export function auditRecordHref(ref: { id: string; number: string } | null) {
  if (!ref) return null;
  if (ref.id) return `/audits?tab=programme&selected=${encodeURIComponent(ref.id)}`;
  return `/audits?search=${encodeURIComponent(ref.number)}`;
}
