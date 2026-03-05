import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";
import {
  classifyEmail,
  parseCitaEmail,
  parseCancelacionEmail,
  parseAutorizacionEmail,
  parseDocumentosEmail,
  type ParsedEmail,
} from "./parser";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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
      const alreadyProcessed = await db
        .select()
        .from(schema.emailsProcesados)
        .where(eq(schema.emailsProcesados.emailId, emailId))
        .limit(1);

      if (alreadyProcessed.length > 0) {
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
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";
      const emailDate = dateHeader ? new Date(dateHeader).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

      // Get email body
      const body = extractBody(fullMsg.data.payload);

      // Get attachments info
      const attachments = extractAttachmentInfo(fullMsg.data.payload);

      // Classify — pass body for cancellation detection
      const emailType = classifyEmail(subject, from, body);

      if (emailType === "cita_cancelada") {
        const parsed = parseCancelacionEmail(body, subject);

        // Find matching confirmed cita and mark as cancelled
        const matchingCitas = await db
          .select()
          .from(schema.citas)
          .where(eq(schema.citas.pacienteId, 1));

        // Match by specialty + date, or just specialty if no date in cancellation
        for (const cita of matchingCitas) {
          if (cita.estado === "cancelada") continue;

          const sameFecha = parsed.fecha && cita.fecha === parsed.fecha;
          const sameEsp = parsed.especialidad &&
            cita.especialidad.toLowerCase() === parsed.especialidad.toLowerCase();

          if (sameFecha && sameEsp) {
            await db
              .update(schema.citas)
              .set({ estado: "cancelada" })
              .where(eq(schema.citas.id, cita.id));
            break;
          }
        }

        result.processed++;
        result.details.push({
          emailId,
          type: "cita_cancelada",
          summary: `Cita cancelada: ${parsed.especialidad}${parsed.fecha ? ` - ${parsed.fecha}` : ""}`,
        });
      } else if (emailType === "cita_confirmada") {
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

        // Download and decrypt attachments if any
        const citaFiles = await downloadAttachments(gmail, emailId, attachments, parsed.especialidad, "cita");
        const citaDecrypted = citaFiles.filter((f) => f.decrypted).length;

        result.processed++;
        result.details.push({
          emailId,
          type: "cita_confirmada",
          summary: `Cita ${parsed.especialidad} - ${parsed.fecha} ${parsed.hora}${citaFiles.length > 0 ? ` (${citaFiles.length} adjunto(s)${citaDecrypted > 0 ? ", desencriptado(s)" : ""})` : ""}`,
        });
      } else if (emailType === "autorizacion_aprobada") {
        const parsed = parseAutorizacionEmail(body);
        // Save with "Por clasificar" — user will assign specialty manually
        await db.insert(schema.autorizaciones).values({
          pacienteId: 1,
          especialidad: "Por clasificar",
          numero: parsed.numero || null,
          tipo: "consulta",
          estado: "aprobada",
          fechaAprobacion: parsed.fecha || emailDate,
          emailId,
        });

        // If the authorization includes a scheduled appointment, save it pending too
        if (parsed.fecha && parsed.hora) {
          await db.insert(schema.citas).values({
            pacienteId: 1,
            especialidad: "Por clasificar",
            profesional: parsed.profesional || null,
            fecha: parsed.fecha,
            hora: parsed.hora || null,
            lugar: parsed.lugar || null,
            estado: "confirmada",
            emailId: emailId + "_cita",
          });
        }

        // Download and decrypt attachments if any — save in temp folder until classified
        const autFiles = await downloadAttachments(gmail, emailId, attachments, "Por_clasificar", "autorizacion");
        const autDecrypted = autFiles.filter((f) => f.decrypted).length;

        // Save attachments as documents linked to this email
        for (const file of autFiles) {
          await db.insert(schema.documentos).values({
            pacienteId: 1,
            especialidad: "Por clasificar",
            tipo: "autorizacion",
            nombre: file.nombre,
            rutaArchivo: file.ruta,
            encriptado: file.nombre.toLowerCase().endsWith(".pdf") && !file.decrypted,
            emailId,
          });
        }

        result.processed++;
        result.details.push({
          emailId,
          type: "autorizacion_aprobada",
          summary: `Autorizacion por clasificar${parsed.numero ? ` #${parsed.numero}` : ""}${autFiles.length > 0 ? ` (${autFiles.length} adjunto(s)${autDecrypted > 0 ? ", desencriptado(s)" : ""})` : ""}`,
        });
      } else if (emailType === "documentos_salud") {
        const parsed = parseDocumentosEmail(body, attachments);

        // Download each attachment and create document records
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
            encriptado: file.nombre.toLowerCase().endsWith(".pdf") && !file.decrypted,
            emailId,
          });
        }

        // Create order entries for remissions
        const remisiones = savedFiles.filter((f: { nombre: string }) =>
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

        const decryptedCount = savedFiles.filter((f: { decrypted: boolean }) => f.decrypted).length;
        result.processed++;
        result.details.push({
          emailId,
          type: "documentos_salud",
          summary: `${savedFiles.length} documento(s) descargado(s)${decryptedCount > 0 ? ` (${decryptedCount} desencriptado(s))` : ""}`,
        });
      } else {
        result.skipped++;
        continue;
      }

      // Mark email as processed
      await db.insert(schema.emailsProcesados).values({ emailId, tipo: emailType });
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

  const ignoredExtensions = [".ics", ".cis"];

  function walk(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        const ext = part.filename.toLowerCase().slice(part.filename.lastIndexOf("."));
        if (!ignoredExtensions.includes(ext)) {
          attachments.push({
            nombre: part.filename,
            attachmentId: part.body.attachmentId,
            partId: part.partId || "",
          });
        }
      }
      if (part.parts) walk(part.parts);
    }
  }

  if (payload?.parts) walk(payload.parts);
  return attachments;
}

