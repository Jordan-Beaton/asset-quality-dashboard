"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { PreventionResult } from "../lib/lessonsPrevention";
import { ImsButton, ImsPanel } from "./ImsPrimitives";
import { imsColours, imsInputStyle } from "./imsTheme";

type IndexStatus = { configured: boolean; migration_required: boolean; total: number; indexed: number };

export function LessonsPreventionIntelligence({ canManage, onOpenLessons }: { canManage: boolean; onOpenLessons: (ids: string[], label: string) => void }) {
  const [question, setQuestion] = useState("Tell me the most important lessons from trenching failures that we should apply in our procedures.");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PreventionResult | null>(null);
  const [message, setMessage] = useState("Ready for an evidence-based prevention question.");
  const [working, setWorking] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<IndexStatus | null>(null);

  async function loadStatus() {
    const response = await fetch("/api/lessons-learned/prevention-index", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void loadStatus(); }, []);

  async function ask(event: FormEvent) {
    event.preventDefault();
    setWorking(true); setResult(null); setMessage(file ? `Reviewing ${file.name} against historic failures...` : "Finding and consolidating relevant failure evidence...");
    try {
      const response = file ? await fetch("/api/lessons-learned/procedure-review", {
        method: "POST",
        body: (() => { const form = new FormData(); form.set("question", question); form.set("file", file); return form; })(),
      }) : await fetch("/api/lessons-learned/prevention-query", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The prevention review failed.");
      setResult(payload as PreventionResult);
      setMessage(`Completed using ${payload.evidence_count} retrieved failure records.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The prevention review failed."); }
    finally { setWorking(false); }
  }

  async function buildIndex() {
    setIndexing(true); setMessage("Building the semantic failure index in controlled batches...");
    try {
      let remaining = 1; let indexed = 0; let total = 0;
      while (remaining > 0) {
        const response = await fetch("/api/lessons-learned/prevention-index", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Semantic indexing failed.");
        remaining = payload.remaining; indexed = payload.indexed; total = payload.total;
        setStatus((current) => ({ ...current, configured: true, migration_required: false, indexed, total }));
        setMessage(`Indexed ${indexed.toLocaleString()} of ${total.toLocaleString()} failure lessons...`);
      }
      setMessage(`Semantic index ready: ${indexed.toLocaleString()} failure lessons available for meaning-based retrieval.`);
      await loadStatus();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Semantic indexing failed."); }
    finally { setIndexing(false); }
  }

  const allIds = result ? [...new Set(result.cautions.flatMap((item) => item.lesson_ids))] : [];
  const sourceById = new Map((result?.sources || []).map((source) => [source.id, source]));
  return <div style={workspaceStyle}>
    <ImsPanel title="Ask Prevention Intelligence" subtitle="Ask what Enshore should avoid or control. The answer consolidates actual failures instead of listing every matching record.">
      <form onSubmit={ask} style={askFormStyle}>
        <label style={fieldStyle}><span style={labelStyle}>What do you need to prevent?</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="For example: What trenching failures should our procedure prevent?" style={questionStyle} maxLength={2000} /></label>
        <div style={suggestionStyle}><span>Try:</span>{["What should we check before mobilisation?", "What rigging failures must our lift plans prevent?", "What communication failures have repeated offshore?"].map((text) => <button type="button" key={text} style={suggestionButtonStyle} onClick={() => setQuestion(text)}>{text}</button>)}</div>
        <label style={fieldStyle}><span style={labelStyle}>Optional procedure</span><input type="file" accept=".pdf,.docx,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} style={fileStyle} /><small style={helpStyle}>Upload a PDF or Word procedure to compare its controls against relevant historic failures. Maximum 20 MB.</small></label>
        <div style={actionRowStyle}><ImsButton type="submit" disabled={working || question.trim().length < 8}>{working ? "Analysing evidence..." : file ? "Review Procedure" : "Generate Prevention Brief"}</ImsButton>{file && <ImsButton type="button" variant="secondary" onClick={() => setFile(null)}>Remove Procedure</ImsButton>}</div>
      </form>
      <div style={statusBannerStyle}><strong>Status:</strong> {message}</div>
    </ImsPanel>

    {result && <>
      <ImsPanel title="Prevention Brief" subtitle={`${result.scope} · ${result.retrieval_mode === "semantic" ? "Meaning-based retrieval" : "Keyword retrieval fallback"}`}>
        <p style={summaryStyle}>{result.summary}</p>
        <div style={briefMetaStyle}><span>{result.cautions.length} prioritised cautions</span><span>{allIds.length} cited lessons</span><ImsButton variant="secondary" onClick={() => onOpenLessons(allIds, "AI Prevention Intelligence evidence")}>Open All Supporting Lessons</ImsButton></div>
      </ImsPanel>
      <section style={cautionGridStyle}>{result.cautions.map((caution, index) => <article key={`${caution.title}-${index}`} style={cautionCardStyle}>
        <div style={cautionHeadStyle}><span style={rankStyle}>{index + 1}</span><div><strong style={cautionTitleStyle}>{caution.title}</strong><small style={confidenceStyle}>{caution.confidence} confidence · {caution.lesson_ids.length} cited lessons</small></div></div>
        <div style={findingBlockStyle}><strong>What failed</strong><p>{caution.what_failed}</p></div>
        <div style={findingBlockStyle}><strong>Why it matters</strong><p>{caution.why_it_matters}</p></div>
        <div style={findingBlockStyle}><strong>Controls to consider</strong><ul>{caution.prevention_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
        <div style={evidenceRefsStyle}><strong>Supporting lessons</strong><span>{caution.lesson_ids.map((id) => sourceById.get(id)?.lesson_number).filter(Boolean).join(" · ") || `${caution.lesson_ids.length} cited records`}</span></div>
        <ImsButton variant="secondary" onClick={() => onOpenLessons(caution.lesson_ids, `AI caution: ${caution.title}`)}>View Supporting Lessons</ImsButton>
      </article>)}</section>
      {result.limitations.length > 0 && <ImsPanel title="Evidence Limitations" subtitle="Historic record quality affects how strongly the findings can be stated."><ul style={limitationStyle}>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></ImsPanel>}
    </>}

    {canManage && <ImsPanel title="Semantic Index" subtitle="Meaning-based indexing identifies similar failures even when historic wording and repeat-group labels differ.">
      <div style={indexRowStyle}><div><strong>{status?.indexed?.toLocaleString() || 0} of {status?.total?.toLocaleString() || 0} failure lessons indexed</strong><p style={helpStyle}>{status?.migration_required ? "The Supabase Prevention Intelligence migration must be applied first." : status?.configured ? "The Enshore business AI connection is configured." : "The Enshore business API key has not yet been configured."}</p></div><ImsButton onClick={() => void buildIndex()} disabled={indexing || !status?.configured || status?.migration_required}>{indexing ? "Building Index..." : "Build / Refresh Index"}</ImsButton></div>
    </ImsPanel>}
  </div>;
}

const workspaceStyle: CSSProperties = { display: "grid", gap: 18 };
const askFormStyle: CSSProperties = { display: "grid", gap: 14 };
const fieldStyle: CSSProperties = { display: "grid", minWidth: 0, gap: 7 };
const labelStyle: CSSProperties = { color: imsColours.ink, fontSize: 13, fontWeight: 900 };
const questionStyle: CSSProperties = { ...imsInputStyle, minHeight: 118, resize: "vertical", fontSize: 16, lineHeight: 1.5 };
const fileStyle: CSSProperties = { ...imsInputStyle, minWidth: 0, maxWidth: "100%", height: "auto", fontSize: 16 };
const helpStyle: CSSProperties = { margin: 0, color: imsColours.muted, fontSize: 12, lineHeight: 1.45 };
const actionRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
const suggestionStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, color: imsColours.muted, fontSize: 12 };
const suggestionButtonStyle: CSSProperties = { border: `1px solid ${imsColours.brandBorder}`, borderRadius: 999, background: imsColours.brandSoft, color: imsColours.brandDark, padding: "7px 10px", font: "inherit", fontWeight: 800, cursor: "pointer" };
const statusBannerStyle: CSSProperties = { marginTop: 14, padding: "10px 12px", borderRadius: 10, background: imsColours.brandSoft, color: imsColours.ink, fontSize: 13 };
const summaryStyle: CSSProperties = { margin: 0, color: imsColours.ink, fontSize: 17, lineHeight: 1.6 };
const briefMetaStyle: CSSProperties = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 16, color: imsColours.muted, fontSize: 13, fontWeight: 800 };
const cautionGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 14 };
const cautionCardStyle: CSSProperties = { display: "grid", alignContent: "start", gap: 14, minWidth: 0, padding: 18, borderRadius: 16, border: `1px solid ${imsColours.brandBorder}`, background: "white", boxShadow: "0 1px 3px rgba(15,23,42,.08)" };
const cautionHeadStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 11 };
const rankStyle: CSSProperties = { flex: "0 0 auto", display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 10, background: imsColours.brand, color: "white", fontWeight: 900 };
const cautionTitleStyle: CSSProperties = { display: "block", color: imsColours.ink, fontSize: 17, lineHeight: 1.3 };
const confidenceStyle: CSSProperties = { display: "block", marginTop: 4, color: imsColours.muted, fontSize: 11, fontWeight: 800 };
const findingBlockStyle: CSSProperties = { color: imsColours.ink, fontSize: 13, lineHeight: 1.5 };
const evidenceRefsStyle: CSSProperties = { display: "grid", gap: 4, padding: "10px 11px", borderRadius: 10, background: imsColours.brandSoft, color: imsColours.ink, fontSize: 12, lineHeight: 1.45 };
const limitationStyle: CSSProperties = { margin: 0, paddingLeft: 20, color: imsColours.ink, lineHeight: 1.6 };
const indexRowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 };
