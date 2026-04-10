"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. If email confirmation is enabled in Supabase, check your email first, then come back and sign in."
    );
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
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
          Asset Quality Dashboard access
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#0f766e",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "12px 16px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>

      {message && (
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
      )}

      <div style={{ marginTop: "18px", fontSize: "14px", color: "#475569" }}>
        {mode === "login" ? (
          <>
            Need an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage(null);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#0f766e",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#0f766e",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}