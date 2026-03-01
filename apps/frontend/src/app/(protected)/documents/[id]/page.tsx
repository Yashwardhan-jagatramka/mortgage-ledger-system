"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import StatusBadge from "@/components/documents/StatusBadge";

type Document = {
  id: string;
  fileName: string;
  status: string;
  confidence: number;
  progress?: number;
  createdAt: string;
};

type Transaction = {
  id: string;
  docNo: string;
  executionDate?: string;
  registrationDate?: string;
  surveyNumbers?: string[];
  plotNumber?: string;
  nature: string;
  buyerName?: string;
  sellerName?: string;
  considerationValue: string;
  marketValue: string;
};

export default function DocumentDetailsPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Filters
  const [docNoFilter, setDocNoFilter] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [surveyFilter, setSurveyFilter] = useState("");
  const [plotFilter, setPlotFilter] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  // ---------------- Fetch Document ----------------
  const fetchDocument = async () => {
    const res = await axios.get(
      `http://localhost:4000/documents/${documentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setDocument(res.data);
  };

  // ---------------- Fetch Transactions ----------------
  const fetchTransactions = async () => {
    setLoading(true);

    const res = await axios.get(
      `http://localhost:4000/documents/${documentId}/transactions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          docNo: docNoFilter || undefined,
          buyerName: buyerFilter || undefined,
          sellerName: sellerFilter || undefined,
          surveyNumber: surveyFilter || undefined,
          plotNumber: plotFilter || undefined,
        },
      }
    );

    setTransactions(res.data.data);
    setLoading(false);
  };

  // ---------------- Initial Load ----------------
  useEffect(() => {
    if (!documentId) return;

    fetchDocument();
    fetchTransactions();
  }, [documentId]);

  // ---------------- 🔥 Real-Time Polling ----------------
  useEffect(() => {
    if (!document) return;

    if (
      document.status === "PENDING" ||
      document.status === "PROCESSING"
    ) {
      const interval = setInterval(async () => {
        const res = await axios.get(
          `http://localhost:4000/documents/${documentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDocument(res.data);

        // If processing finished → refresh transactions
        if (
          res.data.status === "COMPLETED" ||
          res.data.status === "MANUAL_REQUIRED"
        ) {
          fetchTransactions();
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [document?.status]);

  // ---------------- Filters Effect ----------------
  useEffect(() => {
    if (!documentId) return;

    const debounce = setTimeout(fetchTransactions, 400);
    return () => clearTimeout(debounce);
  }, [
    documentId,
    docNoFilter,
    buyerFilter,
    sellerFilter,
    surveyFilter,
    plotFilter,
  ]);

  // ---------------- Handle Edit Changes ----------------
  const handleChange = (
    id: string,
    field: string,
    value: any
  ) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === id ? { ...tx, [field]: value } : tx
      )
    );
  };

  // ---------------- Submit Manual Override ----------------
  const handleSubmit = async () => {
    try {
      await axios.put(
        `http://localhost:4000/documents/${documentId}/manual`,
        { transactions },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditMode(false);
      fetchDocument();
      fetchTransactions();
    } catch (err) {
      alert("Failed to save changes");
    }
  };

  if (!document) return null;

  return (
    <div className="space-y-8">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">
            {document.fileName}
          </h2>

          <div className="flex gap-4 mt-3 items-center">
            <StatusBadge status={document.status} />

            {/* 🔥 Processing Progress */}
            <div className="w-64">
              <progress
                className="progress progress-primary w-full"
                value={document.progress || 0}
                max="100"
              />
              <div className="text-xs mt-1 opacity-60">
                {document.progress || 0}% processing
              </div>
            </div>

            {/* Confidence */}
            <div className="w-64">
              <progress
                className="progress progress-success w-full"
                value={document.confidence}
                max="100"
              />
              <div className="text-xs mt-1 opacity-60">
                {document.confidence}% confidence
              </div>
            </div>

            <div className="text-sm opacity-60">
              Created:{" "}
              {new Date(
                document.createdAt
              ).toLocaleDateString()}
            </div>
          </div>
        </div>

        {document.status === "MANUAL_REQUIRED" &&
          !editMode && (
            <button
              className="btn btn-error"
              onClick={() => setEditMode(true)}
            >
              Manual Override
            </button>
          )}
      </div>

      {/* ================= FILTERS ================= */}
      {!editMode && (
        <div className="card bg-base-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">
            Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="input input-bordered"
              placeholder="Document No"
              value={docNoFilter}
              onChange={(e) =>
                setDocNoFilter(e.target.value)
              }
            />
            <input
              className="input input-bordered"
              placeholder="Buyer Name"
              value={buyerFilter}
              onChange={(e) =>
                setBuyerFilter(e.target.value)
              }
            />
            <input
              className="input input-bordered"
              placeholder="Seller Name"
              value={sellerFilter}
              onChange={(e) =>
                setSellerFilter(e.target.value)
              }
            />
            <input
              className="input input-bordered"
              placeholder="Survey No"
              value={surveyFilter}
              onChange={(e) =>
                setSurveyFilter(e.target.value)
              }
            />
            <input
              className="input input-bordered"
              placeholder="Plot No"
              value={plotFilter}
              onChange={(e) =>
                setPlotFilter(e.target.value)
              }
            />
          </div>
        </div>
      )}

      {/* ================= TRANSACTIONS ================= */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="text-xl font-semibold mb-4">
            Transactions ({transactions.length})
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              {document.status === "PENDING" ||
              document.status === "PROCESSING"
                ? "Processing document..."
                : "No transactions found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Doc No</th>
                    <th>Execution</th>
                    <th>Registration</th>
                    <th>Survey</th>
                    <th>Plot</th>
                    <th>Nature</th>
                    <th>Buyer</th>
                    <th>Seller</th>
                    <th>Consideration</th>
                    <th>Market</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.docNo}</td>
                      <td>{tx.executionDate || "-"}</td>
                      <td>{tx.registrationDate || "-"}</td>
                      <td>
                        {Array.isArray(tx.surveyNumbers)
                          ? tx.surveyNumbers.join(", ")
                          : "-"}
                      </td>
                      <td>{tx.plotNumber || "-"}</td>
                      <td>{tx.nature}</td>
                      <td>{tx.buyerName || "-"}</td>
                      <td>{tx.sellerName || "-"}</td>
                      <td>{tx.considerationValue}</td>
                      <td>{tx.marketValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editMode && (
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn btn-outline"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-success"
                onClick={handleSubmit}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}