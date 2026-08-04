"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

const REDIRECT_STORAGE_KEY = "asset-quality-login-redirect";
type LoginMode = "login" | "forgot" | "reset" | "request";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("login");
  const [loading, setLoading] = useState(false);
  const [authLinkLoading, setAuthLinkLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ first_name: "", last_name: "", email: "", department: "", reason: "", requested_modules: [] as string[] });
  const [requestOptions, setRequestOptions] = useState<{ departments: string[]; modules: Array<{ key: string; label: string }> }>({ departments: [], modules: [] });
  const redirectTarget = searchParams.get("redirect") || "/";
  const safeRedirectTarget =
    redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
      ? redirectTarget
      : "/";

  useEffect(() => {
    if (safeRedirectTarget && safeRedirectTarget !== "/") {
      window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, safeRedirectTarget);
    }
  }, [safeRedirectTarget]);

  useEffect(() => {
    const hydrateAuthLinkSession = async () => {
      const searchType = searchParams.get("type");
      const searchMode = searchParams.get("mode");
      const code = searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashType = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const isInvite = searchMode === "invite" || searchType === "invite" || hashType === "invite";
      const isRecovery = searchMode === "recovery" || searchType === "recovery" || hashType === "recovery";
      const isAuthLink = isInvite || isRecovery || Boolean(code) || Boolean(accessToken);

      if (!isAuthLink) return;

      setAuthLinkLoading(true);
      setMode("reset");
      setMessage(isInvite ? "Verifying your IMS invite..." : "Verifying your password reset link...");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(`This invite/reset link could not be verified: ${error.message}. Ask an IMS Admin to send a fresh link.`);
          setAuthLinkLoading(false);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setMessage(`This invite/reset link could not be verified: ${error.message}. Ask an IMS Admin to send a fresh link.`);
          setAuthLinkLoading(false);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("This invite/reset link is missing its secure session or has expired. Ask an IMS Admin to send a fresh link.");
        setAuthLinkLoading(false);
        return;
      }

      setEmail(session.user.email || "");
      setMessage(isInvite ? "Invite verified. Create your password to finish setting up IMS access." : "Reset link verified. Enter your new password.");
      window.history.replaceState(null, "", "/login?mode=recovery");
      setAuthLinkLoading(false);
    };

    hydrateAuthLinkSession();
  }, [searchParams]);

  useEffect(() => { if (mode !== "request" || requestOptions.departments.length) return; void fetch("/api/access-requests").then((response) => response.json()).then((json) => { if (json.error) setMessage(json.error); else setRequestOptions({ departments: json.departments || [], modules: json.modules || [] }); }).catch(() => setMessage("Access request options could not be loaded.")); }, [mode, requestOptions.departments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const storedRedirect = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY) || "";
      const finalRedirectTarget = safeRedirectTarget !== "/" ? safeRedirectTarget : storedRedirect || "/";

      await supabase.auth.getSession();
      window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      window.location.href =
        finalRedirectTarget.startsWith("/") && !finalRedirectTarget.startsWith("//")
          ? finalRedirectTarget
          : "/";
      return;
    }

    if (mode === "request") {
      const response = await fetch("/api/access-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestForm) }); const json = await response.json();
      setMessage(json.error || json.message || "Access request submitted."); setLoading(false); if (response.ok) setRequestForm({ first_name: "", last_name: "", email: "", department: "", reason: "", requested_modules: [] }); return;
    }

    if (mode === "forgot") {
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login?mode=recovery`,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Password reset email sent. Open the link in the email to set a new password.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage("Please enter a new password with at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("This invite/reset session has expired or was not opened from the email link. Ask an IMS Admin to send a fresh link.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMode("login");
    setMessage("Password updated. You can now sign in with your new password.");
    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: "440px",
        margin: "48px auto",
        background: "white",
        borderRadius: "18px",
        padding: "28px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>
          {mode === "login" ? "Sign in" : mode === "forgot" ? "Reset password" : mode === "request" ? "Request IMS access" : "Set new password"}
        </h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
          {mode === "request"
            ? "Submit your details for review by an IMS Administrator."
            : mode === "forgot"
            ? "Enter your email and we will send a secure reset link."
            : mode === "reset"
              ? "Choose a new password for your IMS account."
              : "Enshore IMS access"}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        {mode === "request" ? <>
          <div style={requestNameGrid}><div><label style={labelStyle}>First Name</label><input required style={inputStyle} value={requestForm.first_name} onChange={(e) => setRequestForm((current) => ({ ...current, first_name: e.target.value }))} /></div><div><label style={labelStyle}>Last Name</label><input required style={inputStyle} value={requestForm.last_name} onChange={(e) => setRequestForm((current) => ({ ...current, last_name: e.target.value }))} /></div></div>
          <div><label style={labelStyle}>Enshore Email Address</label><input required type="email" pattern="[^@\\s]+@enshoresubsea\\.com" placeholder="name@enshoresubsea.com" style={inputStyle} value={requestForm.email} onChange={(e) => setRequestForm((current) => ({ ...current, email: e.target.value }))} /></div>
          <div><label style={labelStyle}>Department</label><select required style={inputStyle} value={requestForm.department} onChange={(e) => setRequestForm((current) => ({ ...current, department: e.target.value }))}><option value="">Select department</option>{requestOptions.departments.map((department) => <option key={department}>{department}</option>)}</select></div>
          <div><label style={labelStyle}>Reason Access Is Required</label><textarea required style={{ ...inputStyle, minHeight: 88, resize: "vertical" }} value={requestForm.reason} onChange={(e) => setRequestForm((current) => ({ ...current, reason: e.target.value }))} /></div>
          <fieldset style={moduleFieldset}><legend style={labelStyle}>Requested Modules</legend><div style={moduleRequestGrid}>{requestOptions.modules.map((module) => <label key={module.key} style={moduleRequestOption}><input type="checkbox" checked={requestForm.requested_modules.includes(module.key)} onChange={(e) => setRequestForm((current) => ({ ...current, requested_modules: e.target.checked ? [...current.requested_modules, module.key] : current.requested_modules.filter((key) => key !== module.key) }))} />{module.label}</label>)}</div></fieldset>
        </> : <>
        <div>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            type="email"
            required
            disabled={mode === "reset" && Boolean(email)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        {mode !== "forgot" ? (
          <div>
            <label htmlFor="password" style={labelStyle}>{mode === "reset" ? "New Password" : "Password"}</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        ) : null}

        {mode === "reset" ? (
          <div>
            <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        ) : null}</>}

        <button
          type="submit"
          disabled={loading || authLinkLoading}
          style={{
            background: "#3A9B98",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading || authLinkLoading ? "Please wait..." : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset email" : mode === "request" ? "Submit Access Request" : "Update password"}
        </button>
      </form>

      {message ? (
        <div
          style={{
            marginTop: "14px",
            padding: "12px 14px",
            borderRadius: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#334155",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ marginTop: "18px", fontSize: "14px", color: "#475569" }}>
        {mode === "login" ? (
          <>
            <InlineButton onClick={() => { setMode("request"); setMessage(null); }}>Request access</InlineButton>
            <span style={{ margin: "0 8px", color: "#cbd5e1" }}>{" | "}</span>
            <InlineButton
              onClick={() => {
                setMode("forgot");
                setPassword("");
                setMessage(null);
              }}
            >
              Forgot password?
            </InlineButton>
          </>
        ) : (
          <>
            Return to{" "}
            <InlineButton
              onClick={() => {
                setMode("login");
                setPassword("");
                setMessage(null);
              }}
            >
              sign in
            </InlineButton>
          </>
        )}
      </div>
    </div>
  );
}

function InlineButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color: "#3A9B98",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  color: "#0f172a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};
const requestNameGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const moduleFieldset: React.CSSProperties = { margin: 0, padding: 12, border: "1px solid #dbe7f3", borderRadius: 12 };
const moduleRequestGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
const moduleRequestOption: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, color: "#334155", fontSize: 13, fontWeight: 700 };

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: "440px", margin: "48px auto", padding: "28px" }}>Loading sign in...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
