"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { supabase } from "../../src/lib/supabase";

type Asset = {
  id: string;
  asset_code: string | null;
  name: string | null;
  description: string | null;
  location: string | null;
  owner: string | null;
  status: string | null;
};

const chartColors = ["#0f766e", "#16a34a", "#dc2626", "#ea580c", "#2563eb", "#7c3aed"];

const emptyForm = {
  asset_code: "",
  name: "",
  description: "",
  location: "",
  owner: "",
  status: "Active",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState("Loading assets...");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function loadAssets() {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }

    setAssets(data || []);
    setFilteredAssets(data || []);
    setMessage(`Loaded ${data?.length ?? 0} assets successfully.`);
  }

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    let result = [...assets];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.asset_code?.toLowerCase().includes(lower) ||
          a.name?.toLowerCase().includes(lower) ||
          a.description?.toLowerCase().includes(lower)
      );
    }

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (locationFilter) {
      result = result.filter((a) => a.location === locationFilter);
    }

    if (ownerFilter) {
      result = result.filter((a) => a.owner === ownerFilter);
    }

    setFilteredAssets(result);
  }, [search, statusFilter, locationFilter, ownerFilter, assets]);

  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => (a.status || "").toLowerCase() === "active").length;
  const inactiveAssets = assets.filter((a) => (a.status || "").toLowerCase() === "inactive").length;

  const statusChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const locationChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.location || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const ownerChartData = useMemo(() => {
    const groups = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.owner || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const uniqueLocations = [...new Set(assets.map((a) => a.location).filter(Boolean))];
  const uniqueOwners = [...new Set(assets.map((a) => a.owner).filter(Boolean))];

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();

    if (!form.asset_code.trim() || !form.name.trim()) {
      setMessage("Asset code and name are required.");
      return;
    }

    const { error } = await supabase.from("assets").insert([
      {
        asset_code: form.asset_code.trim(),
        name: form.name.trim(),
        description: form.description || null,
        location: form.location || null,
        owner: form.owner || null,
        status: form.status || "Active",
      },
    ]);

    if (error) {
      setMessage(`Add asset failed: ${error.message}`);
      return;
    }

    setForm(emptyForm);
    setMessage("Asset added successfully.");
    await loadAssets();
  }

  async function bulkAddAssets() {
    const lines = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setMessage("No bulk rows entered.");
      return;
    }

    const rows = lines.map((line) => {
      const [asset_code, name, description, location, owner, status] = line
        .split("|")
        .map((x) => x.trim());

      return {
        asset_code: asset_code || null,
        name: name || null,
        description: description || null,
        location: location || null,
        owner: owner || null,
        status: status || "Active",
      };
    });

    const { error } = await supabase.from("assets").insert(rows);

    if (error) {
      setMessage(`Bulk add failed: ${error.message}`);
      return;
    }

    setBulkText("");
    setMessage(`${rows.length} assets added successfully.`);
    await loadAssets();
  }

  function startEdit(asset: Asset) {
    setEditingId(asset.id);
    setEditForm({
      asset_code: asset.asset_code || "",
      name: asset.name || "",
      description: asset.description || "",
      location: asset.location || "",
      owner: asset.owner || "",
      status: asset.status || "Active",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.asset_code.trim() || !editForm.name.trim()) {
      setMessage("Asset code and name are required.");
      return;
    }

    const { error } = await supabase
      .from("assets")
      .update({
        asset_code: editForm.asset_code.trim(),
        name: editForm.name.trim(),
        description: editForm.description || null,
        location: editForm.location || null,
        owner: editForm.owner || null,
        status: editForm.status || "Active",
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    setEditingId(null);
    setMessage("Asset updated successfully.");
    await loadAssets();
  }

  async function deleteAsset(id: string) {
    const confirmDelete = window.confirm("Delete this asset?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("assets").delete().eq("id", id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    setMessage("Asset deleted successfully.");
    await loadAssets();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setLocationFilter("");
    setOwnerFilter("");
  }

  return (
    <main>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Asset Register</div>
          <h1 style={heroTitleStyle}>Assets</h1>
          <p style={heroSubtitleStyle}>
            Maintain the live asset register, review ownership and location data,
            and monitor overall asset status.
          </p>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Records</div>
            <div style={heroMetaValueStyle}>{totalAssets}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Filtered Results</div>
            <div style={heroMetaValueStyle}>{filteredAssets.length}</div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Total Assets" value={totalAssets} accent="#0f766e" />
        <StatCard title="Active Assets" value={activeAssets} accent="#16a34a" />
        <StatCard title="Inactive Assets" value={inactiveAssets} accent="#dc2626" />
      </section>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Add Single Asset</h2>
              <p style={sectionSubtitleStyle}>
                Create one asset record directly in the register.
              </p>
            </div>
          </div>

          <form onSubmit={addAsset}>
            <div style={formGridStyle}>
              <input
                placeholder="Asset Code"
                value={form.asset_code}
                onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Owner"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                style={inputStyle}
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <button type="submit" style={primaryButtonStyle}>
              Add Asset
            </button>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Bulk Import</h2>
              <p style={sectionSubtitleStyle}>
                Paste multiple rows using pipe-separated values.
              </p>
            </div>
          </div>

          <div style={helperBoxStyle}>
            Format: <strong>asset_code | name | description | location | owner | status</strong>
          </div>

          <textarea
            rows={10}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`T1 | T1 | Trencher | Blyth | AQL | Active
ENS1100 | ENS1100 | Trencher | Blyth | Workshop | Active
Carrera 4 | Carrera 4 | CFE | Project Site | Jordan | Inactive`}
            style={textAreaStyle}
          />

          <button onClick={bulkAddAssets} style={primaryButtonStyle}>
            Import Multiple Rows
          </button>
        </div>
      </section>

      <section style={threeColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Assets by Status</h2>
              <p style={sectionSubtitleStyle}>Breakdown of asset status values.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={92} label>
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Assets by Location</h2>
              <p style={sectionSubtitleStyle}>Location distribution across the register.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={locationChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Assets by Owner</h2>
              <p style={sectionSubtitleStyle}>Ownership split of current records.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ownerChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Search and Filter</h2>
            <p style={sectionSubtitleStyle}>
              Narrow the register by text, status, location or owner.
            </p>
          </div>
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        </div>

        <div style={filterBarStyle}>
          <input
            placeholder="Search asset code / name / description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={inputStyle}>
            <option value="">All Locations</option>
            {uniqueLocations.map((location) => (
              <option key={String(location)} value={String(location)}>
                {String(location)}
              </option>
            ))}
          </select>

          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={inputStyle}>
            <option value="">All Owners</option>
            {uniqueOwners.map((owner) => (
              <option key={String(owner)} value={String(owner)}>
                {String(owner)}
              </option>
            ))}
          </select>
        </div>

        <div style={tableInfoRowStyle}>
          <span>
            Showing <strong>{filteredAssets.length}</strong> of <strong>{assets.length}</strong> assets
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Code</th>
                <th style={tableHeadStyle}>Name</th>
                <th style={tableHeadStyle}>Description</th>
                <th style={tableHeadStyle}>Location</th>
                <th style={tableHeadStyle}>Owner</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyTableCellStyle}>
                    No assets match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id}>
                    {editingId === asset.id ? (
                      <>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.asset_code}
                            onChange={(e) => setEditForm({ ...editForm, asset_code: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <input
                            value={editForm.owner}
                            onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                            style={smallInputStyle}
                          />
                        </td>
                        <td style={tableCellStyle}>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            style={smallInputStyle}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={actionButtonsWrapStyle}>
                            <button type="button" onClick={() => saveEdit(asset.id)} style={miniButtonStyle}>
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={miniButtonGreyStyle}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tableCellStyle}>{asset.asset_code || "-"}</td>
                        <td style={tableCellStyle}>{asset.name || "-"}</td>
                        <td style={tableCellStyle}>{asset.description || "-"}</td>
                        <td style={tableCellStyle}>{asset.location || "-"}</td>
                        <td style={tableCellStyle}>{asset.owner || "-"}</td>
                        <td style={tableCellStyle}>
                          <StatusBadge value={asset.status || "Unknown"} />
                        </td>
                        <td style={tableCellStyle}>
                          <div style={actionButtonsWrapStyle}>
                            <button type="button" onClick={() => startEdit(asset)} style={miniButtonStyle}>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAsset(asset.id)}
                              style={miniButtonDeleteStyle}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "18px 20px",
        borderLeft: `5px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "34px", fontWeight: 700, color: "#0f172a", marginTop: "8px" }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "active"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "inactive"
      ? { background: "#e5e7eb", color: "#374151" }
      : { background: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
        ...styles,
      }}
    >
      {value}
    </span>
  );
}

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
  color: "white",
  borderRadius: "20px",
  padding: "28px 30px",
  marginBottom: "24px",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.14)",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.78,
  marginBottom: "10px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
};

const heroSubtitleStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "16px",
  maxWidth: "720px",
  color: "rgba(255,255,255,0.92)",
};

const heroMetaWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "12px",
  minWidth: "320px",
  flex: "1 1 320px",
};

const heroMetaCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  padding: "14px 16px",
};

const heroMetaLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.82,
  marginBottom: "6px",
};

const heroMetaValueStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const statusBannerStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "14px",
  padding: "14px 18px",
  marginBottom: "24px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const threeColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "20px",
  marginBottom: "20px",
};

const panelStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const sectionHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const helperBoxStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "12px 14px",
  marginBottom: "12px",
  color: "#334155",
  fontSize: "14px",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
  background: "white",
  color: "#0f172a",
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  width: "100%",
  resize: "vertical",
  minHeight: "220px",
  marginBottom: "12px",
  fontFamily: "Arial, sans-serif",
};

const smallInputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  width: "100%",
  background: "white",
  color: "#0f172a",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0f766e",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#0f172a",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonGreyStyle: React.CSSProperties = {
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const miniButtonDeleteStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const filterBarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const tableInfoRowStyle: React.CSSProperties = {
  marginBottom: "12px",
  color: "#475569",
  fontSize: "14px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "13px",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  verticalAlign: "middle",
};

const emptyTableCellStyle: React.CSSProperties = {
  padding: "24px 10px",
  textAlign: "center",
  color: "#64748b",
};

const actionButtonsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};