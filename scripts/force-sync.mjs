#!/usr/bin/env node
/**
 * Force re-sync: run locally to download all Gmail attachments.
 * Usage: node scripts/force-sync.mjs
 *
 * Requires: .env.local with DATABASE_URL and Gmail tokens saved.
 * After running, files are in public/uploads/ — then deploy or upload to Railway.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// We need to call the API endpoint with a valid session.
// Instead, let's call the sync endpoint directly via the running dev server.
// Get the session cookie from the browser.

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("🔄 Starting force re-sync...");
  console.log(`   Target: ${BASE_URL}/api/gmail/sync`);
  console.log("");

  try {
    const res = await fetch(`${BASE_URL}/api/gmail/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });

    if (res.redirected || !res.ok) {
      console.error("❌ Auth required. Copy your session cookie from the browser:");
      console.error("");
      console.error("   1. Open http://localhost:3000 in your browser and log in");
      console.error("   2. Open DevTools > Application > Cookies");
      console.error('   3. Copy the value of "authjs.session-token"');
      console.error("   4. Run again with:");
      console.error('      SESSION_COOKIE="<value>" node scripts/force-sync.mjs');
      process.exit(1);
    }

    const data = await res.json();
    console.log("✅ Sync complete:");
    console.log(`   Total emails: ${data.total}`);
    console.log(`   Processed: ${data.processed}`);
    console.log(`   Skipped: ${data.skipped}`);
    if (data.errors?.length > 0) {
      console.log(`   Errors: ${data.errors.length}`);
      data.errors.forEach((e) => console.log(`     - ${e}`));
    }
    if (data.details?.length > 0) {
      console.log("\n   Details:");
      data.details.forEach((d) => console.log(`     [${d.type}] ${d.summary}`));
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

// If SESSION_COOKIE is provided, patch fetch to include it
if (process.env.SESSION_COOKIE) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, opts = {}) => {
    opts.headers = {
      ...opts.headers,
      Cookie: `authjs.session-token=${process.env.SESSION_COOKIE}`,
    };
    return originalFetch(url, opts);
  };
}

main();
