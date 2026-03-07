import { google, drive_v3 } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/auth";
import { db, schema } from "@/lib/db";
import { eq, isNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { resolveUploadPath } from "@/lib/uploads";

const ROOT_FOLDER_NAME = "Salud Familiar - Documentos";

interface BackupResult {
  total: number;
  uploaded: number;
  skipped: number;
  errors: string[];
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const query = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({ q: query, fields: "files(id, name)" });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folderRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  return folderRes.data.id!;
}

export async function backupToDrive(): Promise<BackupResult> {
  const auth = getAuthenticatedClient();
  if (!auth) throw new Error("No autenticado con Google");

  const drive = google.drive({ version: "v3", auth });

  const result: BackupResult = {
    total: 0,
    uploaded: 0,
    skipped: 0,
    errors: [],
  };

  // Get documents not yet backed up
  const documentos = await db
    .select()
    .from(schema.documentos)
    .where(isNull(schema.documentos.driveFileId));

  result.total = documentos.length;

  if (documentos.length === 0) {
    return result;
  }

  // Create root folder
  const rootFolderId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);

  // Cache folder IDs to avoid repeated API calls
  const folderCache: Record<string, string> = {};

  for (const doc of documentos) {
    try {
      const filePath = resolveUploadPath(doc.rutaArchivo);

      if (!fs.existsSync(filePath)) {
        result.skipped++;
        continue;
      }

      // Create specialty folder: Root > Especialidad
      const espName = doc.especialidad.replace(/\s+/g, "_");
      const espKey = espName;
      if (!folderCache[espKey]) {
        folderCache[espKey] = await findOrCreateFolder(drive, doc.especialidad, rootFolderId);
      }

      // Create type folder: Root > Especialidad > Tipo
      const tipoKey = `${espKey}/${doc.tipo}`;
      if (!folderCache[tipoKey]) {
        folderCache[tipoKey] = await findOrCreateFolder(drive, doc.tipo, folderCache[espKey]);
      }

      // Check if file with same name already exists in Drive folder
      const existingFiles = await drive.files.list({
        q: `name='${doc.nombre.replace(/'/g, "\\'")}' and '${folderCache[tipoKey]}' in parents and trashed=false`,
        fields: "files(id, name)",
      });

      let driveFileId: string;

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // File already exists in Drive — reuse its ID, skip upload
        driveFileId = existingFiles.data.files[0].id!;
      } else {
        // Upload file
        const fileRes = await drive.files.create({
          requestBody: {
            name: doc.nombre,
            parents: [folderCache[tipoKey]],
          },
          media: {
            mimeType: "application/pdf",
            body: fs.createReadStream(filePath),
          },
          fields: "id",
        });
        driveFileId = fileRes.data.id!;
      }

      // Update document with Drive file ID
      await db
        .update(schema.documentos)
        .set({ driveFileId })
        .where(eq(schema.documentos.id, doc.id));

      result.uploaded++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`${doc.nombre}: ${errMsg}`);
    }
  }

  return result;
}

export async function getBackupStatus(): Promise<{
  total: number;
  backed: number;
  pending: number;
}> {
  const all = await db.select().from(schema.documentos);
  const backed = all.filter((d) => d.driveFileId).length;

  return {
    total: all.length,
    backed,
    pending: all.length - backed,
  };
}
