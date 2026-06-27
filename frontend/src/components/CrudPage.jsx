import { Fragment, useEffect, useState } from "react";
import apiClient from "../api/client";
import AssetDocuments from "./AssetDocuments";

export default function CrudPage({ title, endpoint, fields, assetType }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm(fields));
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  function emptyForm(fields) {
    const initial = {};
    fields.forEach((f) => (initial[f.name] = f.type === "number" ? "" : ""));
    return initial;
  }

  function load() {
    apiClient
      .get(endpoint)
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load"));
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  function handleChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const payload = {};
    fields.forEach((f) => {
      payload[f.name] = f.type === "number" ? Number(form[f.name] || 0) : form[f.name];
    });

    try {
      if (editingId) {
        await apiClient.put(`${endpoint}/${editingId}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      setForm(emptyForm(fields));
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    }
  }

  function handleEdit(item) {
    const next = {};
    fields.forEach((f) => (next[f.name] = item[f.name] ?? ""));
    setForm(next);
    setEditingId(item.id);
  }

  async function handleDelete(id) {
    await apiClient.delete(`${endpoint}/${id}`);
    load();
  }

  return (
    <div>
      <h1>{title}</h1>
      {error && <p className="error">{error}</p>}

      <form className="crud-form" onSubmit={handleSubmit}>
        {fields.map((f) => (
          <input
            key={f.name}
            type={f.type === "number" ? "number" : "text"}
            step={f.type === "number" ? "any" : undefined}
            placeholder={f.label}
            value={form[f.name]}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required !== false}
          />
        ))}
        <button type="submit">{editingId ? "Update" : "Add"}</button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm(fields));
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Fragment key={item.id}>
              <tr>
                {fields.map((f) => (
                  <td key={f.name}>{item[f.name]}</td>
                ))}
                <td>
                  <button onClick={() => handleEdit(item)}>Edit</button>
                  <button onClick={() => handleDelete(item.id)}>Delete</button>
                  {assetType && (
                    <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      Docs
                    </button>
                  )}
                </td>
              </tr>
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
  );
}
