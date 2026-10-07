import { loadConfig } from './config/env.js';
import { createProviders } from './shared/providers.js';
import { createApp } from './app.js';
const config = loadConfig();
const providers = createProviders(config);
const server = createApp(config, providers).listen(config.PORT, () => console.log(JSON.stringify({ service: 'api', event: 'listening', port: config.PORT })));
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
let stopping = false;
async function stop() { if (stopping)
    return; stopping = true; const deadline = setTimeout(() => process.exit(1), 20000); deadline.unref(); server.close(async () => { await providers.close(); clearTimeout(deadline); process.exit(0); }); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
