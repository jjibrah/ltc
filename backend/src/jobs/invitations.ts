import type { Providers } from '../shared/providers.js';
import { rows } from '../shared/data.js';
import { providerError } from '../shared/errors.js';
export async function cleanupInvitations(p: Providers) { const summary = { found: 0, deleted: 0, failed: 0, skipped: 0 }; const candidates = rows(await p.db.from('application_users').select('id,auth_user_id').eq('status', 'invited').lte('invitation_expires_at', new Date().toISOString()).limit(100)); summary.found = candidates.length; for (const candidate of candidates) {
    const claimed = await p.db.rpc('rbac_claim_expired_invitation', { target_id: candidate.id });
    providerError(claimed.error);
    const user = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data;
    if (!user) {
        summary.skipped++;
        continue;
    }
    try {
        if (user.auth_user_id)
            providerError((await p.db.auth.admin.deleteUser(user.auth_user_id)).error);
        providerError((await p.db.rpc('rbac_finalize_invitation_cleanup', { target_id: candidate.id })).error);
        summary.deleted++;
    }
    catch {
        summary.failed++;
        providerError((await p.db.rpc('rbac_record_invitation_cleanup_failure', { target_id: candidate.id, failure_reason: 'Auth provider cleanup failed' })).error);
    }
} return summary; }
