import fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export interface DatosAutorizacionPDF {
  autorizacionNumero: string;
  servicio: string;           // "CONTROL EN MEDICINA INTERNA"
  tipoServicio: string;       // "control", "consulta", "procedimiento", "examen"
  especialidad: string;       // "Medicina Interna"
  prestador: string;
  lugarAtencion: string;
  telefonoContacto: string;
  vigencia: string;           // "2027-02-28"
  esWhatsapp: boolean;
}

const ESPECIALIDAD_MAP: Record<string, string> = {
  "MEDICINA INTERNA": "Medicina Interna",
  "UROLOGIA": "Urología",
  "HEMATOLOGIA": "Hematología",
  "NEUMOLOGIA": "Neumología",
  "FISIATRIA": "Fisiatría",
  "MEDICINA GENERAL": "Medicina General",
  "DERMATOLOGIA": "Dermatología",
  "OFTALMOLOGIA": "Oftalmología",
  "NEFROLOGIA": "Nefrología",
  "CARDIOLOGIA": "Cardiología",
  "ODONTOLOGIA": "Odontología",
  "PROCTOLOGIA": "Proctología",
  "GASTROENTEROLOGIA": "Gastroenterología",
  "NEUROLOGIA": "Neurología",
  "ORTOPEDIA": "Ortopedia",
  "OTORRINOLARINGOLOGIA": "Otorrinolaringología",
  "PSIQUIATRIA": "Psiquiatría",
  "ENDOCRINOLOGIA": "Endocrinología",
  "REUMATOLOGIA": "Reumatología",
};

function detectTipoServicio(servicio: string): string {
  const s = servicio.toUpperCase();
  if (s.includes("CONTROL")) return "control";
  if (s.includes("CONSULTA")) return "consulta";
  if (s.includes("PROCEDIMIENTO")) return "procedimiento";
  if (s.includes("EXAMEN") || s.includes("DIAGNOSTICA")) return "examen";
  return "consulta";
}

function detectEspecialidad(servicio: string): string {
  const s = servicio.toUpperCase();
  const cleaned = s
    .replace(/^(CONTROL|CONSULTA|PROCEDIMIENTO|EXAMEN)\s+(EN|DE|POR|PRIMERA VEZ EN|PRIMERA VEZ DE)\s+/i, "")
    .replace(/^(CONTROL|CONSULTA|PROCEDIMIENTO|EXAMEN)\s+/i, "")
    .trim();

  for (const [key, value] of Object.entries(ESPECIALIDAD_MAP)) {
    if (cleaned.includes(key)) return value;
  }

  return cleaned
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function esNumeroMovilColombia(tel: string): boolean {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) {
    return digits.charAt(2) === "3";
  }
  return digits.length === 10 && digits.startsWith("3");
}

function normalizePhone(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
}

function normalizeVigencia(dateStr: string): string {
  const match = dateStr.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return dateStr;
}

