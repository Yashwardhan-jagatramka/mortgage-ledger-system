"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Document = {
  id: string;
  status: string;
};

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/documents`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDocuments(res.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // 🔥 Dynamic Counts
  const total = documents.length;

  const processing = documents.filter(
    (doc) =>
      doc.status === "PENDING" ||
      doc.status === "PROCESSING"
  ).length;

  const manualRequired = documents.filter(
    (doc) => doc.status === "MANUAL_REQUIRED"
  ).length;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="card bg-base-100 shadow-md p-6">
            <h3 className="text-sm opacity-60">
              Total Documents
            </h3>
            <p className="text-2xl font-bold mt-2">
              {total}
            </p>
          </div>

          <div className="card bg-base-100 shadow-md p-6">
            <h3 className="text-sm opacity-60">
              Processing
            </h3>
            <p className="text-2xl font-bold mt-2 text-warning">
              {processing}
            </p>
          </div>

          <div className="card bg-base-100 shadow-md p-6">
            <h3 className="text-sm opacity-60">
              Manual Required
            </h3>
            <p className="text-2xl font-bold mt-2 text-error">
              {manualRequired}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}