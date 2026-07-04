import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/client";
import AssetDocuments from "./AssetDocuments";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

function emptyForm(fields) {
  const out = {};
  fields.forEach((f) => (out[f.name] = ""));
  return out;
}

function toPayload(fields, form) {
  const out = {};
  fields.forEach((f) => {
    out[f.name] = f.type === "number" ? Number(form[f.name] || 0) : form[f.name];
  });
  return out;
}

export default function CrudPage({ title, endpoint, fields, assetType }) {
  const [items, setItems] = useState([]);
  const [addForm, setAddForm] = useState(emptyForm(fields));
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  function load() {
    apiClient
      .get(endpoint)
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load"));
  }

  useEffect(() => { load(); }, [endpoint]);

  const owners = useMemo(() => {
    const set = new Set(items.map((i) => i.owner_name).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (ownerFilter && item.owner_name !== ownerFilter) return false;
      if (!q) return true;
      return fields.some((f) => {
        const val = item[f.name];
        return val != null && String(val).toLowerCase().includes(q);
      });
    });
  }, [items, search, ownerFilter, fields]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await apiClient.post(endpoint, toPayload(fields, addForm));
      setAddForm(emptyForm(fields));
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    }
  }

  function startEdit(item) {
    const form = {};
    fields.forEach((f) => (form[f.name] = item[f.name] ?? ""));
    setEditForm(form);
    setEditingId(item.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    setError("");
    try {
      await apiClient.put(`${endpoint}/${id}`, toPayload(fields, editForm));
      setEditingId(null);
      setEditForm({});
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed");
    }
  }

  function downloadTemplate() {
    const headers = fields.map((f) => f.name).join(",");
    const example = fields.map((f) => f.type === "number" ? "0" : "example").join(",");
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportMsg("");
    setError("");
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      setError("CSV is empty or has no data rows.");
      setImporting(false);
      return;
    }
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      const payload = {};
      fields.forEach((f) => {
        const val = row[f.name] ?? "";
        payload[f.name] = f.type === "number" ? Number(val || 0) : val;
      });
      try {
        await apiClient.post(endpoint, payload);
        ok++;
      } catch {
        fail++;
      }
    }
    load();
    setImporting(false);
    setImportMsg(`Imported ${ok} row${ok !== 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}.`);
  }

  async function handleDelete(id) {
    if (editingId === id) cancelEdit();
    await apiClient.delete(`${endpoint}/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="item-count">{filtered.length} of {items.length}</span>
          <button className="export-btn" onClick={downloadTemplate} title="Download CSV template">⬇ Template</button>
          <button className="export-btn export-btn-green" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? "Importing…" : "⬆ Import CSV"}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleImport} />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {importMsg && <p className="import-msg">{importMsg}</p>}

      <form className="crud-form" onSubmit={handleAdd}>
        {fields.map((f) => (
          <input
            key={f.name}
            type={f.type === "number" ? "number" : "text"}
            step={f.type === "number" ? "any" : undefined}
            placeholder={f.label}
            value={addForm[f.name]}
            onChange={(e) => setAddForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
            required={f.required !== false}
          />
        ))}
        <button type="submit">Add</button>
      </form>

      <div className="filter-bar">
        <input
          className="filter-search"
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {owners.length > 0 && (
          <select
            className="filter-select"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="">All owners</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {(search || ownerFilter) && (
          <button className="filter-clear" onClick={() => { setSearch(""); setOwnerFilter(""); }}>
            ✕ Clear
          </button>
        )}
      </div>

      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {fields.map((f) => <th key={f.name}>{f.label}</th>)}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={fields.length + 1} className="table-empty">No results found.</td></tr>
          )}
          {filtered.map((item) => (
            <Fragment key={item.id}>
              {editingId === item.id ? (
                <tr className="editing-row">
                  {fields.map((f) => (
                    <td key={f.name}>
                      <input
                        className="inline-edit-input"
                        type={f.type === "number" ? "number" : "text"}
                        step={f.type === "number" ? "any" : undefined}
                        value={editForm[f.name] ?? ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, [f.name]: e.target.value }))
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <button className="btn-save" onClick={() => saveEdit(item.id)}>Save</button>
                    <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr>
                  {fields.map((f) => <td key={f.name}>{item[f.name]}</td>)}
                  <td>
                    <button onClick={() => startEdit(item)}>Edit</button>
                    <button onClick={() => handleDelete(item.id)}>Delete</button>
                    {assetType && (
                      <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        {expandedId === item.id ? "Hide Docs" : "Docs"}
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {assetType && expandedId === item.id && (
                <tr>
                  <td colSpan={fields.length + 1}>
                    <AssetDocuments assetType={assetType} assetId={item.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
