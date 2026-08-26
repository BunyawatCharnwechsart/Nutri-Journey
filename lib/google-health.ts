import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const HEALTH_API_BASE = "https://health.googleapis.com/v4";

const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
].join(" ");

// ============================================================================
// Types
// ============================================================================

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface GoogleIdentity {
  name: string;
  legacyUserId?: string;
  healthUserId?: string;
}

export interface CivilTime {
  date: { year: number; month: number; day: number };
  time: { hours: number; minutes?: number; seconds?: number; nanos?: number };
}

export interface DataPoint {
  name?: string;
  dataSource?: Record<string, unknown>;
  steps?: {
    interval: { startTime: string; endTime: string };
    count: string;
  };
  distance?: {
    interval: { startTime: string; endTime: string };
    millimeters: string;
  };
  activeEnergyBurned?: {
    interval: { startTime: string; endTime: string };
    kcal: string;
  };
  weight?: {
    sampleTime: { physicalTime: string };
    weightGrams: number;
  };
  sleep?: {
    interval: { startTime: string; endTime: string };
    type: string;
    stages?: Array<{
      startTime: string;
      endTime: string;
      type: string;
    }>;
    summary?: {
      minutesInSleepPeriod: string;
      minutesAsleep: string;
      minutesAwake: string;
      stagesSummary: Array<{
        type: string;
        minutes: string;
        count?: string;
      }>;
    };
  };
  heartRate?: {
    sampleTime: { physicalTime: string };
    bpm: number;
  };
}

export interface RollupDataPoint {
  civilStartTime?: CivilTime;
  civilEndTime?: CivilTime;
  startTime?: string;
  endTime?: string;
  steps?: { countSum: string };
  totalCalories?: { kcalSum: string };
  heartRate?: { avgBpm: number };
}

export interface DailyMetrics {
  isoDate: string;
  steps: number;
  distanceMeters: number;
  kcal: number;
  totalCalories: number;
}

export interface WeightLog {
  date: string;
  weightKg: number;
  physicalTime: string;
}

export interface SleepSummary {
  date: string;
  startTime: string;
  endTime: string;
  minutesAsleep: number;
  minutesAwake: number;
  stagesSummary: Array<{ type: string; minutes: number }>;
}

export interface HeartRateSummary {
  date: string;
  avgBpm: number;
}

// ============================================================================
// Errors
// ============================================================================

export class GoogleHealthError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "GoogleHealthError";
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new GoogleHealthError(`Missing env variable: ${name}`);
  }
  return value;
}

function toCivilTime(date: Date): CivilTime {
  return {
    date: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  };
}

function civilTimeToEndOfDay(date: Date): CivilTime {
  return {
    date: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    },
    time: { hours: 23, minutes: 59, seconds: 59, nanos: 0 },
  };
}

function isoToStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00Z`;
}

function isoToEndOfDay(dateStr: string): string {
  return `${dateStr}T23:59:59Z`;
}

// ============================================================================
// OAuth Functions
// ============================================================================

export function getGoogleAuthUrl(state: string): string {
  const clientId = getEnvOrThrow("GOOGLE_HEALTH_CLIENT_ID");
  const redirectUri = getEnvOrThrow("GOOGLE_HEALTH_REDIRECT_URI");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const clientId = getEnvOrThrow("GOOGLE_HEALTH_CLIENT_ID");
  const clientSecret = getEnvOrThrow("GOOGLE_HEALTH_CLIENT_SECRET");
  const redirectUri = getEnvOrThrow("GOOGLE_HEALTH_REDIRECT_URI");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new GoogleHealthError(
      `Token exchange failed: ${res.status} ${error}`,
      res.status
    );
  }

  return res.json() as Promise<GoogleTokens>;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const clientId = getEnvOrThrow("GOOGLE_HEALTH_CLIENT_ID");
  const clientSecret = getEnvOrThrow("GOOGLE_HEALTH_CLIENT_SECRET");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new GoogleHealthError(
      `Token refresh failed: ${res.status} ${error}`,
      res.status
    );
  }

  return res.json() as Promise<GoogleTokens>;
}

export async function revokeGoogleAccess(token: string): Promise<void> {
  const res = await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.text();
    throw new GoogleHealthError(
      `Revoke failed: ${res.status} ${error}`,
      res.status
    );
  }
}

// ============================================================================
// Google Health API Functions
// ============================================================================

async function healthApiGet(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${HEALTH_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new GoogleHealthError(
      `Health API GET failed: ${res.status} ${error}`,
      res.status
    );
  }

  return res.json();
}

async function healthApiPost(
  accessToken: string,
  path: string,
  body: unknown
): Promise<unknown> {
  const res = await fetch(`${HEALTH_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new GoogleHealthError(
      `Health API POST failed: ${res.status} ${error}`,
      res.status
    );
  }

  return res.json();
}

