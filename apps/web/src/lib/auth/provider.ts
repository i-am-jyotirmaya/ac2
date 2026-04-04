import "server-only";

// Session signing now lives in session.ts so the web app can verify auth state
// without depending on the Node-oriented auth workspace package at build time.
export {};
