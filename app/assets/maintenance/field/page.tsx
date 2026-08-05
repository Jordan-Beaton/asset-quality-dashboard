"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../../../src/lib/supabase";

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
  if (normal === "quarantine") return { bg: "#fee2e2", color: "#F93822" };
  return { bg: "#e2e8f0", color: "#334155" };
}

function buildAssetRouteValue(asset: Asset) {
  return asset.asset_code?.trim() || asset.id;
}

export default function AssetMaintenanceFieldPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading assets...");

  useEffect(() => {
    async function loadAssets() {
      const { data, error } = await supabase
        .from("assets")
        .select("id,asset_code,name,description,serial_number,status,location")
        .order("asset_code", { ascending: true });

      if (error) {
        setAssets([]);
        setMessage(`Load failed: ${error.message}`);
        return;
      }

      setAssets((data || []) as Asset[]);
      setMessage("Choose an asset to start a maintenance entry.");
    }

    void loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) =>
      [asset.asset_code, asset.name, asset.description, asset.serial_number, asset.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [assets, search]);

  return (
    <main style={pageWrapStyle}>
      <section style={shellStyle}>
        <div style={brandBarStyle}>Asset Field Maintenance</div>

        <section style={summaryCardStyle}>
          <div style={eyebrowStyle}>Maintenance Asset</div>
          <h1 style={titleStyle}>Choose Asset</h1>
          <p style={introStyle}>{message}</p>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset, serial number, or location"
            style={searchInputStyle}
          />
        </section>

        <section style={assetListStyle}>
          {filteredAssets.map((asset) => {
            const routeValue = buildAssetRouteValue(asset);
            const tone = getStatusTone(asset.status);
            return (
              <Link
                key={asset.id}
                href={`/assets/maintenance?asset=${encodeURIComponent(routeValue)}&view=create`}
                style={assetCardStyle}
              >
                <div style={assetCardHeaderStyle}>
                  <span style={assetCodeStyle}>{asset.asset_code || "No Code"}</span>
                  <span style={{ ...statusBadgeStyle, background: tone.bg, color: tone.color }}>
                    {asset.status || "Unknown"}
                  </span>
                </div>
                <strong style={assetTitleStyle}>{asset.name || "Unnamed Asset"}</strong>
                <div style={assetMetaStyle}>
                  {asset.serial_number ? <span>Serial: {asset.serial_number}</span> : null}
                  {asset.location ? <span>Location: {asset.location}</span> : null}
                </div>
              </Link>
            );
          })}

          {filteredAssets.length === 0 ? (
            <div style={emptyCardStyle}>No assets match the current search.</div>
          ) : null}
        </section>

        <Link href="/assets/maintenance" style={backLinkStyle}>Back to Asset Maintenance</Link>
      </section>
    </main>
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
  maxWidth: "460px",
  display: "grid",
  gap: "14px",
};

const brandBarStyle: CSSProperties = {
  background: "linear-gradient(135deg, #005670 0%, #005670 64%, #63B1BC 160%)",
  color: "#ffffff",
  borderRadius: "18px",
  padding: "14px 18px",
  fontSize: "14px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  boxShadow: "0 16px 28px rgba(0, 86, 112, 0.18)",
};

const summaryCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "18px",
  padding: "18px",
  display: "grid",
  gap: "10px",
  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#005670",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.15,
  fontWeight: 800,
  color: "#0f172a",
};

const introStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.45,
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: "15px",
  color: "#0f172a",
  boxSizing: "border-box",
};

const assetListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const assetCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe7f3",
  borderRadius: "16px",
  padding: "16px",
  display: "grid",
  gap: "9px",
  textDecoration: "none",
  color: "#0f172a",
  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.05)",
};

const assetCardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const assetCodeStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 900,
  fontSize: "12px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const assetTitleStyle: CSSProperties = {
  fontSize: "17px",
  lineHeight: 1.3,
  overflowWrap: "anywhere",
};

const assetMetaStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
};

const statusBadgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const emptyCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "18px",
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#005670",
  fontWeight: 800,
  textDecoration: "none",
  textAlign: "center",
  padding: "10px",
};
