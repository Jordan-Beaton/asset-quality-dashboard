import { formatBytes } from "./inspectionPack";

type PointSnapshot = { id: string; section_number: string; activity_description: string; intervention_type: string };

function e(v: string) {
  return String(v || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildInspectionEmailHtml({
  noiNumber,
  itpNumber,
  itpTitle,
  supplier,
  points,
  notes,
  files,
  packs,
  summary,
}: {
  noiNumber: string;
  itpNumber: string;
  itpTitle: string;
  supplier: string;
  points: PointSnapshot[];
  notes: string | null;
  files: Array<{ name: string; size: number | null; part?: number }>;
  packs: Array<{ label: string; url: string; size: number }>;
  summary: string;
}) {
  const pointRows = points
    .map(p => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;font-weight:700;color:#005670;white-space:nowrap;">§${e(p.section_number)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;">
          <span style="display:inline-block;background:#ECECE7;color:${p.intervention_type === "H" ? "#F93822" : "#005670"};font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;margin-right:6px;">${e(p.intervention_type)}</span>
          ${e(p.activity_description)}
        </td>
      </tr>`)
    .join("");

  const showPartColumn = packs.length > 1;
  const fileList = files
    .map(f => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;">${e(f.name)}</td>
        ${showPartColumn ? `<td style="padding:6px 12px;border-bottom:1px solid #D0D0CE;font-size:12px;color:#53565A;white-space:nowrap;">Part ${f.part || 1}</td>` : ""}
        <td style="padding:6px 12px;border-bottom:1px solid #D0D0CE;font-size:12px;color:#53565A;white-space:nowrap;text-align:right;">${e(formatBytes(f.size))}</td>
      </tr>`)
    .join("");
  const buttons = packs
    .map(pack => `
      <p style="margin:10px 0;">
        <a href="${e(pack.url)}" style="display:inline-block;background:#005670;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 20px;font-size:14px;font-weight:700;">
          ${e(pack.label)}${packs.length > 1 && pack.size ? ` (${e(formatBytes(pack.size))})` : ""}
        </a>
      </p>`)
    .join("");
  const fileRows = `
      <p style="margin:0 0 6px;font-size:13px;color:#000000;">${e(summary)}</p>
      ${buttons}
      <p style="margin:0 0 12px;font-size:11px;color:#53565A;">Links expire in 6 months.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #D0D0CE;margin-top:12px;">
        <thead><tr><th colspan="${showPartColumn ? 3 : 2}" style="padding:8px 12px;background:#ECECE7;color:#53565A;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:left;">Included in the pack</th></tr></thead>
        <tbody>${fileList}</tbody>
      </table>`;

  const notesHtml = notes
    ? `<p style="margin:0;font-size:13px;color:#000000;line-height:1.5;">${e(notes).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#000000;line-height:1.5;max-width:620px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#005670 0%,#005670 64%,#63B1BC 160%);border-radius:12px 12px 0 0;padding:22px 28px;margin-bottom:0;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:#63B1BC;text-transform:uppercase;margin-bottom:4px;">Enshore IMS · Inspection Records</div>
    <div style="font-size:20px;font-weight:700;color:#ffffff;">Inspection records available — NOI ${e(noiNumber)}</div>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;border:1px solid #D0D0CE;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;">

    <!-- Meta row -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 12px;background:#ECECE7;border-radius:8px 0 0 8px;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;width:1%;">NOI Reference</td>
        <td style="padding:8px 12px;background:#ECECE7;border-radius:0 8px 8px 0;font-size:14px;font-weight:700;color:#005670;">NOI-${e(noiNumber)}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #D0D0CE;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;white-space:nowrap;width:30%;">ITP Reference</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;font-weight:700;">${e(itpNumber)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;">ITP Title</td>
        <td style="padding:8px 12px;border-bottom:1px solid #D0D0CE;font-size:13px;">${e(itpTitle)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;background:#ECECE7;">Supplier</td>
        <td style="padding:8px 12px;font-size:13px;">${e(supplier)}</td>
      </tr>
    </table>

    <!-- ITP points -->
    <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">ITP Points Covered</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #D0D0CE;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr>
          <th style="padding:8px 12px;background:#005670;color:#ffffff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:left;white-space:nowrap;">Section</th>
          <th style="padding:8px 12px;background:#005670;color:#ffffff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;text-align:left;">Activity</th>
        </tr>
      </thead>
      <tbody>${pointRows}</tbody>
    </table>

    ${notes ? `
    <!-- Notes -->
    <div style="background:#ECECE7;border-radius:8px;padding:12px 14px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Notes</div>
      ${notesHtml}
    </div>` : ""}

    <!-- Files -->
    <div style="font-size:11px;font-weight:800;color:#53565A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Inspection Records</div>
    ${files.length ? fileRows : `<p style="font-size:13px;color:#53565A;">No files are currently attached to this record.</p>`}

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #D0D0CE;margin:24px 0 16px;"/>
    <p style="font-size:11px;color:#53565A;margin:0;">
      This notification was sent from the <strong>Enshore IMS</strong>. The document pack link is a secure signed link and expires after 6 months.
      If you did not expect this email, please disregard it or contact your Enshore project team.
    </p>
  </div>

</div>`;
}

