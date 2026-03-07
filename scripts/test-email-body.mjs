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

const emailId = "19cc58e1d4b8e3f9";

const full = await gmail.users.messages.get({ userId: "me", id: emailId, format: "full" });

function extractBody(payload) {
  if (!payload) return "";
  if (payload.body?.data) return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  if (payload.parts) {
    const htmlPart = payload.parts.find(p => p.mimeType === "text/html");
    if (htmlPart?.body?.data) return Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
    const textPart = payload.parts.find(p => p.mimeType === "text/plain");
    if (textPart?.body?.data) return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    for (const part of payload.parts) {
      if (part.parts) { const nested = extractBody(part); if (nested) return nested; }
    }
  }
  return "";
}

function cleanHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const body = extractBody(full.data.payload);
const text = cleanHtml(body);

console.log("=== CLEANED TEXT (first 800) ===");
console.log(text.slice(0, 800));

console.log("\n=== PARSING TEST ===");
const normalized = text.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();
console.log("Normalized (first 500):", normalized.slice(0, 500));

function extractIPS(label) {
  const pattern = new RegExp(label + ":?\\s*(.+?)(?=\\s+(?:Aseguradora|Servicio|Profesional|Tipo de Atenci|Fecha|Hora|Direcci|N[uú]mero de|Este es|Como llegar|$))", "i");
  const match = normalized.match(pattern);
  return match ? match[1].trim() : "NOT FOUND";
}

console.log("Nombre:", extractIPS("Nombre"));
console.log("Servicio:", extractIPS("Servicio"));
console.log("Profesional:", extractIPS("Profesional"));
console.log("Fecha:", extractIPS("Fecha"));
console.log("Hora:", extractIPS("Hora de la cita"));
console.log("Dirección:", extractIPS("Direcci[oó]n"));

// Check if "cita ha sido asignada" is in text
console.log("\nContains 'cita ha sido asignada':", text.includes("cita ha sido asignada"));
console.log("Contains 'cocoreservas':", text.toLowerCase().includes("cocoreservas"));
