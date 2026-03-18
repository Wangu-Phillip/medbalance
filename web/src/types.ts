export type ForecastResponse = {
  district_id: number;
  medicine_id: number;
  target_month: string;
  predicted_demand: number;
  model_used: string;
};

export type AllocationItem = {
  run_id: string;
  district_id: number;
  medicine_id: number;
  target_month: string;
  predicted_demand: number;
  allocated_quantity: number;
  shortage: number;
};

export type MetricsSummary = {
  stock_out_rate: number;
  oversupply_rate: number;
  avg_shortage: number;
  avg_forecast_error: number;
};

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
};

// Gemini AI Response Types
export type DemandForecastPoint = {
  month: string;
  demand: number;
  forecast: number;
};

export type StockLevelAnalysis = {
  medicine: string;
  current: number;
  predicted: number;
  recommended: number;
};

export type AllocationRecommendationDetail = {
  medicine: string;
  currentStock: number;
  predictedDemand: number;
  recommendedAllocation: number;
  urgency: "critical" | "high" | "medium" | "low";
  reason: string;
};

export type ComparisonDataPoint = {
  medicine: string;
  demand: number;
  supply: number;
  gap: number;
};

export type StockAnalysisResponse = {
  demandForecast: DemandForecastPoint[];
  stockLevels: StockLevelAnalysis[];
  allocationRecommendations: AllocationRecommendationDetail[];
  comparisonData: ComparisonDataPoint[];
  insights: string[];
};
