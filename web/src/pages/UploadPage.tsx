import { useState } from "react";
import { api } from "../api";

const samplePayload = {
  districts: [{ name: "Gaborone" }, { name: "Francistown" }, { name: "Maun" }],
  medicines: [{ name: "Amoxicillin" }, { name: "Paracetamol" }],
  usage_history: [
    {
      district_name: "Gaborone",
      medicine_name: "Amoxicillin",
      month: "2025-10-01",
      quantity_used: 120,
    },
    {
      district_name: "Gaborone",
      medicine_name: "Amoxicillin",
      month: "2025-11-01",
      quantity_used: 135,
    },
    {
      district_name: "Gaborone",
      medicine_name: "Amoxicillin",
      month: "2025-12-01",
      quantity_used: 128,
    },
    {
      district_name: "Francistown",
      medicine_name: "Amoxicillin",
      month: "2025-10-01",
      quantity_used: 80,
    },
    {
      district_name: "Francistown",
      medicine_name: "Amoxicillin",
      month: "2025-11-01",
      quantity_used: 88,
    },
    {
      district_name: "Francistown",
      medicine_name: "Amoxicillin",
      month: "2025-12-01",
      quantity_used: 92,
    },
    {
      district_name: "Maun",
      medicine_name: "Amoxicillin",
      month: "2025-10-01",
      quantity_used: 50,
    },
    {
      district_name: "Maun",
      medicine_name: "Amoxicillin",
      month: "2025-11-01",
      quantity_used: 56,
    },
    {
      district_name: "Maun",
      medicine_name: "Amoxicillin",
      month: "2025-12-01",
      quantity_used: 60,
    },
  ],
  stock_levels: [
    {
      district_name: "Gaborone",
      medicine_name: "Amoxicillin",
      as_of_month: "2025-12-01",
      quantity_in_stock: 180,
    },
    {
      district_name: "Francistown",
      medicine_name: "Amoxicillin",
      as_of_month: "2025-12-01",
      quantity_in_stock: 100,
    },
    {
      district_name: "Maun",
      medicine_name: "Amoxicillin",
      as_of_month: "2025-12-01",
      quantity_in_stock: 70,
    },
  ],
};

export function UploadPage() {
  const [payload, setPayload] = useState(
    JSON.stringify(samplePayload, null, 2),
  );
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function onUpload() {
    setLoading(true);
    setResult("");
    try {
      const parsed = JSON.parse(payload);
      const response = await api.post("/data/upload", parsed);
      setResult(`Upload successful: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setResult(
        `Upload failed: ${error?.response?.data?.detail || error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSeed() {
    setSeeding(true);
    setResult("");
    try {
      const response = await api.post("/data/seed");
      setResult(`Seed successful: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setResult(
        `Seed failed: ${error?.response?.data?.detail || error.message}`,
      );
    } finally {
      setSeeding(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Data Upload</h2>
      <p className="text-sm text-slate-600">
        Use the sample JSON or paste your own payload, then upload.
      </p>
      <textarea
        className="h-80 w-full rounded-md border border-slate-300 p-3 font-mono text-sm"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={onUpload}
          disabled={loading || seeding}
          className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Uploading..." : "Upload Data"}
        </button>
        <button
          onClick={onSeed}
          disabled={loading || seeding}
          className="rounded-md bg-slate-700 px-4 py-2 text-white disabled:opacity-60"
        >
          {seeding ? "Seeding..." : "Load Sample Data"}
        </button>
      </div>
      {result && (
        <pre className="rounded-md bg-white p-3 text-sm shadow-sm">
          {result}
        </pre>
      )}
    </section>
  );
}
