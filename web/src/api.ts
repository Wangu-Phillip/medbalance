import axios from "axios";
import type { StockAnalysisResponse } from "./types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const firebaseBaseURL = 
  import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
  "http://localhost:5001/medbalance-ai/us-central1";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Gemini AI Analysis API
export const geminiAPI = axios.create({
  baseURL: firebaseBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout for AI analysis
});

/**
 * Generate AI-powered stock analysis using Gemini
 * @param districtId - District identifier
 * @param districtName - District name
 * @param medicines - Array of medicine records with inventory data
 * @param facilities - Array of facility records
 * @param allocations - Array of allocation records
 * @returns StockAnalysisResponse with forecasts, recommendations, and insights
 */
export async function generateStockAnalysis(
  districtId: string,
  districtName: string,
  medicines: any[],
  facilities: any[],
  allocations: any[]
): Promise<StockAnalysisResponse> {
  try {
    const response = await geminiAPI.post("/generateStockAnalysis", {
      districtId,
      districtName,
      medicines,
      facilities,
      allocations,
    });

    if (response.data.success) {
      return response.data.data as StockAnalysisResponse;
    } else {
      throw new Error(response.data.error || "Failed to generate analysis");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.details ||
        "Failed to connect to AI analysis service"
      );
    }
    throw error;
  }
}
