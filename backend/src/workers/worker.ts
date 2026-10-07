import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { loadConfig } from '../config/env.js';
import { createProviders } from '../shared/providers.js';
import { processDelivery, deliveryStore, resendSender } from '../jobs/delivery.js';
import { cleanupInvitations } from '../jobs/invitations.js';
import { rows } from '../shared/data.js';
import { providerError } from '../shared/errors.js';
import { processStorageCleanup, storageCleanupStore } from '../jobs/storageCleanup.js';
const config = loadConfig();
if (!config.SQS_QUEUE_URL)
    throw new Error('SQS_QUEUE_URL is required');
const p = createProviders(config);
const sqs = new SQSClient({});
let stopped = false;
process.on('SIGTERM', () => { stopped = true; });
process.on('SIGINT', () => { stopped = true; });
async function dispatchPending() { const jobs = rows(await p.db.from('delivery_jobs').select('id,status,lease_until,dispatched_at').in('status', ['pending', 'processing']).order('created_at').limit(100)); for (const job of jobs) {
    if (job.status === 'processing' && Date.parse(String(job.lease_until)) > Date.now())
        continue;
    if (job.dispatched_at && Date.parse(String(job.dispatched_at)) > Date.now() - 300000)
        continue;
    await sqs.send(new SendMessageCommand({ QueueUrl: config.SQS_QUEUE_URL, MessageBody: JSON.stringify({ kind: 'newsletter', jobId: job.id }) }));
    providerError((await p.db.from('delivery_jobs').update({ dispatched_at: new Date().toISOString() }).eq('id', job.id)).error);
} }
try {
    while (!stopped) {
        try {
            const cleanup = await processStorageCleanup(storageCleanupStore(p, config));
            if (cleanup.failed) console.error(JSON.stringify({ service: 'worker', event: 'storage_cleanup_failed', count: cleanup.failed }));
            await dispatchPending();
            const response = await sqs.send(new ReceiveMessageCommand({ QueueUrl: config.SQS_QUEUE_URL, MaxNumberOfMessages: 1, WaitTimeSeconds: 20, VisibilityTimeout: 300 }));
            for (const message of response.Messages || []) {
                if (!message.ReceiptHandle)
                    continue;
                const receipt = message.ReceiptHandle;
                const heartbeat = setInterval(() => { void sqs.send(new ChangeMessageVisibilityCommand({ QueueUrl: config.SQS_QUEUE_URL, ReceiptHandle: receipt, VisibilityTimeout: 300 })).catch(() => { }); }, 60000);
                try {
                    const body = JSON.parse(message.Body || '{}') as {
                        kind: string;
                        jobId?: string;
                    };
                    let completed = false;
                    if (body.kind === 'invitation-cleanup') {
                        const r = await cleanupInvitations(p);
                        completed = r.failed === 0;
                    }
                    else if (body.kind === 'newsletter' && body.jobId)
                        completed = await processDelivery(body.jobId, deliveryStore(p), resendSender(p, config));
                    if (completed)
                        await sqs.send(new DeleteMessageCommand({ QueueUrl: config.SQS_QUEUE_URL, ReceiptHandle: receipt }));
                }
                finally {
                    clearInterval(heartbeat);
                }
            }
        }
        catch {
            console.error(JSON.stringify({ service: 'worker', event: 'iteration_failed' }));
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}
finally {
    await p.close();
    sqs.destroy();
}
