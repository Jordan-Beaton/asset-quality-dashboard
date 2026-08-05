"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { imsColours, imsInputStyle } from "../../src/components/imsTheme";

const reporterTypes = ["Employee", "Contractor", "Client", "Visitor", "Quick Fill"];
const observationTypes = ["Positive Observation", "Unsafe Act", "Unsafe Condition", "Environmental", "Quality / Process", "Other"];
const categories = ["People", "Equipment", "Environment", "Process", "Housekeeping", "Access / Egress", "Lifting", "Dropped Object", "PTW / Controls", "Other"];
const riskLevels = ["Low", "Medium", "High", "Immediate attention"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function PublicObservationPage() {
  const [reporterType, setReporterType] = useState("");
  const [message, setMessage] = useState("");
  const [submittedNumber, setSubmittedNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const isQuickFill = reporterType === "Quick Fill";
  const hasSelectedReporterType = reporterType.length > 0;
  const headerText = useMemo(() => {
    if (submittedNumber) return "Observation submitted";
    return "Your observation starts here.";
  }, [submittedNumber]);

  function chooseReporterType(type: string) {
    setReporterType(type);
    if (submittedNumber) {
      setSubmittedNumber("");
      setMessage("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setMessage("Submitting observation...");
    setSubmittedNumber("");

    try {
      const formData = new FormData(form);
      formData.set("reporter_type", reporterType);

      const response = await fetch("/api/hse-observations", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(result.error || "Observation could not be submitted. Please try again.");
        return;
      }

      setSubmittedNumber(result.observationNumber || "");
      setMessage(`Thank you. Your observation has been logged${result.observationNumber ? ` as ${result.observationNumber}` : ""}.`);
      form.reset();
      setShowContact(false);
    } catch (error) {
      setMessage(`Observation could not be submitted: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <style>
          {`
            @media (max-width: 520px) {
              .observe-header {
                grid-template-columns: minmax(0, 1fr) auto !important;
                justify-items: start !important;
                padding: 16px !important;
              }

              .observe-logo {
                width: 142px !important;
              }

              .observe-three-rs-logo {
                width: 108px !important;
                justify-self: end !important;
              }

              .observe-header-copy {
                grid-column: 1 / -1 !important;
              }
            }
          `}
        </style>
        <header className="observe-header" style={headerStyle}>
          <Image className="observe-logo" src="/enshore-primary-strapline-green-rgb.jpg" alt="Enshore — From Onshore to Offshore" width={3028} height={1593} priority style={{ width: "170px", height: "auto" }} />
          <div className="observe-header-copy" style={headerCopyStyle}>
            <span style={eyebrowStyle}>HSE Management</span>
            <h1 style={titleStyle}>{headerText}</h1>
            <p style={subtitleStyle}>Every observation helps make Enshore a safer place to work.</p>
          </div>
          <Image className="observe-three-rs-logo" src="/enshore-3rs-primary-rgb.jpg" alt="Recognise, Report, Resolve" width={1889} height={712} priority style={{ width: "145px", height: "auto" }} />
        </header>

        {message ? (
          <div style={submittedNumber ? successStyle : statusStyle}>
            <strong>{submittedNumber ? "Logged:" : "Status:"}</strong> {message}
          </div>
        ) : null}

        <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Who is submitting?</h2>
            <div style={choiceGridStyle}>
              {reporterTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => chooseReporterType(type)}
                  style={reporterType === type ? activeChoiceStyle : choiceStyle}
                >
                  {type}
                </button>
              ))}
            </div>
            {!hasSelectedReporterType ? (
              <p style={helperTextStyle}>Choose the route that best describes you. The form will open after selection.</p>
            ) : null}
        </section>

        {hasSelectedReporterType ? (
        <form onSubmit={handleSubmit} style={formStyle}>
          <section style={cardStyle}>
            <div style={formHeaderRowStyle}>
              <h2 style={sectionTitleStyle}>Contact Details</h2>
              <button
                type="button"
                onClick={() => {
                  setReporterType("");
                  setSubmittedNumber("");
                  setMessage("");
                }}
                style={smallGhostButtonStyle}
              >
                Change
              </button>
            </div>
            <input type="hidden" name="reporter_type" value={reporterType} />
            {!isQuickFill ? (
              <div style={responsiveGridStyle}>
                <Field label="Name">
                  <input name="reporter_name" style={inputStyle} placeholder="Your name" />
                </Field>
                <Field label="Company">
                  <input name="reporter_company" style={inputStyle} placeholder="Company / organisation" />
                </Field>
              </div>
            ) : null}
            <button type="button" onClick={() => setShowContact((value) => !value)} style={ghostButtonStyle}>
              {showContact ? "Hide optional contact details" : "Add optional contact details"}
            </button>
            {showContact ? (
              <Field label="Contact details">
                <input name="reporter_contact" style={inputStyle} placeholder="Phone or email if HSE needs to follow up" />
              </Field>
            ) : null}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Observation details</h2>
            <div style={responsiveGridStyle}>
              <Field label="Project / vessel / worksite">
                <input name="project" style={inputStyle} placeholder="e.g. ENS24, Blyth Base, vessel name" />
              </Field>
              <Field label="Exact location">
                <input name="site_location" style={inputStyle} placeholder="Area, deck, room, workshop, yard..." />
              </Field>
              <Field label="Date">
                <input type="date" name="observation_date" defaultValue={today()} style={inputStyle} />
              </Field>
              <Field label="Time">
                <input type="time" name="observation_time" defaultValue={currentTime()} style={inputStyle} />
              </Field>
              <Field label="Observation type">
                <select name="observation_type" style={inputStyle} defaultValue="Unsafe Condition">
                  {observationTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select name="category" style={inputStyle} defaultValue="">
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Risk / attention level">
                <select name="risk_level" style={inputStyle} defaultValue="">
                  <option value="">Select level</option>
                  {riskLevels.map((level) => <option key={level}>{level}</option>)}
                </select>
              </Field>
              <Field label="Short title">
                <input name="title" style={inputStyle} placeholder="Short summary" />
              </Field>
            </div>
            <Field label="What was observed?">
              <textarea name="description" required style={textareaStyle} placeholder="Describe what happened, what you saw, or what could be improved." />
            </Field>
            <Field label="Immediate action taken">
              <textarea name="immediate_action" style={textareaStyle} placeholder="What was done straight away, if anything?" />
            </Field>
            <Field label="Suggested action">
              <textarea name="suggested_action" style={textareaStyle} placeholder="Suggested fix or follow-up action." />
            </Field>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Photos or supporting evidence</h2>
            <p style={helperTextStyle}>Optional. Add photos or files that help HSE understand the observation.</p>
            <input name="evidence" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={fileInputStyle} />
          </section>

          <button
            type="submit"
            disabled={submitting || Boolean(submittedNumber)}
            style={{
              ...submitButtonStyle,
              opacity: submitting ? 0.7 : 1,
              background: submittedNumber ? "#005670" : submitButtonStyle.background,
              cursor: submitting || submittedNumber ? "default" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : submittedNumber ? `Submitted${submittedNumber ? ` - ${submittedNumber}` : ""}` : "Submit Observation"}
          </button>
        </form>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  margin: "-28px -24px -36px",
  padding: "16px",
  background: "linear-gradient(180deg, #ECECE7 0%, #f8fafc 48%, #eef2f5 100%)",
  boxSizing: "border-box",
};

const shellStyle: CSSProperties = {
  maxWidth: "860px",
  margin: "0 auto",
  display: "grid",
  gap: "14px",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: "16px",
  alignItems: "center",
  padding: "18px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
};

const headerCopyStyle: CSSProperties = { minWidth: 0 };
const eyebrowStyle: CSSProperties = { color: "#63B1BC", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em" };
const titleStyle: CSSProperties = {
  margin: "4px 0",
  fontSize: "clamp(18px, 3.2vw, 28px)",
  color: imsColours.ink,
  lineHeight: 1.05,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
const subtitleStyle: CSSProperties = { margin: 0, color: imsColours.slate, lineHeight: 1.45, fontSize: "14px" };
const formStyle: CSSProperties = { display: "grid", gap: "14px" };
const cardStyle: CSSProperties = { background: "#ffffff", borderRadius: "18px", border: "1px solid #dbe7f3", boxShadow: "0 1px 3px rgba(15,23,42,0.08)", padding: "16px", display: "grid", gap: "12px" };
const sectionTitleStyle: CSSProperties = { margin: 0, color: imsColours.ink, fontSize: "18px", fontWeight: 900 };
const choiceGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(126px, 1fr))", gap: "9px" };
const choiceStyle: CSSProperties = { border: "1px solid #cbd5e1", borderRadius: "12px", background: "#f8fafc", color: imsColours.ink, minHeight: "46px", fontWeight: 900, cursor: "pointer" };
const activeChoiceStyle: CSSProperties = { ...choiceStyle, background: imsColours.brand, borderColor: imsColours.brand, color: "#ffffff" };
const responsiveGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" };
const fieldStyle: CSSProperties = { display: "grid", gap: "6px" };
const labelStyle: CSSProperties = { color: "#334155", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" };
const inputStyle: CSSProperties = { ...imsInputStyle, minHeight: "48px", fontSize: "16px" };
const textareaStyle: CSSProperties = { ...inputStyle, minHeight: "106px", resize: "vertical", lineHeight: 1.45 };
const fileInputStyle: CSSProperties = { ...inputStyle, padding: "12px" };
const helperTextStyle: CSSProperties = { margin: 0, color: imsColours.slate, fontSize: "13px", lineHeight: 1.45 };
const ghostButtonStyle: CSSProperties = { border: `1px solid ${imsColours.brandBorder}`, background: imsColours.brandSoft, color: imsColours.brandDark, minHeight: "44px", borderRadius: "12px", fontWeight: 900, cursor: "pointer" };
const formHeaderRowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" };
const smallGhostButtonStyle: CSSProperties = { ...ghostButtonStyle, minHeight: "36px", padding: "8px 12px" };
const submitButtonStyle: CSSProperties = { border: "none", borderRadius: "14px", minHeight: "56px", background: imsColours.brand, color: "#ffffff", fontSize: "17px", fontWeight: 900, cursor: "pointer", boxShadow: "0 16px 30px rgba(0,86,112,0.24)" };
const statusStyle: CSSProperties = { borderRadius: "14px", background: "#ffffff", border: "1px solid #dbe7f3", padding: "13px 14px", color: imsColours.ink, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" };
const successStyle: CSSProperties = { ...statusStyle, background: "#ecfdf5", borderColor: "#bbf7d0", color: "#14532d" };
