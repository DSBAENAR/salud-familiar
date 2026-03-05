export type EmailType = "cita_confirmada" | "cita_cancelada" | "autorizacion_aprobada" | "documentos_salud" | "desconocido";

export interface ParsedCita {
  type: "cita_confirmada";
  especialidad: string;
  fecha: string;
  hora: string;
  profesional: string;
  lugar: string;
  paciente: string;
}

export interface ParsedAutorizacion {
  type: "autorizacion_aprobada";
  especialidad: string;
  numero: string;
  fecha: string;
  hora: string;
  profesional: string;
  lugar: string;
  paciente: string;
}

export interface ParsedDocumentos {
  type: "documentos_salud";
  paciente: string;
  adjuntos: { nombre: string; attachmentId: string }[];
}

export interface ParsedDesconocido {
  type: "desconocido";
  asunto: string;
}

export type ParsedEmail = ParsedCita | ParsedAutorizacion | ParsedDocumentos | ParsedDesconocido;

function cleanHtml(html: string): string {
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

function extractField(text: string, field: string): string {
  const patterns = [
    new RegExp(`${field}:?\\s*(.+?)(?:\\n|$)`, "i"),
    new RegExp(`${field}\\s*(.+?)(?:\\n|$)`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function normalizeDate(dateStr: string): string {
  // "2026/04/10" → "2026-04-10"
  // "2026/03/6" → "2026-03-06"
  // "viernes, 10 de abril de 2026" → "2026-04-10"
  const slashMatch = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) return `${slashMatch[1]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[3].padStart(2, "0")}`;

  const meses: Record<string, string> = {
    enero: "01", febrero: "02", marzo: "03", abril: "04",
    mayo: "05", junio: "06", julio: "07", agosto: "08",
    septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
  };

  const longMatch = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (longMatch) {
    const day = longMatch[1].padStart(2, "0");
    const month = meses[longMatch[2].toLowerCase()] || "01";
    return `${longMatch[3]}-${month}-${day}`;
  }

  return dateStr;
}

function normalizeTime(timeStr: string): string {
  // "06:20:00 am" → "06:20"
  // "06:20AM" → "06:20"
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return timeStr;

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[4]?.toLowerCase();

  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

export function classifyEmail(subject: string, from: string, body: string = ""): EmailType {
  const subjectLower = subject.toLowerCase();
  const fromLower = from.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Cita cancelada: check subject AND body — must check BEFORE confirmed
  if (
    subjectLower.includes("cancelada") ||
    subjectLower.includes("cancelacion") ||
    subjectLower.includes("cancelación") ||
    bodyLower.includes("fue cancelada") ||
    bodyLower.includes("ha sido cancelada") ||
    bodyLower.includes("se cancelo") ||
    bodyLower.includes("se canceló")
  ) {
    return "cita_cancelada";
  }

  // Cita confirmada: "SURA te confirma" or "Cita MED.INTERNA"
  if (
    subjectLower.includes("te confirma") ||
    subjectLower.includes("cita fue agenda") ||
    (subjectLower.includes("cita") && subjectLower.match(/\d{4}\/\d{2}\/\d{2}/))
  ) {
    return "cita_confirmada";
  }

  // Autorización aprobada: "Aprobación autorización" or "EPS SURA Confirma"
  if (
    subjectLower.includes("aprobacion de autor") ||
    subjectLower.includes("aprobación de autor") ||
    subjectLower.includes("aprobacion autorizacion") ||
    subjectLower.includes("aprobación autorización") ||
    (subjectLower.includes("eps sura confirma") && subjectLower.includes("autorización"))
  ) {
    return "autorizacion_aprobada";
  }

  // Documentos de salud: "Te compartimos" + "documentos de salud"
  if (
    subjectLower.includes("te compartimos") ||
    subjectLower.includes("documentos de salud")
  ) {
    return "documentos_salud";
  }

  return "desconocido";
}

export function parseCitaEmail(body: string, subject: string): ParsedCita {
  const text = cleanHtml(body);

  // Try to extract specialty from subject or body
  let especialidad = "";
  // Match "cita para MED.INTERNA" or "Cita MEDICO" etc.
  const espMatch = subject.match(/cita\s+(?:para\s+)?([\w.]+)/i) || text.match(/cita\s+para\s+([\w.]+)/i);
  if (espMatch) {
    especialidad = espMatch[1].replace(/[.,;]/g, "").trim();
  }
  // Map abbreviations to clean names
  const espMap: Record<string, string> = {
    "MEDINTERNA": "Medicina Interna",
    "MED.INTERNA": "Medicina Interna",
    "MED INTERNA": "Medicina Interna",
    "HEMATOLOGIA": "Hematologia",
    "NEUMOLOGIA": "Neumologia",
    "UROLOGIA": "Urologia",
    "FISIATRIA": "Fisiatria",
    "MEDICO": "Medicina General",
    "MEDICINA": "Medicina General",
    "ODONTOLOGIA": "Odontologia",
    "DERMATOLOGIA": "Dermatologia",
    "OFTALMOLOGIA": "Oftalmologia",
    "NEFROLOGIA": "Nefrologia",
    "CARDIOLOGIA": "Cardiologia",
  };
  especialidad = espMap[especialidad.toUpperCase()] || especialidad;

  const fecha = normalizeDate(extractField(text, "Fecha de la cita"));
  const hora = normalizeTime(extractField(text, "Hora de la cita"));
  const profesional = extractField(text, "Profesional a cargo");

  // "Lugar para tu atención:" — extract carefully, the field name may get split
  let lugar = extractField(text, "Lugar para tu atenci");
  // Clean up: may start with "ón:" or "n:" due to HTML split
  lugar = lugar.replace(/^[oó]n:\s*/i, "").trim();

  const paciente = extractField(text, "Nombre");

  return {
    type: "cita_confirmada",
    especialidad: especialidad || "Sin especificar",
    fecha,
    hora,
    profesional,
    lugar,
    paciente,
  };
}

export function parseCancelacionEmail(body: string, subject: string): ParsedCita {
  const text = cleanHtml(body);

  // "la cita de MEDICO GENERAL que teníamos programada para el 2026/03/06 a las 6:20 a.m. fue cancelada"
  let especialidad = "";
  const espMatch = text.match(/cita\s+de\s+([\w\s.]+?)\s+que\s+ten/i);
  if (espMatch) {
    especialidad = espMatch[1].trim();
  }

  // Map abbreviations
  const espMap: Record<string, string> = {
    "MEDINTERNA": "Medicina Interna",
    "MED.INTERNA": "Medicina Interna",
    "MED INTERNA": "Medicina Interna",
    "HEMATOLOGIA": "Hematologia",
    "NEUMOLOGIA": "Neumologia",
    "UROLOGIA": "Urologia",
    "FISIATRIA": "Fisiatria",
    "MEDICO GENERAL": "Medicina General",
    "MEDICO": "Medicina General",
    "MEDICINA": "Medicina General",
  };
  especialidad = espMap[especialidad.toUpperCase()] || especialidad;

  // "para el 2026/03/06"
  let fecha = "";
  const fechaMatch = text.match(/para\s+el\s+(\d{4}\/\d{1,2}\/\d{1,2})/i);
  if (fechaMatch) {
    fecha = normalizeDate(fechaMatch[1]);
  }

  // "a las 6:20 a.m."
  let hora = "";
  const horaMatch = text.match(/a\s+las\s+(\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?)/i);
  if (horaMatch) {
    hora = normalizeTime(horaMatch[1]);
  }

  return {
    type: "cita_confirmada",
    especialidad: especialidad || "Sin especificar",
    fecha,
    hora,
    profesional: "",
    lugar: "",
    paciente: "",
  };
}

export function parseAutorizacionEmail(body: string): ParsedAutorizacion {
  const text = cleanHtml(body);

  let especialidad = "";
  const espMatch = text.match(/\*\s*(.+?)(?:\n|ha sido)/i) || text.match(/autorización de la\s*\n?\s*\*?\s*(.+?)(?:\n|ha sido)/i);
  if (espMatch) {
    especialidad = espMatch[1].replace(/^\*\s*/, "").replace(/\s*\*$/, "").trim();
  }

  // Extract authorization number from subject or body
  let numero = "";
  const numMatch = text.match(/[Aa]utorizaci[oó]n\s+(\d[\d-]+)/);
  if (numMatch) numero = numMatch[1];

  const fecha = normalizeDate(extractField(text, "Fecha"));
  const hora = normalizeTime(extractField(text, "Hora"));

  let profesional = "";
  const profMatch = text.match(/Instituci[oó]n\/Profesional:?\s*\n?\s*(.+?)(?:\n|$)/i);
  if (profMatch) profesional = profMatch[1].trim();

  let lugar = "";
  const lugarMatch = text.match(/Direcci[oó]n:?\s*\n?\s*(.+?)(?:\n|$)/i);
  if (lugarMatch) lugar = lugarMatch[1].trim();

  const paciente = extractField(text, "Nombre") || text.match(/Hola,?\s+(\w+)/i)?.[1] || "";

  return {
    type: "autorizacion_aprobada",
    especialidad: especialidad || "Sin especificar",
    numero,
    fecha,
    hora,
    profesional,
    lugar,
    paciente,
  };
}

export function parseDocumentosEmail(
  body: string,
  attachments: { nombre: string; attachmentId: string }[]
): ParsedDocumentos {
  const text = cleanHtml(body);
  const paciente = text.match(/Hola,?\s+(\w+)/i)?.[1] || "";

  return {
    type: "documentos_salud",
    paciente,
    adjuntos: attachments,
  };
}
