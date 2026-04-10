"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Ncr = {
  id: string;
  ncr_number: string | null;
  title: string | null;
  severity: string | null;
  status: string | null;
  owner: string | null;
  area: string | null;
};

type Capa = {
  id: string;
  capa_number: string | null;
  title: string | null;
  status: string | null;
  owner: string | null;
  linked_to: string | null;
};

const emptyNcrForm = {
  ncr_number: "",
  title: "",
  severity: "Minor",
  status: "Open",
  owner: "",
  area: "",
};

const emptyCapaForm = {
  capa_number: "",
  title: "",
  status: "Open",
  owner: "",
  linked_to: "",
};

export default function NcrCapaPage() {
  const [ncrs, setNcrs] = useState<Ncr[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [message, setMessage] = useState("Loading NCR / CAPA data...");

  const [ncrSearch, setNcrSearch] = useState("");
  const [ncrStatusFilter, setNcrStatusFilter] = useState("");
  const [capaStatusFilter, setCapaStatusFilter] = useState("");

  const [ncrForm, setNcrForm] = useState(emptyNcrForm);
  const [capaForm, setCapaForm] = useState(emptyCapaForm);

  const [editingNcrId, setEditingNcrId] = useState<string | null>(null);
  const [editingCapaId, setEditingCapaId] = useState<string | null>(null);

  const [editNcrForm, setEditNcrForm] = useState(emptyNcrForm);
  const [editCapaForm, setEditCapaForm] = useState(emptyCapaForm);

  async function loadData() {
    const [ncrRes, capaRes] = await Promise.all([
      supabase.from("ncrs").select("*").order("ncr_number", { ascending: true }),
      supabase.from("capas").select("*").order("capa_number", { ascending: true }),
    ]);

    if (ncrRes.error || capaRes.error) {
      setMessage(`Error: ${ncrRes.error?.message || capaRes.error?.message || "Unknown error"}`);
      return;
    }

    setNcrs(ncrRes.data || []);
    setCapas(capaRes.data || []);
    setMessage("NCR / CAPA data loaded successfully.");
  }

  useEffect(() => {
    loadData();
  }, []);

  const openNcrs = ncrs.filter((n) => (n.status || "").toLowerCase() !== "closed").length;
  const closedNcrs = ncrs.filter((n) => (n.status || "").toLowerCase() === "closed").length;
  const openCapas = capas.filter((c) => (c.status || "").toLowerCase() !== "closed").length;
  const closedCapas = capas.filter((c) => (c.status || "").toLowerCase() === "closed").length;
  const majorOpenNcrs = ncrs.filter(
    (n) =>
      (n.severity || "").toLowerCase() === "major" &&
      (n.status || "").toLowerCase() !== "closed"
  ).length;

  const ncrSeverityChart = useMemo(() => {
    const groups = ncrs.reduce<Record<string, number>>((acc, ncr) => {
      const key = ncr.severity || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [ncrs]);

  const capaStatusChart = useMemo(() => {
    const groups = capas.reduce<Record<string, number>>((acc, capa) => {
      const key = capa.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [capas]);

  const filteredNcrs = ncrs.filter((ncr) => {
    const lower = ncrSearch.toLowerCase();

    const matchesSearch =
      !ncrSearch ||
      ncr.ncr_number?.toLowerCase().includes(lower) ||
      ncr.title?.toLowerCase().includes(lower) ||
      ncr.owner?.toLowerCase().includes(lower) ||
      ncr.area?.toLowerCase().includes(lower);

    const matchesStatus = !ncrStatusFilter || ncr.status === ncrStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredCapas = capas.filter((capa) => {
    const matchesStatus = !capaStatusFilter || capa.status === capaStatusFilter;
    return matchesStatus;
  });

  async function addNcr(e: React.FormEvent) {
    e.preventDefault();

    if (!ncrForm.ncr_number.trim() || !ncrForm.title.trim()) {
      setMessage("NCR number and title are required.");
      return;
    }

    const { error } = await supabase.from("ncrs").insert([
      {
        ncr_number: ncrForm.ncr_number.trim(),
        title: ncrForm.title.trim(),
        severity: ncrForm.severity,
        status: ncrForm.status,
        owner: ncrForm.owner || null,
        area: ncrForm.area || null,
      },
    ]);

    if (error) {
      setMessage(`Add NCR failed: ${error.message}`);
      return;
    }

    setNcrForm(emptyNcrForm);
    setMessage("NCR added successfully.");
    await loadData();
  }

  async function addCapa(e: React.FormEvent) {
    e.preventDefault();

    if (!capaForm.capa_number.trim() || !capaForm.title.trim()) {
      setMessage("CAPA number and title are required.");
      return;
    }

    const { error } = await supabase.from("capas").insert([
      {
        capa_number: capaForm.capa_number.trim(),
        title: capaForm.title.trim(),
        status: capaForm.status,
        owner: capaForm.owner || null,
        linked_to: capaForm.linked_to || null,
      },
    ]);

    if (error) {
      setMessage(`Add CAPA failed: ${error.message}`);
      return;
    }

    setCapaForm(emptyCapaForm);
    setMessage("CAPA added successfully.");
    await loadData();
  }

  function startEditNcr(ncr: Ncr) {
    setEditingNcrId(ncr.id);
    setEditNcrForm({
      ncr_number: ncr.ncr_number || "",
      title: ncr.title || "",
      severity: ncr.severity || "Minor",
      status: ncr.status || "Open",
      owner: ncr.owner || "",
      area: ncr.area || "",
    });
  }

  function startEditCapa(capa: Capa) {
    setEditingCapaId(capa.id);
    setEditCapaForm({
      capa_number: capa.capa_number || "",
      title: capa.title || "",
      status: capa.status || "Open",
      owner: capa.owner || "",
      linked_to: capa.linked_to || "",
    });
  }

  async function saveNcr(id: string) {
    if (!editNcrForm.ncr_number.trim() || !editNcrForm.title.trim()) {
      setMessage("NCR number and title are required.");
      return;
    }

    const { error } = await supabase
      .from("ncrs")
      .update({
        ncr_number: editNcrForm.ncr_number.trim(),
        title: editNcrForm.title.trim(),
        severity: editNcrForm.severity,
        status: editNcrForm.status,
        owner: editNcrForm.owner || null,
        area: editNcrForm.area || null,
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update NCR failed: ${error.message}`);
      return;
    }

    setEditingNcrId(null);
    setMessage("NCR updated successfully.");
    await loadData();
  }

  async function saveCapa(id: string) {
    if (!editCapaForm.capa_number.trim() || !editCapaForm.title.trim()) {
      setMessage("CAPA number and title are required.");
      return;
    }

    const { error } = await supabase
      .from("capas")
      .update({
        capa_number: editCapaForm.capa_number.trim(),
        title: editCapaForm.title.trim(),
        status: editCapaForm.status,
        owner: editCapaForm.owner || null,
        linked_to: editCapaForm.linked_to || null,
      })
      .eq("id", id);

    if (error) {
      setMessage(`Update CAPA failed: ${error.message}`);
      return;
    }

    setEditingCapaId(null);
    setMessage("CAPA updated successfully.");
    await loadData();
  }

  async function deleteNcr(id: string) {
    if (!window.confirm("Delete this NCR?")) return;

    const { error } = await supabase.from("ncrs").delete().eq("id", id);

    if (error) {
      setMessage(`Delete NCR failed: ${error.message}`);
      return;
    }

    setMessage("NCR deleted successfully.");
    await loadData();
  }

  async function deleteCapa(id: string) {
    if (!window.confirm("Delete this CAPA?")) return;

    const { error } = await supabase.from("capas").delete().eq("id", id);

    if (error) {
      setMessage(`Delete CAPA failed: ${error.message}`);
      return;
    }

    setMessage("CAPA deleted successfully.");
    await loadData();
  }

  function clearFilters() {
    setNcrSearch("");
    setNcrStatusFilter("");
    setCapaStatusFilter("");
  }

  return (
    <main>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Quality Register</div>
          <h1 style={heroTitleStyle}>NCR / CAPA</h1>
          <p style={heroSubtitleStyle}>
            Manage nonconformances and corrective actions, monitor status, and keep
            linked records visible in one place.
          </p>
        </div>

        <div style={heroMetaWrapStyle}>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open NCRs</div>
            <div style={heroMetaValueStyle}>{openNcrs}</div>
          </div>
          <div style={heroMetaCardStyle}>
            <div style={heroMetaLabelStyle}>Open CAPAs</div>
            <div style={heroMetaValueStyle}>{openCapas}</div>
          </div>
        </div>
      </section>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <section style={statsGridStyle}>
        <StatCard title="Open NCRs" value={openNcrs} accent="#dc2626" />
        <StatCard title="Closed NCRs" value={closedNcrs} accent="#16a34a" />
        <StatCard title="Open CAPAs" value={openCapas} accent="#f59e0b" />
        <StatCard title="Closed CAPAs" value={closedCapas} accent="#2563eb" />
        <StatCard title="Major Open NCRs" value={majorOpenNcrs} accent="#b91c1c" />
      </section>

      <section style={statusBannerStyle}>
        <strong>Status:</strong> {message}
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Add NCR</h2>
              <p style={sectionSubtitleStyle}>
                Log a new nonconformance into the live register.
              </p>
            </div>
          </div>

          <form onSubmit={addNcr}>
            <div style={formGridStyle}>
              <input
                placeholder="NCR Number"
                value={ncrForm.ncr_number}
                onChange={(e) => setNcrForm({ ...ncrForm, ncr_number: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Title"
                value={ncrForm.title}
                onChange={(e) => setNcrForm({ ...ncrForm, title: e.target.value })}
                style={inputStyle}
              />
              <select
                value={ncrForm.severity}
                onChange={(e) => setNcrForm({ ...ncrForm, severity: e.target.value })}
                style={inputStyle}
              >
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
              <select
                value={ncrForm.status}
                onChange={(e) => setNcrForm({ ...ncrForm, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <input
                placeholder="Owner"
                value={ncrForm.owner}
                onChange={(e) => setNcrForm({ ...ncrForm, owner: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Area"
                value={ncrForm.area}
                onChange={(e) => setNcrForm({ ...ncrForm, area: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button type="submit" style={primaryButtonStyle}>
              Add NCR
            </button>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Add CAPA</h2>
              <p style={sectionSubtitleStyle}>
                Create a corrective or preventive action record.
              </p>
            </div>
          </div>

          <form onSubmit={addCapa}>
            <div style={formGridStyle}>
              <input
                placeholder="CAPA Number"
                value={capaForm.capa_number}
                onChange={(e) => setCapaForm({ ...capaForm, capa_number: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Title"
                value={capaForm.title}
                onChange={(e) => setCapaForm({ ...capaForm, title: e.target.value })}
                style={inputStyle}
              />
              <select
                value={capaForm.status}
                onChange={(e) => setCapaForm({ ...capaForm, status: e.target.value })}
                style={inputStyle}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <input
                placeholder="Owner"
                value={capaForm.owner}
                onChange={(e) => setCapaForm({ ...capaForm, owner: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Linked NCR"
                value={capaForm.linked_to}
                onChange={(e) => setCapaForm({ ...capaForm, linked_to: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button type="submit" style={primaryButtonStyle}>
              Add CAPA
            </button>
          </form>
        </div>
      </section>

      <section style={twoColumnGridStyle}>
        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>NCR Severity Trend</h2>
              <p style={sectionSubtitleStyle}>Current spread of NCR severity levels.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ncrSeverityChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>CAPA Status Trend</h2>
              <p style={sectionSubtitleStyle}>Live view of current CAPA status values.</p>
            </div>
          </div>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={capaStatusChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Filters</h2>
            <p style={sectionSubtitleStyle}>
              Narrow down the NCR and CAPA registers.
            </p>
          </div>
          <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
            Clear Filters
          </button>
        </div>

        <div style={filterBarStyle}>
          <input
            placeholder="Search NCR number / title / owner / area"
            value={ncrSearch}
            onChange={(e) => setNcrSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={ncrStatusFilter} onChange={(e) => setNcrStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All NCR Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={capaStatusFilter} onChange={(e) => setCapaStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All CAPA Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div style={registerBlockStyle}>
          <div style={registerHeaderRowStyle}>
            <h3 style={registerTitleStyle}>NCR Register</h3>
            <span style={registerCountStyle}>{filteredNcrs.length} records</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>NCR No.</th>
                  <th style={tableHeadStyle}>Title</th>
                  <th style={tableHeadStyle}>Severity</th>
                  <th style={tableHeadStyle}>Status</th>
                  <th style={tableHeadStyle}>Owner</th>
                  <th style={tableHeadStyle}>Area</th>
                  <th style={tableHeadStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNcrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyTableCellStyle}>
                      No NCR records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredNcrs.map((ncr) => (
                    <tr key={ncr.id}>
                      {editingNcrId === ncr.id ? (
                        <>
                          <td style={tableCellStyle}>
                            <input
                              value={editNcrForm.ncr_number}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, ncr_number: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editNcrForm.title}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, title: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <select
                              value={editNcrForm.severity}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, severity: e.target.value })}
                              style={smallInputStyle}
                            >
                              <option value="Minor">Minor</option>
                              <option value="Major">Major</option>
                            </select>
                          </td>
                          <td style={tableCellStyle}>
                            <select
                              value={editNcrForm.status}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, status: e.target.value })}
                              style={smallInputStyle}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editNcrForm.owner}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, owner: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editNcrForm.area}
                              onChange={(e) => setEditNcrForm({ ...editNcrForm, area: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => saveNcr(ncr.id)} style={miniButtonStyle}>
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingNcrId(null)} style={miniButtonGreyStyle}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tableCellStyle}>{ncr.ncr_number || "-"}</td>
                          <td style={tableCellStyle}>{ncr.title || "-"}</td>
                          <td style={tableCellStyle}>
                            <SeverityBadge value={ncr.severity || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>
                            <StatusBadge value={ncr.status || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>{ncr.owner || "-"}</td>
                          <td style={tableCellStyle}>{ncr.area || "-"}</td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => startEditNcr(ncr)} style={miniButtonStyle}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteNcr(ncr.id)} style={miniButtonDeleteStyle}>
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
        </div>

        <div style={registerBlockStyle}>
          <div style={registerHeaderRowStyle}>
            <h3 style={registerTitleStyle}>CAPA Register</h3>
            <span style={registerCountStyle}>{filteredCapas.length} records</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>CAPA No.</th>
                  <th style={tableHeadStyle}>Title</th>
                  <th style={tableHeadStyle}>Status</th>
                  <th style={tableHeadStyle}>Owner</th>
                  <th style={tableHeadStyle}>Linked NCR</th>
                  <th style={tableHeadStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCapas.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyTableCellStyle}>
                      No CAPA records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredCapas.map((capa) => (
                    <tr key={capa.id}>
                      {editingCapaId === capa.id ? (
                        <>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.capa_number}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, capa_number: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.title}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, title: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <select
                              value={editCapaForm.status}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, status: e.target.value })}
                              style={smallInputStyle}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.owner}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, owner: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <input
                              value={editCapaForm.linked_to}
                              onChange={(e) => setEditCapaForm({ ...editCapaForm, linked_to: e.target.value })}
                              style={smallInputStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => saveCapa(capa.id)} style={miniButtonStyle}>
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingCapaId(null)} style={miniButtonGreyStyle}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tableCellStyle}>{capa.capa_number || "-"}</td>
                          <td style={tableCellStyle}>{capa.title || "-"}</td>
                          <td style={tableCellStyle}>
                            <StatusBadge value={capa.status || "Unknown"} />
                          </td>
                          <td style={tableCellStyle}>{capa.owner || "-"}</td>
                          <td style={tableCellStyle}>{capa.linked_to || "-"}</td>
                          <td style={tableCellStyle}>
                            <div style={actionButtonsWrapStyle}>
                              <button type="button" onClick={() => startEditCapa(capa)} style={miniButtonStyle}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteCapa(capa.id)} style={miniButtonDeleteStyle}>
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
    lower === "closed"
      ? { background: "#dcfce7", color: "#166534" }
      : lower === "open"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : lower === "in progress"
      ? { background: "#fef3c7", color: "#92400e" }
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

function SeverityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const styles =
    lower === "major"
      ? { background: "#fee2e2", color: "#991b1b" }
      : lower === "minor"
      ? { background: "#fef3c7", color: "#92400e" }
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
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: "12px",
  marginBottom: "20px",
};

const registerBlockStyle: React.CSSProperties = {
  marginTop: "8px",
};

const registerHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
};

const registerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#0f172a",
};

const registerCountStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
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