function tryDecryptPdf(filePath: string): boolean {
  const password = process.env.PDF_PASSWORD;
  if (!password) return false;
  if (!filePath.toLowerCase().endsWith(".pdf")) return false;

  // Always try to decrypt with the password.
  // If the PDF is not encrypted, qpdf will just copy it (no harm).
  // If it is encrypted and the password works, we get a decrypted version.
  try {
    const decryptedPath = filePath.replace(".pdf", "_decrypted.pdf");
    execSync(
      `qpdf --password="${password}" --decrypt "${filePath}" "${decryptedPath}"`,
      { encoding: "utf-8", timeout: 15000, stdio: "pipe" }
    );
    // Replace original with decrypted version
    fs.unlinkSync(filePath);
    fs.renameSync(decryptedPath, filePath);
    console.log(`PDF processed (decrypted): ${path.basename(filePath)}`);
    return true;
  } catch {
    // If decrypt fails, the original file remains untouched
    console.log(`PDF not encrypted or wrong password: ${path.basename(filePath)}`);
    // Clean up partial file if exists
    const decryptedPath = filePath.replace(".pdf", "_decrypted.pdf");
    if (fs.existsSync(decryptedPath)) fs.unlinkSync(decryptedPath);
    return false;
  }
}

async function downloadAttachments(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  attachments: { nombre: string; attachmentId: string }[],
  especialidad: string,
  tipo: string
): Promise<{ nombre: string; ruta: string; decrypted: boolean }[]> {
  const saved: { nombre: string; ruta: string; decrypted: boolean }[] = [];
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

        // Try to decrypt if it's a password-protected PDF
        const wasDecrypted = tryDecryptPdf(filePath);

        const relativePath = `/uploads/${especialidad.replace(/\s+/g, "_")}/${tipo}/${att.nombre}`;
        saved.push({ nombre: att.nombre, ruta: relativePath, decrypted: wasDecrypted });
      }
    } catch (error) {
      console.error(`Error downloading attachment ${att.nombre}:`, error);
    }
  }

  return saved;
}
