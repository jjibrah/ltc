import { z } from 'zod';
import { HttpError, providerError } from './errors.js';
export type Row = Record<string, unknown>;
export function rows(result: {
    data: unknown;
    error: {
        message?: string;
        code?: string;
    } | null;
}): Row[] { providerError(result.error); return (result.data || []) as Row[]; }
export function one(result: {
    data: unknown;
    error: {
        message?: string;
        code?: string;
    } | null;
}, detail: string): Row { const r = rows(result)[0]; if (!r)
    throw new HttpError(404, detail); return r; }
export function page(query: unknown, defaultLimit = 50, max = 200) { return z.object({ limit: z.coerce.number().int().min(1).max(max).default(defaultLimit), offset: z.coerce.number().int().min(0).default(0) }).parse(query); }
export const normalizedEmail = z.string().trim().toLowerCase().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