export async function extractDatosAutorizacion(
  filePath: string
): Promise<DatosAutorizacionPDF | null> {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);
    const text = pdf.text;

    // Autorización No.: "2748-189580202"
    let autorizacionNumero = "";
    const autMatch =
      text.match(/Autorizaci[oó]n\s*No\.?\s*\n?([\d]+-[\d]+)/i) ||
      text.match(/(2748-\d+)/);
    if (autMatch) autorizacionNumero = autMatch[1];

    // Servicio — Format 1: "890366CONTROL  EN MEDICINA INTERNA" (consulta/control PDFs)
    // Format 2: table of "PROCEDIMIENTOS AUTORIZADOS" (exámenes PDFs)
    let servicio = "";
    const servMatch = text.match(/\d{6}\s*((?:CONTROL|CONSULTA|PROCEDIMIENTO|EXAMEN)\s+.+?)(?:\n|$)/i);
    if (servMatch) {
      servicio = servMatch[1].replace(/\s{2,}/g, " ").trim();
    } else {
      // Format 2: extract first procedure name from the table
      const procMatch = text.match(/Procedimientos\s+Autorizados[\s\S]*?\d{6}\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.\[\]()]+)/i);
      if (procMatch) {
        servicio = procMatch[1].replace(/\s{2,}/g, " ").trim();
        // Check if there are more procedures → mark as "EXÁMENES"
        const procCount = (text.match(/\d{6}\d{6}\d{6}/g) || []).length;
        if (procCount > 1) servicio = `EXÁMENES (${procCount} procedimientos)`;
      }
    }

    // Teléfono — Strategy 1: near "Datos Contacto:" / "Datos de Contacto:"
    // Strategy 2: "Telefono: XXXXXXXXXX" in INFORMACIÓN DEL PRESTADOR section
    let telefonoContacto = "";
    const lines = text.split("\n");

    // Strategy 1: "Datos Contacto" pattern
    for (let i = 0; i < lines.length; i++) {
      if (/Datos\s+(?:de\s+)?Contacto/i.test(lines[i])) {
        const inlineNum = lines[i].match(/(\d{7,})/);
        if (inlineNum) { telefonoContacto = inlineNum[1]; break; }
        if (i > 0) {
          const prevNum = lines[i - 1].match(/(\d{7,})/);
          if (prevNum) { telefonoContacto = prevNum[1]; break; }
        }
        if (i < lines.length - 1) {
          const nextNum = lines[i + 1].match(/(\d{7,})/);
          if (nextNum) { telefonoContacto = nextNum[1]; break; }
        }
      }
    }

    // Strategy 2: "Telefono:" in prestador section
    if (!telefonoContacto) {
      const telMatch = text.match(/Telefono:\s*(\d{7,})/i);
      if (telMatch) telefonoContacto = telMatch[1];
    }

    // Lugar de atención — Format 1: address line near "Lugar de atención:"
    // Format 2: "Lugar de Atención:\n NI - ... NOMBRE - INSTRUCCIONES"
    let lugarAtencion = "";
    for (let i = 0; i < lines.length; i++) {
      if (/Lugar\s+de\s+[Aa]tenci[oó]n/i.test(lines[i])) {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const line = lines[j].trim();
          if (!line) continue;
          // Format 1: address with CR/CL/KR/AV
          if (/\b(CR|CL|KR|AV|CALLE|CARRERA|DIAGONAL|TRANSVERSAL)\b/i.test(line) || /\d+\s*#\s*\d+/.test(line)) {
            lugarAtencion = line;
            break;
          }
          // Format 2: "NI - XXXXXXX - NOMBRE - INSTRUCTIONS"
          if (/^NI\s*-/.test(line)) {
            lugarAtencion = line.replace(/^NI\s*-\s*\d+\s*-\s*/, "").trim();
            break;
          }
        }
        break;
      }
    }

    // Prestador — Format 1: "Prestador:NI - ..."
    // Format 2: In INFORMACIÓN DEL PRESTADOR section
    let prestador = "";
    const prestMatch = text.match(/Prestador:\s*(.+?)(?:\n|$)/i);
    if (prestMatch) {
      prestador = prestMatch[1].trim();
    } else {
      const prestMatch2 = text.match(/INFORMACI[OÓ]N DEL PRESTADOR\s*\n(.+?)(?:\n|NIT)/i);
      if (prestMatch2) prestador = prestMatch2[1].trim();
    }

    // Vigencia: "VÁLIDO HASTA 2027/02/28" or "(93)20260420" barcode format
    let vigencia = "";
    const vigMatch = text.match(/V[AÁ]LIDO\s+HASTA\s+(\d{4}\/\d{2}\/\d{2})/i);
    if (vigMatch) {
      vigencia = normalizeVigencia(vigMatch[1]);
    } else {
      const barMatch = text.match(/\(93\)(\d{4})(\d{2})(\d{2})/);
      if (barMatch) vigencia = `${barMatch[1]}-${barMatch[2]}-${barMatch[3]}`;
    }

    if (!telefonoContacto && !servicio) return null;

    const normalizedPhone = normalizePhone(telefonoContacto);

    return {
      autorizacionNumero,
      servicio,
      tipoServicio: detectTipoServicio(servicio),
      especialidad: detectEspecialidad(servicio),
      prestador,
      lugarAtencion,
      telefonoContacto: normalizedPhone,
      vigencia,
      esWhatsapp: esNumeroMovilColombia(normalizedPhone),
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return null;
  }
}

export function generarMensajeWhatsapp(datos: DatosAutorizacionPDF): string {
  return [
    `Buenos días, quisiera agendar una cita de ${datos.servicio}`,
    `para el paciente ALVARO BAENA MONTALVO, CC 17029032.`,
    `Autorización No. ${datos.autorizacionNumero}.`,
    `Quedo atento, gracias.`,
  ].join(" ");
}

export function generarLinkWhatsapp(
  telefono: string,
  mensaje: string
): string {
  const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}
