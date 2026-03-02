"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import StatusBadge from "@/components/documents/StatusBadge";

type Document = {
  id: string;
  fileName: string;
  fileUrl: string;
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
  buyerNameEnglish?: string;
  sellerNameEnglish?: string;
  natureEnglish?: string;
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

  const [docNoFilter, setDocNoFilter] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [surveyFilter, setSurveyFilter] = useState("");
  const [plotFilter, setPlotFilter] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const fetchDocument = async () => {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setDocument(res.data);
  };

  const fetchTransactions = async () => {
    setLoading(true);

    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/transactions`,
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

  useEffect(() => {
    if (!documentId) return;
    fetchDocument();
    fetchTransactions();
  }, [documentId]);

  useEffect(() => {
    if (!document) return;

    if (
      document.status === "PENDING" ||
      document.status === "PROCESSING"
    ) {
      const interval = setInterval(async () => {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setDocument(res.data);

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

  // 🔥 Filters effect restored
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

  const handleSubmit = async () => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/manual`,
        { transactions },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditMode(false);
      fetchDocument();
      fetchTransactions();
    } catch {
      alert("Failed to save changes");
    }
  };

  if (!document) return null;

  return (
    <div className="h-[90vh] flex gap-6">
      {/* LEFT: PDF */}
      <div className="w-1/2 border rounded-xl shadow-lg overflow-hidden bg-base-100">
        <div className="p-4 border-b font-semibold bg-base-200">
          PDF Preview
        </div>
        {document.fileUrl ? (
          <iframe src={document.fileUrl} className="w-full h-full" />
        ) : (
          <div className="p-6 text-center opacity-60">
            PDF not available
          </div>
        )}
      </div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 flex flex-col space-y-6 overflow-auto">
        <div>
          <h2 className="text-2xl font-bold">
            {document.fileName}
          </h2>

          <div className="flex gap-4 mt-3 items-center flex-wrap">
            <StatusBadge status={document.status} />

            <div className="w-56">
              <progress
                className="progress progress-primary w-full"
                value={document.progress || 0}
                max="100"
              />
              <div className="text-xs mt-1 opacity-60">
                {document.progress || 0}% processing
              </div>
            </div>

            <div className="w-56">
              <progress
                className="progress progress-success w-full"
                value={document.confidence}
                max="100"
              />
              <div className="text-xs mt-1 opacity-60">
                {document.confidence}% confidence
              </div>
            </div>

            {/* 🔥 Manual Override ALWAYS AVAILABLE */}
            {!editMode && (
              <button
                className="btn btn-error ml-auto"
                onClick={() => setEditMode(true)}
              >
                Manual Override
              </button>
            )}
          </div>
        </div>

        {/* 🔥 FILTERS RESTORED */}
        {!editMode && (
          <div className="card bg-base-100 shadow-sm p-5">
            <h3 className="font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input input-bordered" placeholder="Document No" value={docNoFilter} onChange={(e) => setDocNoFilter(e.target.value)} />
              <input className="input input-bordered" placeholder="Buyer Name" value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} />
              <input className="input input-bordered" placeholder="Seller Name" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} />
              <input className="input input-bordered" placeholder="Survey No" value={surveyFilter} onChange={(e) => setSurveyFilter(e.target.value)} />
              <input className="input input-bordered" placeholder="Plot No" value={plotFilter} onChange={(e) => setPlotFilter(e.target.value)} />
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-4">
              Transactions ({transactions.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra text-sm">
                  <thead>
                    <tr>
                      <th>Doc No</th>
                      <th>Buyer</th>
                      <th>Seller</th>
                      <th>Survey</th>
                      <th>Plot</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.docNo || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id ? { ...t, docNo: e.target.value } : t
                                )
                              )
                            } />
                        ) : tx.docNo}</td>

                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.buyerName || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id ? { ...t, buyerName: e.target.value } : t
                                )
                              )
                            } />
                        ) : tx.buyerNameEnglish || tx.buyerName || "-"}</td>

                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.sellerName || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id ? { ...t, sellerName: e.target.value } : t
                                )
                              )
                            } />
                        ) : tx.sellerNameEnglish || tx.sellerName || "-"}</td>

                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.surveyNumbers?.join(", ") || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id
                                    ? {
                                        ...t,
                                        surveyNumbers: e.target.value
                                          .split(",")
                                          .map(s => s.trim())
                                          .filter(Boolean),
                                      }
                                    : t
                                )
                              )
                            } />
                        ) : tx.surveyNumbers?.join(", ") || "-"}</td>

                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.plotNumber || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id ? { ...t, plotNumber: e.target.value } : t
                                )
                              )
                            } />
                        ) : tx.plotNumber || "-"}</td>

                        <td>{editMode ? (
                          <input className="input input-sm input-bordered w-full"
                            value={tx.considerationValue || ""}
                            onChange={(e) =>
                              setTransactions(prev =>
                                prev.map(t =>
                                  t.id === tx.id ? { ...t, considerationValue: e.target.value } : t
                                )
                              )
                            } />
                        ) : tx.considerationValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editMode && (
              <div className="flex justify-end gap-4 mt-6">
                <button className="btn btn-outline" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handleSubmit}>Save Changes</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}