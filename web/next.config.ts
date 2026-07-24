import type { NextConfig } from "next";

/**
 * Where the bot API actually listens. It is deliberately bound to loopback
 * (`api.host: "127.0.0.1"` in config.yml) because every `/api/*` route is
 * unauthenticated unless DASHBOARD_AUTH_SECRET is set, and the LLM provider
 * routes expose provider config. Do NOT "fix" remote access by rebinding that
 * server to 0.0.0.0 — proxy through this Next server instead, which is what
 * the rewrites below do.
 *
 * Only this Next process (running on the same host as the API) ever dials
 * 127.0.0.1:3001. The browser only ever talks to port 3000, same-origin.
 */
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  // FIXME: ignoreBuildErrors masks ~58 `any` casts surfaced by strict type
  // checks. Drop this once the offenders are typed properly.
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ['10.80.13.15', '10.80.13.18'],

  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      // REST API. The browser fetches same-origin `/api/...`; Next proxies it
      // to the loopback-bound bot API.
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
      // Socket.IO. Next's upgrade handler (router-server.js) runs external
      // rewrites for `Upgrade: websocket` requests and hands them to
      // proxy-request.js, which constructs http-proxy with `ws: true` and
      // calls `proxy.ws()`. So both the initial long-polling handshake AND
      // the subsequent WebSocket upgrade are proxied by these rules.
      //
      // Order matters. socket.io's transports hit `/socket.io/?EIO=4&...` —
      // the mount point WITH a trailing slash and no further path segment.
      // The engine.io server only answers on exactly `/socket.io/`; proxying
      // to `/socket.io` gets a bare Express 404 ("Cannot GET /socket.io").
      // `/socket.io/:path*` collapses to the slash-less form when `path` is
      // empty, so these two exact rules must come first.
      {
        source: "/socket.io/",
        destination: `${API_PROXY_TARGET}/socket.io/`,
      },
      {
        source: "/socket.io",
        destination: `${API_PROXY_TARGET}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${API_PROXY_TARGET}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
