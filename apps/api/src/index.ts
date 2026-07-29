import { createApp } from './app.js';
import { createContext } from './context.js';

const host = process.env.MC_FLEET_DEVTOOLS_HOST ?? '127.0.0.1';
const port = Number(process.env.MC_FLEET_DEVTOOLS_PORT ?? 4310);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('MC_FLEET_DEVTOOLS_PORT must be a valid TCP port');
}

const context = createContext();
const app = createApp(context);
app.listen(port, host, () => {
  process.stdout.write(
    `MC Fleet Devtools listening on http://${host}:${port} (read-only)\n`,
  );
});
