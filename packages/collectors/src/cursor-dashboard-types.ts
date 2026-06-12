export type CursorBillingCycle = {
  start: string;
  end: string;
};

export type CursorUsagePlan = {
  enabled: boolean;
  used: number;
  limit: number;
  remaining: number;
  breakdown: {
    included: number;
    bonus: number;
    total: number;
  };
  usagePercentages: {
    autoModel: number;
    api: number;
    total: number;
  };
};

export type CursorUsageSummary = {
  billingCycle: CursorBillingCycle;
  membershipType: string;
  displayMessages: {
    autoModel: string;
    namedModel: string;
  };
  plan: CursorUsagePlan;
};

export type CursorUser = {
  id: number;
  name: string;
  email: string;
};

export type CursorDailyPoint = {
  date: string;
  tokens: number;
  requests: number;
};

export type CursorModelSlice = {
  model: string;
  tokens: number;
  requests: number;
  color: string;
};

export type CursorLiveDashboard = {
  summary: CursorUsageSummary;
  user: CursorUser | null;
  daily: CursorDailyPoint[];
  models: CursorModelSlice[];
  usageEventsCount: number;
  totalCycleTokens: number;
  fetchedAt: string;
};
