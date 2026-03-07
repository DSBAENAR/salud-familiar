#!/usr/bin/env node
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uso: node scripts/test-pdf-parser.mjs <ruta-pdf>");
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const pdf = await pdfParse(buffer);
const text = pdf.text;
const lines = text.split("\n");

console.log("=== CAMPOS DETECTADOS ===\n");

// Autorización No.
const autMatch = text.match(/Autorizaci[oó]n\s*No\.?\s*\n?([\d]+-[\d]+)/i) || text.match(/(2748-\d+)/);
console.log("Autorización No.:", autMatch?.[1] || "NO ENCONTRADO");

// Servicio — Format 1 or Format 2
let servicio = "";
const servMatch = text.match(/\d{6}\s*((?:CONTROL|CONSULTA|PROCEDIMIENTO|EXAMEN)\s+.+?)(?:\n|$)/i);
if (servMatch) {
  servicio = servMatch[1].replace(/\s{2,}/g, " ").trim();
} else {
  const procMatch = text.match(/Procedimientos\s+Autorizados[\s\S]*?\d{6}\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.\[\]()]+)/i);
  if (procMatch) {
    servicio = procMatch[1].replace(/\s{2,}/g, " ").trim();
    const procCount = (text.match(/\d{6}\d{6}\d{6}/g) || []).length;
    if (procCount > 1) servicio = `EXÁMENES (${procCount} procedimientos)`;
  }
}
console.log("Servicio:", servicio || "NO ENCONTRADO");

// Tipo servicio
const tipo = servicio.toUpperCase().includes("CONTROL") ? "control"
  : servicio.toUpperCase().includes("CONSULTA") ? "consulta"
  : servicio.toUpperCase().includes("EXÁM") ? "examen" : "otro";
console.log("Tipo:", tipo);

// Teléfono — Strategy 1: Datos Contacto, Strategy 2: Telefono:
let telefono = "";
for (let i = 0; i < lines.length; i++) {
  if (/Datos\s+(?:de\s+)?Contacto/i.test(lines[i])) {
    const inlineNum = lines[i].match(/(\d{7,})/);
    if (inlineNum) { telefono = inlineNum[1]; break; }
    if (i > 0) { const m = lines[i-1].match(/(\d{7,})/); if (m) { telefono = m[1]; break; } }
    if (i < lines.length - 1) { const m = lines[i+1].match(/(\d{7,})/); if (m) { telefono = m[1]; break; } }
  }
}
if (!telefono) {
  const telMatch = text.match(/Telefono:\s*(\d{7,})/i);
  if (telMatch) telefono = telMatch[1];
}
console.log("Teléfono contacto:", telefono || "NO ENCONTRADO");

// Es WhatsApp?
const digits = telefono.replace(/\D/g, "");
const esMovil = digits.length === 10 && digits.startsWith("3");
console.log(`Es WhatsApp: ${esMovil ? "SÍ (móvil)" : "NO (fijo) → TOCA LLAMAR"}`);

// Lugar — Format 1: address, Format 2: NI - XXX - NOMBRE - INSTRUCCIONES
let lugar = "";
for (let i = 0; i < lines.length; i++) {
  if (/Lugar\s+de\s+[Aa]tenci[oó]n/i.test(lines[i])) {
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const line = lines[j].trim();
      if (!line) continue;
      if (/\b(CR|CL|KR|AV|CALLE|CARRERA|DIAGONAL|TRANSVERSAL)\b/i.test(line) || /\d+\s*#\s*\d+/.test(line)) {
        lugar = line; break;
      }
      if (/^NI\s*-/.test(line)) {
        lugar = line.replace(/^NI\s*-\s*\d+\s*-\s*/, "").trim(); break;
      }
    }
    break;
  }
}
console.log("Lugar:", lugar || "NO ENCONTRADO");

// Prestador
let prestador = "";
const prestMatch = text.match(/Prestador:\s*(.+?)(?:\n|$)/i);
if (prestMatch) {
  prestador = prestMatch[1].trim();
} else {
  const prestMatch2 = text.match(/INFORMACI[OÓ]N DEL PRESTADOR\s*\n(.+?)(?:\n|NIT)/i);
  if (prestMatch2) prestador = prestMatch2[1].trim();
}
console.log("Prestador:", prestador || "NO ENCONTRADO");

// Vigencia
let vigencia = "";
const vigMatch = text.match(/V[AÁ]LIDO\s+HASTA\s+(\d{4}\/\d{2}\/\d{2})/i);
if (vigMatch) {
  vigencia = vigMatch[1];
} else {
  const barMatch = text.match(/\(93\)(\d{4})(\d{2})(\d{2})/);
  if (barMatch) vigencia = `${barMatch[1]}-${barMatch[2]}-${barMatch[3]}`;
}
console.log("Vigencia:", vigencia || "NO ENCONTRADO");

// Acción
if (esMovil) {
  const msg = `Buenos días, quisiera agendar una cita de ${servicio} para el paciente ALVARO BAENA MONTALVO, CC 17029032. Autorización No. ${autMatch?.[1]}. Quedo atento, gracias.`;
  const link = `https://wa.me/57${digits}?text=${encodeURIComponent(msg)}`;
  console.log("\n=== LINK WHATSAPP ===");
  console.log(link);
} else if (telefono) {
  console.log(`\n=== ACCIÓN: LLAMAR al ${telefono} ===`);
}
