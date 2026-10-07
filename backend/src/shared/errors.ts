export class HttpError extends Error {
    constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
export function providerError(error: {
    status?: number;
    code?: string;
    message?: string;
} | null): void {
    if (!error)
        return;
    const message = error.message?.toLowerCase() || '';
    if (error.code === '23505')
        throw new HttpError(409, 'Record already exists');
    if (error.code === '23514' || error.code === '22P02')
        throw new HttpError(422, 'Invalid input');
    if (error.code === '42501')
        throw new HttpError(403, message.includes('final active super admin') ? 'The final active super admin cannot be removed, demoted, or disabled' : 'Permission denied');
    if (error.code === 'P0002' || message.includes('target user not found'))
        throw new HttpError(404, 'User not found');
    if (message.includes('team profile not found'))
        throw new HttpError(404, 'One or more team profiles were not found');
    if (message.includes('100-profile limit'))
        throw new HttpError(409, 'This submission link has reached its 100-profile limit');
    if (message.includes('invalid or expired submission link'))
        throw new HttpError(400, 'Invalid or expired submission link');
    if (message.includes('newsletter cannot be sent'))
        throw new HttpError(409, 'Newsletter cannot be sent in its current state');
    if (message.includes('prior send needs reconciliation'))
        throw new HttpError(409, 'Prior send needs reconciliation before retry');
    if (message.includes('content is frozen'))
        throw new HttpError(409, 'Accepted newsletter content is frozen');
    if (message.includes('attachments would exceed'))
        throw new HttpError(422, 'Total attachments would exceed 20 MB limit');
    if (message.includes('invitation has expired'))
        throw new HttpError(410, 'This invitation has expired. Request a new invitation.');
    if (message.includes('viewer') && message.includes('read-only'))
        throw new HttpError(400, 'Viewer permissions must remain read-only.');
    if (message.includes('unknown role') || message.includes('unknown permission'))
        throw new HttpError(422, 'The request contains an unknown role or permission.');
    throw new HttpError(503, 'A required dependency is unavailable');
}
