import { HttpError } from './errors.js';
export function cents(value: unknown): bigint {
    const text = String(value);
    if (!/^[+-]?\d+(\.\d{1,2})?$/.test(text))
        throw new HttpError(422, 'Amount has too many decimal places');
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^[+-]/, '').split('.');
    return (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'))) * (negative ? -1n : 1n);
}
export function decimal(value: bigint): string { const n = value < 0n ? -value : value; return `${value < 0n ? '-' : ''}${n / 100n}.${String(n % 100n).padStart(2, '0')}`; }
export function providerAmount(value: unknown): number { const n = cents(value); if (n < 100n)
    throw new HttpError(422, 'Donation amount must be at least 1 USD'); if (n > BigInt(Number.MAX_SAFE_INTEGER))
    throw new HttpError(422, 'Amount exceeds provider limits'); return Number(n); }
export function mergePayment(existing: Record<string, unknown> | undefined, incoming: Record<string, unknown>) {
    if (!existing)
        return { ...incoming, refunded_amount: '0' };
    const succeeded = ['succeeded', 'partially_refunded', 'refunded'].includes(String(existing.status));
    if (succeeded && incoming.status === 'failed')
        return existing;
    return { ...existing, ...incoming, refunded_amount: existing.refunded_amount, ...(succeeded && ['partially_refunded', 'refunded'].includes(String(existing.status)) ? { status: existing.status } : {}) };
}
