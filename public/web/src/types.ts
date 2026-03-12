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
