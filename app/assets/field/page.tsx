"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../../src/lib/supabase";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  serial_number: string | null;
  status: string | null;
  location: string | null;
};

function getStatusTone(value: string | null | undefined) {
  const normal = (value || "").trim().toLowerCase();
  if (normal === "active") return { bg: "#dcfce7", color: "#166534" };
  if (normal.includes("maintenance")) return { bg: "#fef3c7", color: "#92400e" };
  if (normal === "quarantine") return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function FieldAssetPageContent() {
  const searchParams = useSearchParams();
  const linkedAssetCode = searchParams.get("asset")?.trim() || "";
  const linkedAssetId = searchParams.get("assetId")?.trim() || "";

  const [asset, setAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState("Loading asset...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFieldAsset() {
      if (!linkedAssetCode && !linkedAssetId) {
        setAsset(null);
        setMessage("Asset not found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      let assetQuery = supabase
        .from("assets")
        .select("id,asset_code,name,description,serial_number,status,location")
        .limit(1);

      assetQuery = linkedAssetCode
        ? assetQuery.eq("asset_code", linkedAssetCode)
        : assetQuery.eq("id", linkedAssetId);

      const { data, error } = await assetQuery.maybeSingle();

      if (error) {
        setAsset(null);
        setMessage("Asset not found");
        setIsLoading(false);
        return;
      }

      const matchedAsset = (data as Asset | null) || null;
      setAsset(matchedAsset);
      setMessage(matchedAsset ? "Asset ready" : "Asset not found");
      setIsLoading(false);
    }

    void loadFieldAsset();
  }, [linkedAssetCode, linkedAssetId]);

  const routeValue = useMemo(() => {
    if (!asset) return linkedAssetCode || linkedAssetId;
    return asset.asset_code?.trim() || asset.id;
  }, [asset, linkedAssetCode, linkedAssetId]);

  return (
    <main style={pageWrapStyle}>
      <section style={shellStyle}>
        <div style={brandBarStyle}>Asset Field Access</div>

        {isLoading ? (
          <div style={messageCardStyle}>Loading asset...</div>
        ) : !asset ? (
          <div style={messageCardStyle}>Asset not found</div>
        ) : (
          <>
            <section style={summaryCardStyle}>
              <div style={eyebrowStyle}>{asset.asset_code || "Asset"}</div>
              <h1 style={titleStyle}>{asset.name || "Unnamed Asset"}</h1>
              <div style={metaStackStyle}>
                {asset.serial_number ? <div style={metaLineStyle}>Serial: {asset.serial_number}</div> : null}
                {asset.location ? <div style={metaLineStyle}>Location: {asset.location}</div> : null}
              </div>
              <div>
                <span
                  style={{
                    ...statusBadgeStyle,
                    background: getStatusTone(asset.status).bg,
                    color: getStatusTone(asset.status).color,
                  }}
                >
                  {asset.status || "Unknown"}
                </span>
              </div>
            </section>

            <section style={actionPanelStyle}>
              <Link
                href={`/assets/inspection?asset=${encodeURIComponent(routeValue)}`}
                style={primaryActionLinkStyle}
              >
                Carry Out Inspection
              </Link>
              <Link
                href={`/assets/maintenance?asset=${encodeURIComponent(routeValue)}`}
                style={primaryActionLinkStyle}
              >
                Carry Out Maintenance
              </Link>
            </section>

            <div style={backLinkWrapStyle}>
              <Link href={`/assets?asset=${encodeURIComponent(routeValue)}`} style={backLinkStyle}>
                Back to Asset Register
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function AssetFieldPage() {
  return (
    <Suspense fallback={<main style={pageWrapStyle}>Loading asset field page...</main>}>
      <FieldAssetPageContent />
    </Suspense>
  );
}

const pageWrapStyle: CSSProperties = {
  width: "100%",
  padding: "20px 16px 32px",
  display: "flex",
  justifyContent: "center",
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  display: "grid",
  gap: "14px",
};

const brandBarStyle: CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "#ffffff",
  borderRadius: "18px",
  padding: "14px 18px",
  fontSize: "14px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  boxShadow: "0 16px 28px rgba(15, 118, 110, 0.18)",
};

const messageCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "22px 18px",
  color: "#475569",
  fontSize: "15px",
  textAlign: "center",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "18px",
  display: "grid",
  gap: "12px",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#0f766e",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "24px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#0f172a",
  overflowWrap: "anywhere",
};

const metaStackStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const metaLineStyle: CSSProperties = {
  fontSize: "14px",
  color: "#475569",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: 800,
};

const actionPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const primaryActionLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "56px",
  borderRadius: "16px",
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: "16px",
  padding: "14px 18px",
  boxShadow: "0 16px 28px rgba(15, 118, 110, 0.18)",
};

const backLinkWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#0f766e",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 700,
};
