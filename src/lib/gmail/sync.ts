import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";
import {
  classifyEmail,
  parseCitaEmail,
  parseAutorizacionEmail,
  parseDocumentosEmail,
  type ParsedEmail,
} from "./parser";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadsDir(subdir: string) {
  const dir = path.join(UPLOADS_DIR, subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

interface SyncResult {
  total: number;
  processed: number;
  skipped: number;
  errors: string[];
  details: { emailId: string; type: string; summary: string }[];
}

export async function syncGmailEmails(): Promise<SyncResult> {
  const auth = getAuthenticatedClient();
  if (!auth) throw new Error("No autenticado con Gmail");

  const gmail = google.gmail({ version: "v1", auth });

  const result: SyncResult = {
    total: 0,
    processed: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // Search for emails from Sura domains
  const query = "from:(sura.com.co OR epssura.com OR segurossura.com.co) newer_than:30d";

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
  });

  const messages = listResponse.data.messages || [];
  result.total = messages.length;

  for (const msg of messages) {
    try {
      const emailId = msg.id!;

      // Check if already processed
      const existing = await db
        .select()
        .from(schema.citas)
        .where(eq(schema.citas.emailId, emailId))
        .limit(1);

      const existingAut = await db
        .select()
        .from(schema.autorizaciones)
        .where(eq(schema.autorizaciones.emailId, emailId))
        .limit(1);

      const existingDoc = await db
        .select()
        .from(schema.documentos)
        .where(eq(schema.documentos.emailId, emailId))
        .limit(1);

      if (existing.length > 0 || existingAut.length > 0 || existingDoc.length > 0) {
        result.skipped++;
        continue;
      }

      // Fetch full message
      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: emailId,
        format: "full",
      });

      const headers = fullMsg.data.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";

      // Get email body
      const body = extractBody(fullMsg.data.payload);

      // Get attachments info
      const attachments = extractAttachmentInfo(fullMsg.data.payload);

      // Classify
      const emailType = classifyEmail(subject, from);

      if (emailType === "cita_confirmada") {
        const parsed = parseCitaEmail(body, subject);
        await db.insert(schema.citas).values({
          pacienteId: 1,
          especialidad: parsed.especialidad,
          profesional: parsed.profesional || null,
          fecha: parsed.fecha,
          hora: parsed.hora || null,
          lugar: parsed.lugar || null,
          estado: "confirmada",
          emailId,
        });

        // Download attachments if any
        await downloadAttachments(gmail, emailId, attachments, parsed.especialidad, "cita");

        result.processed++;
        result.details.push({
          emailId,
          type: "cita_confirmada",
          summary: `Cita ${parsed.especialidad} - ${parsed.fecha} ${parsed.hora}`,
        });
      } else if (emailType === "autorizacion_aprobada") {
        const parsed = parseAutorizacionEmail(body);
        await db.insert(schema.autorizaciones).values({
          pacienteId: 1,
          especialidad: parsed.especialidad,
          numero: parsed.numero || null,
          tipo: "consulta",
          estado: "aprobada",
          fechaAprobacion: parsed.fecha || new Date().toISOString().split("T")[0],
          emailId,
        });

        // If the authorization includes a scheduled appointment, create it too
        if (parsed.fecha && parsed.hora) {
          await db.insert(schema.citas).values({
            pacienteId: 1,
            especialidad: parsed.especialidad,
            profesional: parsed.profesional || null,
            fecha: parsed.fecha,
            hora: parsed.hora || null,
            lugar: parsed.lugar || null,
            estado: "confirmada",
            emailId: emailId + "_cita",
          });
        }

        // Download attachments if any
        await downloadAttachments(gmail, emailId, attachments, parsed.especialidad, "autorizacion");

        result.processed++;
        result.details.push({
          emailId,
          type: "autorizacion_aprobada",
          summary: `Autorizacion ${parsed.especialidad}${parsed.numero ? ` #${parsed.numero}` : ""}`,
        });
      } else if (emailType === "documentos_salud") {
        const parsed = parseDocumentosEmail(body, attachments);

        // Download each attachment and create document records
        if (attachments.length > 0) {
          const savedFiles = await downloadAttachments(
            gmail,
            emailId,
            attachments,
            "General",
            "orden"
          );

          for (const file of savedFiles) {
            await db.insert(schema.documentos).values({
              pacienteId: 1,
              especialidad: "General",
              tipo: file.nombre.toLowerCase().includes("remision") ? "orden" : "historia_clinica",
              nombre: file.nombre,
              rutaArchivo: file.ruta,
              emailId,
            });
          }

          // Create order entries for remissions
          const remisiones = savedFiles.filter((f) =>
            f.nombre.toLowerCase().includes("remision")
          );
          for (const rem of remisiones) {
            await db.insert(schema.ordenes).values({
              pacienteId: 1,
              especialidad: "General",
              descripcion: `Orden de remision: ${rem.nombre}`,
              tipo: "remision",
              estado: "pendiente",
              emailId,
            });
          }
        }

        result.processed++;
        result.details.push({
          emailId,
          type: "documentos_salud",
          summary: `${attachments.length} documento(s) descargado(s)`,
        });
      } else {
        result.skipped++;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Email ${msg.id}: ${errMsg}`);
    }
  }

  return result;
}

function extractBody(payload: any): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  // Multipart
  if (payload.parts) {
    // Prefer HTML
    const htmlPart = payload.parts.find(
      (p: any) => p.mimeType === "text/html"
    );
    if (htmlPart?.body?.data) {
      return Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
    }

    // Fallback to plain text
    const textPart = payload.parts.find(
      (p: any) => p.mimeType === "text/plain"
    );
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }

    // Nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function extractAttachmentInfo(
  payload: any
): { nombre: string; attachmentId: string; partId: string }[] {
  const attachments: { nombre: string; attachmentId: string; partId: string }[] = [];

  function walk(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          nombre: part.filename,
          attachmentId: part.body.attachmentId,
          partId: part.partId || "",
        });
      }
      if (part.parts) walk(part.parts);
    }
  }

  if (payload?.parts) walk(payload.parts);
  return attachments;
}

async function downloadAttachments(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  attachments: { nombre: string; attachmentId: string }[],
  especialidad: string,
  tipo: string
): Promise<{ nombre: string; ruta: string }[]> {
  const saved: { nombre: string; ruta: string }[] = [];
  const dir = ensureUploadsDir(
    `${especialidad.replace(/\s+/g, "_")}/${tipo}`
  );

  for (const att of attachments) {
    try {
      const response = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: att.attachmentId,
      });

      if (response.data.data) {
        const buffer = Buffer.from(response.data.data, "base64url");
        const filePath = path.join(dir, att.nombre);
        fs.writeFileSync(filePath, buffer);

        const relativePath = `/uploads/${especialidad.replace(/\s+/g, "_")}/${tipo}/${att.nombre}`;
        saved.push({ nombre: att.nombre, ruta: relativePath });
      }
    } catch (error) {
      console.error(`Error downloading attachment ${att.nombre}:`, error);
    }
  }

  return saved;
}
