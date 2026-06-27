import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function AssetDocuments({ assetType, assetId }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  function load() {
    apiClient
      .get(`/documents/by-asset/${assetType}/${assetId}`)
      .then((res) => setDocuments(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load documents"));
  }

  useEffect(() => {
    load();
  }, [assetType, assetId]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient.post(`/documents/by-asset/${assetType}/${assetId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    }
    e.target.value = "";
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
      <input type="file" onChange={handleUpload} />
      <ul className="documents-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleOpen(doc); }}>
              {doc.original_filename}
            </a>
            <button onClick={() => handleDelete(doc.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
