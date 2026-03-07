#!/usr/bin/env node
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(projectRoot, ".env.local") });

const tokens = JSON.parse(fs.readFileSync(path.join(projectRoot, "gmail-tokens.json"), "utf-8"));
const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2.setCredentials(tokens);
const gmail = google.gmail({ version: "v1", auth: oauth2 });

const queries = [
  "from:(cocoreservas.com) newer_than:1y",
  "from:(sura.com.co OR epssura.com OR segurossura.com.co) newer_than:1y",
];

for (const q of queries) {
  console.log(`\n=== Query: ${q} ===`);
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 5 });
  const msgs = res.data.messages || [];
  console.log(`Found: ${msgs.length} (estimate: ${res.data.resultSizeEstimate})`);

  for (const msg of msgs.slice(0, 3)) {
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From"] });
    const headers = full.data.payload?.headers || [];
    const subject = headers.find(h => h.name === "Subject")?.value || "";
    const from = headers.find(h => h.name === "From")?.value || "";
    console.log(`  ${msg.id} | ${from} | ${subject}`);
  }
}
