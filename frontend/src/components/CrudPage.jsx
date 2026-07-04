import { Fragment, useEffect, useState } from "react";
import apiClient from "../api/client";
import AssetDocuments from "./AssetDocuments";

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

  function load() {
    apiClient
      .get(endpoint)
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load"));
  }

  useEffect(() => { load(); }, [endpoint]);

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

  async function handleDelete(id) {
    if (editingId === id) cancelEdit();
    await apiClient.delete(`${endpoint}/${id}`);
    load();
  }

  return (
    <div>
      <h1>{title}</h1>
      {error && <p className="error">{error}</p>}

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

      <table className="data-table">
        <thead>
          <tr>
            {fields.map((f) => <th key={f.name}>{f.label}</th>)}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
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
  );
}
