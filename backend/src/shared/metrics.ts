const requests: number[] = [];
const supabase: number[] = [];
function record(samples: number[], value: number) { if (samples.length >= 10000)
    samples.shift(); samples.push(value); }
export const recordRequest = (ms: number) => record(requests, ms);
export const recordSupabase = (ms: number) => record(supabase, ms);
function percentiles(values: number[]) { const sorted = [...values].sort((a, b) => a - b); return Object.fromEntries([50, 95, 99].map(p => [`p${p}`, sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.round(p / 100 * (sorted.length - 1)))]! * 100) / 100 : null])); }
export function metricsSnapshot() { return { sample_size: requests.length, request_duration_ms: percentiles(requests), supabase_query_duration_ms: percentiles(supabase), supabase_sample_size: supabase.length, sample_window: 'last 10000 observations per process' }; }