export async function getGoogleIdentity(
  accessToken: string
): Promise<GoogleIdentity> {
  const data = (await healthApiGet(accessToken, "/users/me/identity")) as {
    name?: string;
    legacyUserId?: string;
    healthUserId?: string;
  };

  return {
    name: data.name ?? "",
    legacyUserId: data.legacyUserId,
    healthUserId: data.healthUserId,
  };
}

// ---- Steps ----

export async function fetchStepsData(
  accessToken: string,
  from: string,
  to: string
): Promise<DataPoint[]> {
  const allPoints: DataPoint[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {
      filter: `steps.interval.start_time >= "${isoToStartOfDay(from)}" AND steps.interval.start_time < "${isoToEndOfDay(to)}"`,
      pageSize: "5000",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = (await healthApiGet(
      accessToken,
      "/users/me/dataTypes/steps/dataPoints:reconcile",
      params
    )) as { dataPoints?: DataPoint[]; nextPageToken?: string };

    if (data.dataPoints) {
      allPoints.push(...data.dataPoints);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allPoints;
}

// ---- Distance ----

export async function fetchDistanceData(
  accessToken: string,
  from: string,
  to: string
): Promise<DataPoint[]> {
  const allPoints: DataPoint[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {
      filter: `distance.interval.start_time >= "${isoToStartOfDay(from)}" AND distance.interval.start_time < "${isoToEndOfDay(to)}"`,
      pageSize: "5000",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = (await healthApiGet(
      accessToken,
      "/users/me/dataTypes/distance/dataPoints:reconcile",
      params
    )) as { dataPoints?: DataPoint[]; nextPageToken?: string };

    if (data.dataPoints) {
      allPoints.push(...data.dataPoints);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allPoints;
}

// ---- Active Energy Burned ----

export async function fetchActiveCaloriesData(
  accessToken: string,
  from: string,
  to: string
): Promise<DataPoint[]> {
  const allPoints: DataPoint[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {
      filter: `active_energy_burned.interval.start_time >= "${isoToStartOfDay(from)}" AND active_energy_burned.interval.start_time < "${isoToEndOfDay(to)}"`,
      pageSize: "5000",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = (await healthApiGet(
      accessToken,
      "/users/me/dataTypes/active-energy-burned/dataPoints:reconcile",
      params
    )) as { dataPoints?: DataPoint[]; nextPageToken?: string };

    if (data.dataPoints) {
      allPoints.push(...data.dataPoints);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allPoints;
}

// ---- Total Calories (dailyRollUp) ----

export async function fetchTotalCaloriesData(
  accessToken: string,
  from: string,
  to: string
): Promise<RollupDataPoint[]> {
  const startDate = new Date(`${from}T00:00:00Z`);
  const endDate = new Date(`${to}T00:00:00Z`);

  const data = (await healthApiPost(
    accessToken,
    "/users/me/dataTypes/total-calories/dataPoints:dailyRollUp",
    {
      range: {
        start: toCivilTime(startDate),
        end: civilTimeToEndOfDay(endDate),
      },
      windowSizeDays: 1,
    }
  )) as { rollupDataPoints?: RollupDataPoint[] };

  return data.rollupDataPoints ?? [];
}

// ---- Weight ----

export async function fetchWeightData(
  accessToken: string,
  from: string,
  to: string
): Promise<DataPoint[]> {
  const allPoints: DataPoint[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {
      filter: `weight.sample_time.physical_time >= "${isoToStartOfDay(from)}" AND weight.sample_time.physical_time < "${isoToEndOfDay(to)}"`,
      pageSize: "5000",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = (await healthApiGet(
      accessToken,
      "/users/me/dataTypes/weight/dataPoints",
      params
    )) as { dataPoints?: DataPoint[]; nextPageToken?: string };

    if (data.dataPoints) {
      allPoints.push(...data.dataPoints);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allPoints;
}

// ---- Sleep ----

export async function fetchSleepData(
  accessToken: string,
  from: string,
  to: string
): Promise<DataPoint[]> {
  const allPoints: DataPoint[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {
      filter: `sleep.interval.start_time >= "${isoToStartOfDay(from)}" AND sleep.interval.start_time < "${isoToEndOfDay(to)}"`,
      pageSize: "25",
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = (await healthApiGet(
      accessToken,
      "/users/me/dataTypes/sleep/dataPoints:reconcile",
      params
    )) as { dataPoints?: DataPoint[]; nextPageToken?: string };

    if (data.dataPoints) {
      allPoints.push(...data.dataPoints);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allPoints;
}

// ---- Heart Rate (dailyRollUp) ----

export async function fetchHeartRateData(
  accessToken: string,
  from: string,
  to: string
): Promise<RollupDataPoint[]> {
  const startDate = new Date(`${from}T00:00:00Z`);
  const endDate = new Date(`${to}T00:00:00Z`);

  const data = (await healthApiPost(
    accessToken,
    "/users/me/dataTypes/heart-rate/dataPoints:dailyRollUp",
    {
      range: {
        start: toCivilTime(startDate),
        end: civilTimeToEndOfDay(endDate),
      },
      windowSizeDays: 1,
    }
  )) as { rollupDataPoints?: RollupDataPoint[] };

  return data.rollupDataPoints ?? [];
}

// ============================================================================
// Data Processing Functions
// ============================================================================

export function processStepsData(dataPoints: DataPoint[]): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const point of dataPoints) {
    if (!point.steps) continue;
    const date = point.steps.interval.startTime.slice(0, 10);
    const count = parseInt(point.steps.count, 10) || 0;
    byDate.set(date, (byDate.get(date) ?? 0) + count);
  }

  return byDate;
}

export function processDistanceData(
  dataPoints: DataPoint[]
): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const point of dataPoints) {
    if (!point.distance) continue;
    const date = point.distance.interval.startTime.slice(0, 10);
    const meters = (parseInt(point.distance.millimeters, 10) || 0) / 1000;
    byDate.set(date, (byDate.get(date) ?? 0) + meters);
  }

  return byDate;
}

export function processActiveCaloriesData(
  dataPoints: DataPoint[]
): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const point of dataPoints) {
    if (!point.activeEnergyBurned) continue;
    const date = point.activeEnergyBurned.interval.startTime.slice(0, 10);
    const kcal = parseFloat(point.activeEnergyBurned.kcal) || 0;
    byDate.set(date, (byDate.get(date) ?? 0) + kcal);
  }

  return byDate;
}

export function processTotalCaloriesData(
  rollupPoints: RollupDataPoint[]
): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const point of rollupPoints) {
    if (!point.civilStartTime || !point.totalCalories) continue;
    const { year, month, day } = point.civilStartTime.date;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const kcal = parseFloat(point.totalCalories.kcalSum) || 0;
    byDate.set(date, kcal);
  }

  return byDate;
}

export function processWeightData(dataPoints: DataPoint[]): WeightLog[] {
  const logs: WeightLog[] = [];

  for (const point of dataPoints) {
    if (!point.weight) continue;
    const date = point.weight.sampleTime.physicalTime.slice(0, 10);
    const weightKg = (point.weight.weightGrams || 0) / 1000;
    logs.push({
      date,
      weightKg: Math.round(weightKg * 10) / 10,
      physicalTime: point.weight.sampleTime.physicalTime,
    });
  }

  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

export function processSleepData(dataPoints: DataPoint[]): SleepSummary[] {
  const summaries: SleepSummary[] = [];

  for (const point of dataPoints) {
    if (!point.sleep?.summary) continue;
    const startTime = point.sleep.interval.startTime;
    const endTime = point.sleep.interval.endTime;
    const date = startTime.slice(0, 10);

    summaries.push({
      date,
      startTime,
      endTime,
      minutesAsleep: parseInt(point.sleep.summary.minutesAsleep, 10) || 0,
      minutesAwake: parseInt(point.sleep.summary.minutesAwake, 10) || 0,
      stagesSummary: (point.sleep.summary.stagesSummary ?? []).map((s) => ({
        type: s.type,
        minutes: parseInt(s.minutes, 10) || 0,
      })),
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}

export function processHeartRateData(
  rollupPoints: RollupDataPoint[]
): HeartRateSummary[] {
  const summaries: HeartRateSummary[] = [];

  for (const point of rollupPoints) {
    if (!point.civilStartTime || !point.heartRate) continue;
    const { year, month, day } = point.civilStartTime.date;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    summaries.push({
      date,
      avgBpm: point.heartRate.avgBpm,
    });
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeDailyMetrics(
  stepsMap: Map<string, number>,
  distanceMap: Map<string, number>,
  activeCalMap: Map<string, number>,
  totalCalMap: Map<string, number>
): DailyMetrics[] {
  const allDates = new Set([
    ...stepsMap.keys(),
    ...distanceMap.keys(),
    ...activeCalMap.keys(),
    ...totalCalMap.keys(),
  ]);

  const metrics: DailyMetrics[] = [];

  for (const date of allDates) {
    metrics.push({
      isoDate: date,
      steps: stepsMap.get(date) ?? 0,
      distanceMeters: Math.round((distanceMap.get(date) ?? 0) * 100) / 100,
      kcal: Math.round((activeCalMap.get(date) ?? 0) * 100) / 100,
      totalCalories: Math.round((totalCalMap.get(date) ?? 0) * 100) / 100,
    });
  }

  return metrics.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

// ============================================================================
// Token Management
// ============================================================================

export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data: connection, error } = await supabase
    .from("google_health_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !connection) {
    throw new GoogleHealthError("Google Health ไม่ได้เชื่อมต่อ");
  }

  const now = new Date();
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null;

  if (expiresAt && expiresAt > now) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new GoogleHealthError("Refresh token ไม่มีอยู่ — ต้องเชื่อมต่อใหม่");
  }

  const tokens = await refreshAccessToken(connection.refresh_token);

  const newExpiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

  await supabase
    .from("google_health_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", userId);

  return tokens.access_token;
}
