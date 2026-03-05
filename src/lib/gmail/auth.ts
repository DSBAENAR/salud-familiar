import { google } from "googleapis";
import fs from "fs";
import path from "path";

const TOKENS_PATH = path.join(process.cwd(), "gmail-tokens.json");

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  });
}

export async function saveTokens(tokens: object) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function loadTokens(): object | null {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));
}

export function getAuthenticatedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  oauth2Client.on("tokens", (newTokens) => {
    const current = loadTokens() || {};
    saveTokens({ ...current, ...newTokens });
  });

  return oauth2Client;
}

export function isAuthenticated(): boolean {
  return loadTokens() !== null;
}
