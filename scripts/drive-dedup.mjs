#!/usr/bin/env node
/**
 * Busca y elimina archivos duplicados en una carpeta de Google Drive.
 *
 * Uso:
 *   node scripts/drive-dedup.mjs "Urgencias/orden"
 *   node scripts/drive-dedup.mjs   (sin args = escanea TODAS las subcarpetas)
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env.local") });

const ROOT_FOLDER_NAME = "Salud Familiar - Documentos";

function getAuth() {
  const tokensPath = path.join(projectRoot, "gmail-tokens.json");
  if (!fs.existsSync(tokensPath)) {
    console.error("No se encontro gmail-tokens.json — autenticate primero desde la app.");
    process.exit(1);
  }
  const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials(tokens);
  return oauth2;
}

async function findFolder(drive, name, parentId) {
  const q = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: "files(id, name)" });
  return res.data.files?.[0]?.id || null;
}

async function listSubfolders(drive, parentId) {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: "files(id, name)" });
  return res.data.files || [];
}

async function listFiles(drive, folderId) {
  const q = `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime",
  });
  return res.data.files || [];
}

async function dedup(drive, folderId, folderPath) {
  const files = await listFiles(drive, folderId);

  // Group by name
  const byName = {};
  for (const f of files) {
    if (!byName[f.name]) byName[f.name] = [];
    byName[f.name].push(f);
  }

  let deleted = 0;
  for (const [name, copies] of Object.entries(byName)) {
    if (copies.length <= 1) continue;

    // Sort by createdTime ascending — keep the oldest
    copies.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));

    console.log(`\n  ${folderPath}/${name} — ${copies.length} copias`);
    console.log(`    Conservar: ${copies[0].id} (${copies[0].createdTime})`);

    for (let i = 1; i < copies.length; i++) {
      console.log(`    Eliminar:  ${copies[i].id} (${copies[i].createdTime})`);
      await drive.files.delete({ fileId: copies[i].id });
      deleted++;
    }
  }

  return deleted;
}

async function main() {
  const targetPath = process.argv[2]; // e.g. "Urgencias/orden" or undefined
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // Find root folder
  const rootId = await findFolder(drive, ROOT_FOLDER_NAME, null);
  if (!rootId) {
    console.error(`No se encontro la carpeta raiz "${ROOT_FOLDER_NAME}" en Drive.`);
    process.exit(1);
  }

  console.log(`Carpeta raiz: ${ROOT_FOLDER_NAME} (${rootId})`);

  let totalDeleted = 0;

  if (targetPath) {
    // Navigate to specific subfolder
    const parts = targetPath.split("/");
    let currentId = rootId;
    let currentPath = ROOT_FOLDER_NAME;

    for (const part of parts) {
      const folderId = await findFolder(drive, part, currentId);
      if (!folderId) {
        console.error(`No se encontro la carpeta "${part}" dentro de "${currentPath}".`);
        process.exit(1);
      }
      currentId = folderId;
      currentPath += `/${part}`;
    }

    console.log(`\nEscaneando: ${currentPath}`);
    totalDeleted += await dedup(drive, currentId, currentPath);
  } else {
    // Scan ALL subfolders (especialidad/tipo)
    const especialidades = await listSubfolders(drive, rootId);

    for (const esp of especialidades) {
      const tipos = await listSubfolders(drive, esp.id);

      for (const tipo of tipos) {
        const folderPath = `${esp.name}/${tipo.name}`;
        console.log(`\nEscaneando: ${folderPath}`);
        totalDeleted += await dedup(drive, tipo.id, folderPath);
      }
    }
  }

  console.log(`\nListo. ${totalDeleted} duplicado(s) eliminado(s).`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
