export type EmailType = "cita_confirmada" | "cita_cancelada" | "autorizacion_aprobada" | "respuesta_solicitud" | "documentos_salud" | "desconocido";

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
    .replace(/<\/li>/gi, "\n")
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

  // Cita confirmada: "SURA te confirma", "Cita MED.INTERNA", or IPS providers
  if (
    subjectLower.includes("te confirma") ||
    subjectLower.includes("cita fue agenda") ||
    subjectLower.includes("cita ha sido asignada") ||
    (subjectLower.includes("cita") && subjectLower.match(/\d{4}\/\d{2}\/\d{2}/)) ||
    // IPS providers: urobosque (cocoreservas.com), dinamicaips, etc.
    (fromLower.includes("cocoreservas") && (subjectLower.includes("cita") || bodyLower.includes("cita ha sido asignada"))) ||
    (fromLower.includes("dinamicaips") && (subjectLower.includes("cita") || bodyLower.includes("programación exitosa")))
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

  // Gestion Solicitud: respuesta a solicitudes de autorizacion (tramitesaunclic@epssura)
  if (
    subjectLower.includes("gestion solicitud") ||
    (subjectLower.includes("solicitud") && subjectLower.match(/solicitud\s*#?\d+/))
  ) {
    return "respuesta_solicitud";
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

const espMap: Record<string, string> = {
  "MEDINTERNA": "Medicina Interna",
  "MED.INTERNA": "Medicina Interna",
  "MED INTERNA": "Medicina Interna",
  "HEMATOLOGIA": "Hematología",
  "NEUMOLOGIA": "Neumología",
  "UROLOGIA": "Urología",
  "FISIATRIA": "Fisiatría",
  "MEDICO": "Medicina General",
  "MEDICO GENERAL": "Medicina General",
  "MEDICINA": "Medicina General",
  "ODONTOLOGIA": "Odontología",
  "DERMATOLOGIA": "Dermatología",
  "OFTALMOLOGIA": "Oftalmología",
  "NEFROLOGIA": "Nefrología",
  "CARDIOLOGIA": "Cardiología",
  "PROCTOLOGIA": "Proctología",
  "GASTROENTEROLOGIA": "Gastroenterología",
  "LABORATORIO": "Laboratorio",
  "TOMA DE MUESTRA LABORATORIO": "Laboratorio",
  "TOMA DE MUESTRA": "Laboratorio",
};

function detectEspecialidadFromServicio(servicio: string): string {
  const s = servicio.toUpperCase();
  for (const [key, value] of Object.entries(espMap)) {
    if (s.includes(key)) return value;
  }
  return "";
}

export function parseCitaEmail(body: string, subject: string, from: string = ""): ParsedCita {
  const text = cleanHtml(body);
  const fromLower = from.toLowerCase();

  // --- Ayudas Diagnósticas SURA (dinamicaips, etc.) ---
  if (fromLower.includes("dinamicaips") || text.includes("Ayudas Diagnósticas") || text.includes("programación exitosa")) {
    return parseCitaAyudasDiagnosticas(text);
  }

  // --- IPS providers (urobosque/cocoreservas, etc.) ---
  if (fromLower.includes("cocoreservas") || text.includes("cita ha sido asignada")) {
    return parseCitaIPS(text, subject);
  }

  // --- Sura format ---
  let especialidad = "";
  const espMatch = subject.match(/cita\s+(?:para\s+)?([\w.]+)/i) || text.match(/cita\s+para\s+([\w.]+)/i);
  if (espMatch) {
    especialidad = espMatch[1].replace(/[.,;]/g, "").trim();
  }
  especialidad = espMap[especialidad.toUpperCase()] || especialidad;

  const fecha = normalizeDate(extractField(text, "Fecha de la cita"));
  const hora = normalizeTime(extractField(text, "Hora de la cita"));
  const profesional = extractField(text, "Profesional a cargo");

  let lugar = extractField(text, "Lugar para tu atenci");
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

function parseCitaIPS(text: string, _subject: string): ParsedCita {
  // IPS format (urobosque/cocoreservas): fields separated by multiple spaces or newlines
  // Normalize: collapse newlines + spaces into single spaces, then split by known field labels
  const normalized = text
    .replace(/\r?\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  function extractIPS(label: string): string {
    const pattern = new RegExp(`${label}:?\\s*(.+?)(?=\\s+(?:Aseguradora|Servicio|Profesional|Tipo de Atenci|Fecha|Hora|Direcci|N[uú]mero de|Este es|Como llegar|$))`, "i");
    const match = normalized.match(pattern);
    return match ? match[1].trim() : "";
  }

  const servicio = extractIPS("Servicio");
  const especialidad = detectEspecialidadFromServicio(servicio);

  let fecha = extractIPS("Fecha");
  if (fecha) fecha = normalizeDate(fecha);

  let hora = extractIPS("Hora de la cita");
  if (!hora) hora = extractIPS("Hora");
  if (hora) hora = normalizeTime(hora);

  const profesional = extractIPS("Profesional");
  const paciente = extractIPS("Nombre");

  let direccion = extractIPS("Direcci[oó]n");
  direccion = direccion.replace(/^[oó]n:\s*/i, "").trim();

  return {
    type: "cita_confirmada",
    especialidad: especialidad || servicio || "Sin especificar",
    fecha,
    hora,
    profesional,
    lugar: direccion,
    paciente,
  };
}

function parseCitaAyudasDiagnosticas(text: string): ParsedCita {
  // Format: bullet list after "cita para:\nPACIENTE"
  // • SERVICE NAME
  // • YYYY/MM/DD
  // • HH:MM:SS am/pm
  // • LOCATION, Address
  const pacienteMatch = text.match(/cita para:\s*\n?\s*(\w+)/i);
  const paciente = pacienteMatch ? pacienteMatch[1] : "";

  const lines = text.split("\n").map(l => l.replace(/^[\s•·\-*]+/, "").trim()).filter(Boolean);

  let especialidad = "";
  let fecha = "";
  let hora = "";
  let lugar = "";

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      fecha = normalizeDate(lines[i]);
      if (i > 0) especialidad = lines[i - 1];
      if (i + 1 < lines.length && lines[i + 1].match(/\d{1,2}:\d{2}/)) {
        hora = normalizeTime(lines[i + 1]);
      }
      if (i + 2 < lines.length) lugar = lines[i + 2];
      break;
    }
  }

  especialidad = detectEspecialidadFromServicio(especialidad) || especialidad;

  return {
    type: "cita_confirmada",
    especialidad: especialidad || "Sin especificar",
    fecha,
    hora,
    profesional: "",
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

  // Extract authorization/solicitud number from subject or body
  let numero = "";
  const numMatch = text.match(/[Aa]utorizaci[oó]n\s+(\d[\d-]+)/) ||
    text.match(/[Ss]olicitud\s*#?\s*(\d+)/);
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

export function parseRespuestaSolicitud(body: string, subject: string): {
  numero: string;
  aprobada: boolean;
  motivo: string;
} {
  const text = cleanHtml(body);
  const textLower = text.toLowerCase();

  // Extract solicitud number from subject or body
  let numero = "";
  const numFromSubject = subject.match(/[Ss]olicitud\s*#?\s*(\d+)/);
  const numFromBody = text.match(/[Ss]olicitud\s*#?\s*(\d+)/);
  if (numFromSubject) numero = numFromSubject[1];
  else if (numFromBody) numero = numFromBody[1];

  // Check for approval keywords
  const approvalKeywords = [
    "exitoso", "exitosamente", "exitosa",
    "aprobad",
    "autorizada", "autorizado",
    "ha sido gestionada exitosamente",
    "fue gestionada exitosamente",
  ];

  const aprobada = approvalKeywords.some((kw) => textLower.includes(kw));

  // Extract the reason/message from the body — include "Atendiendo a su solicitud..."
  let motivo = "";
  const match = text.match(/(Atendiendo a su solicitud[\s\S]*?)(?:Recuerda actualizar|En EPS SURA cuidarte)/i);
  if (match) {
    motivo = match[1].replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  }

  return { numero, aprobada, motivo };
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
