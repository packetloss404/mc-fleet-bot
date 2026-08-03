'use client';

import { io, Socket } from 'socket.io-client';

/**
 * Optional absolute override for deployments that serve the dashboard from a
 * different origin than the API. Normally UNSET, and that is the good path:
 * with no override we connect same-origin, and `next.config.ts` rewrites
 * `/socket.io/*` to the loopback-bound bot API on 127.0.0.1:3001.
 *
 * Do NOT reintroduce a hardcoded `http://localhost:3001` default here.
 * `NEXT_PUBLIC_*` is baked into the browser bundle, so that default pointed
 * every remote visitor's socket at their own laptop and the realtime feed
 * (bot:position, bot:health, town:event) silently never connected.
 *
 * WebSockets through a Next rewrite genuinely work here — this is not a
 * long-polling fallback. Next's `upgradeHandler`
 * (next/dist/server/lib/router-server.js) resolves routes for
 * `Upgrade: websocket` requests and, when an external rewrite matches
 * (`parsedUrl.protocol` set), calls `proxyRequest`, which builds http-proxy
 * with `ws: true` and invokes `proxy.ws(req, socket, head)`
 * (next/dist/server/lib/router-utils/proxy-request.js). One caveat baked into
 * that handler: it bails with `socket.end()` if the upgrade path matches a
 * filesystem route, so `/socket.io` must never collide with a page or route
 * handler in `src/app/`. It currently does not.
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

const options = {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  // Cap retry interval at 30s and add 50% jitter so a thundering herd
  // of reconnecting clients doesn't hammer the server simultaneously.
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  reconnectionAttempts: Infinity,
  // Default Socket.IO mount point on the bot API; named explicitly because
  // the rewrite in next.config.ts is keyed to this exact prefix.
  path: '/socket.io',
  // Same-origin in the default case, so cookies ride along regardless; kept
  // for the NEXT_PUBLIC_API_URL cross-origin override, where the dashboard
  // auth cookie must be sent on the handshake.
  withCredentials: true,
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // `io(options)` with no URL targets the page's own origin — which is what
    // we want, so the browser only ever talks to port 3000.
    socket = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
  }
  return socket;
}
