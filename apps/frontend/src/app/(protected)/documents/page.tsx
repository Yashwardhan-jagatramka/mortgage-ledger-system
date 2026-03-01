"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import StatusBadge from "@/components/documents/StatusBadge";

type Document = {
  id: string;
  fileName: string;
  status: string;
  confidence: number;
  createdAt: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  // -----------------------------
  // Fetch Documents
  // -----------------------------
  const fetchDocuments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:4000/documents",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setDocuments(res.data.data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // -----------------------------
  // Handle Upload
  // -----------------------------
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      await axios.post(
        "http://localhost:4000/documents/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await fetchDocuments();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // -----------------------------
  // Handle Delete
  // -----------------------------
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `http://localhost:4000/documents/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh list after deletion
      fetchDocuments();
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">
          My Documents
        </h2>

        <label className="btn btn-primary">
          {uploading
            ? "Uploading..."
            : "Upload Document"}
          <input
            type="file"
            accept="application/pdf"
            hidden
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* ================= DOCUMENT LIST ================= */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="link link-hover"
                        >
                          {doc.fileName}
                        </Link>
                      </td>

                      <td>
                        <StatusBadge
                          status={doc.status}
                        />
                      </td>

                      <td>
                        <div className="w-40">
                          <progress
                            className="progress progress-primary w-full"
                            value={doc.confidence}
                            max="100"
                          />
                          <div className="text-xs mt-1 opacity-60">
                            {doc.confidence}%
                          </div>
                        </div>
                      </td>

                      <td>
                        {new Date(
                          doc.createdAt
                        ).toLocaleDateString()}
                      </td>

                      <td>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() =>
                            handleDelete(doc.id)
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}