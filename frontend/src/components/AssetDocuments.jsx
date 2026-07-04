import { useEffect, useState } from "react";
import apiClient from "../api/client";

const TYPE_CONFIG = {
  bill:  { label: "Bills / Invoices", icon: "🧾", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
  photo: { label: "Photos",           icon: "📷", accept: "image/*" },
};

export default function AssetDocuments({ assetType, assetId }) {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");

  function load() {
    apiClient
      .get(`/documents/by-asset/${assetType}/${assetId}`)
      .then((res) => setDocuments(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load documents"));
  }

  useEffect(() => { load(); }, [assetType, assetId]);

  async function handleUpload(e, docType) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(docType);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    try {
      await apiClient.post(`/documents/by-asset/${assetType}/${assetId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    }
    e.target.value = "";
    setUploading(null);
  }

  async function handleDelete(docId) {
    await apiClient.delete(`/documents/${docId}`);
    load();
  }

  async function handleOpen(doc) {
    const response = await apiClient.get(doc.url, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    window.open(blobUrl, "_blank");
  }

  return (
    <div className="documents-panel">
      {error && <p className="error">{error}</p>}

      {["bill", "photo"].map((docType) => {
        const cfg = TYPE_CONFIG[docType];
        const docs = documents.filter((d) => d.doc_type === docType);
        return (
          <div key={docType} className="doc-section">
            <div className="doc-section-header">
              <span>{cfg.icon} {cfg.label}</span>
              <label className="upload-btn">
                {uploading === docType ? "Uploading…" : "+ Add"}
                <input
                  type="file"
                  accept={cfg.accept}
                  style={{ display: "none" }}
                  onChange={(e) => handleUpload(e, docType)}
                  disabled={uploading !== null}
                />
              </label>
            </div>
            {docs.length === 0 ? (
              <p className="doc-empty">No {cfg.label.toLowerCase()} uploaded yet.</p>
            ) : (
              <ul className="documents-list">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleOpen(doc); }}>
                      {doc.original_filename}
                    </a>
                    <button onClick={() => handleDelete(doc.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
