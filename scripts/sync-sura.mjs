#!/usr/bin/env node
/**
 * Script de sincronizacion con el portal EPS Sura
 * Extrae datos completos del afiliado y grupo familiar.
 * Uso: node scripts/sync-sura.mjs
 */

import puppeteer from 'puppeteer';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const SURA_TOKEN_URL = 'https://portaleps.epssura.com/TramitesUnClickNet/oauth/public/token';
const SURA_API = 'https://portaleps.epssura.com/TramitesUnClickNet/api';
const SURA_PORTAL = 'https://portaleps.epssura.com/ServiciosUnClick/';

const TIPO_DOC = 'C';
const NUM_DOC = process.env.SURA_NUM_DOC;
const FECHA_NAC = process.env.SURA_FECHA_NAC || '';
const PASSWORD = process.env.SURA_PASSWORD;

if (!NUM_DOC || !PASSWORD) {
  console.error('ERROR: SURA_NUM_DOC y SURA_PASSWORD son requeridos como variables de entorno');
  process.exit(1);
}

async function getToken() {
  const res = await fetch(SURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      scope: 'TRAMITESUNCLICK',
      tipoDocumentoAfiliado: TIPO_DOC,
      numeroDocumentoAfiliado: NUM_DOC,
      fechaNacimiento: FECHA_NAC,
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed`);
  return data;
}

async function loginSSO(page) {
  await page.goto(SURA_PORTAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  if (page.url().includes('servicelogin')) {
    await page.waitForSelector('#suraName', { timeout: 10000 });
    await page.select('#ctl00_ContentMain_suraType', 'C');
    await page.type('#suraName', NUM_DOC, { delay: 30 });
    await page.evaluate((pwd) => {
      document.getElementById('suraPassword').value = pwd;
      window.username = document.getElementById('ctl00_ContentMain_suraType').value + document.getElementById('suraName').value;
      window.password = pwd;
      login.submit();
    }, PASSWORD);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 5000));
  }
  return page.url().includes('epssura.com');
}

async function fetchAPI(page, token, endpoint, data = null) {
  return page.evaluate(async (url, token, data) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : null,
      });
      const text = await res.text();
      if (text.includes('Acceso Bloqueado')) return null;
      try { return JSON.parse(text); } catch { return text; }
    } catch { return null; }
  }, `${SURA_API}/${endpoint}`, token, data);
}

async function syncData() {
  console.log('=== Sync EPS Sura ===\n');

  const loginData = await getToken();
  const token = loginData.access_token;
  console.log(`Token: ${loginData.NombreCompleto}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  if (!await loginSSO(page)) {
    console.log('SSO login failed');
    await browser.close();
    return;
  }
  console.log('SSO OK\n');

  await page.evaluate((t) => {
    window.sessionStorage.setItem('accessToken', t);
    window.sessionStorage.setItem('scopeLogin', 'TRAMITESUNCLICK');
  }, token);

  // 1. Datos completos del afiliado (incluye grupo familiar)
  console.log('1. ConsultarDatosAfiliado...');
  const datosAfiliado = await fetchAPI(page, token, 'AfiliacionesService/ConsultarDatosAfiliado');
  if (datosAfiliado) {
    console.log('\n--- DATOS DEL AFILIADO ---');
    console.log(`Nombre: ${datosAfiliado.primerNombre} ${datosAfiliado.segundoNombre || ''} ${datosAfiliado.primerApellido} ${datosAfiliado.segundoApellido}`);
    console.log(`Doc: ${datosAfiliado.tipoIdentificacion} ${datosAfiliado.numeroIdentificacion}`);
    console.log(`Tipo: ${datosAfiliado.tipoAfiliado}`);
    console.log(`IPS: ${datosAfiliado.nombreIpsMedica}`);
    console.log(`Estado: ${datosAfiliado.descripEstadoSuspension}`);
    console.log(`Fecha nac: ${datosAfiliado.fechaNacimiento}`);
    console.log(`PAC: ${datosAfiliado.tienePac}`);
    console.log(`Ultimo acceso: ${datosAfiliado.ultimoAcceso}`);

    if (datosAfiliado.grupoFamiliar && datosAfiliado.grupoFamiliar.length > 0) {
      console.log(`\n--- GRUPO FAMILIAR (${datosAfiliado.grupoFamiliar.length} miembros) ---`);
      for (const m of datosAfiliado.grupoFamiliar) {
        console.log(JSON.stringify(m, null, 2));
      }
    }

    // Print full response for analysis
    console.log('\n--- RESPUESTA COMPLETA ---');
    console.log(JSON.stringify(datosAfiliado, null, 2));
  }

  // 2. Autorizaciones No PBS
  console.log('\n\n2. Autorizaciones No PBS...');
  const noPbs = await fetchAPI(page, token, 'AutorizacionOrdenes/ConsultarSolicitudesNoPBS', {});
  console.log(`Resultado: ${JSON.stringify(noPbs)}`);

  // 3. Medicamentos
  console.log('\n3. Medicamentos...');
  const meds = await fetchAPI(page, token, 'AutoGestionMedicamentos/consultarOrdenesMedicamentos', {});
  console.log(`Resultado: ${JSON.stringify(meds)}`);

  // 4. Try CUPS search (procedimientos medicos)
  console.log('\n4. Buscar procedimientos (CUPS)...');
  const cups1 = await fetchAPI(page, token, 'AutorizacionOrdenes/ObtenerSuracups', { descripcion: 'consulta medica' });
  if (cups1 && Array.isArray(cups1) && cups1.length > 0) {
    console.log(`Encontrados ${cups1.length} procedimientos:`);
    for (const c of cups1.slice(0, 10)) {
      console.log(`  ${JSON.stringify(c)}`);
    }
  } else {
    // Try different search terms
    for (const term of ['medicina', 'laboratorio', 'radiografia', 'ecografia', 'sangre']) {
      const r = await fetchAPI(page, token, 'AutorizacionOrdenes/ObtenerSuracups', { descripcion: term });
      if (r && Array.isArray(r) && r.length > 0) {
        console.log(`  "${term}": ${r.length} resultados`);
        console.log(`    Ejemplo: ${JSON.stringify(r[0])}`);
      }
    }
  }

  // 5. Autorizaciones PBS con parametros
  console.log('\n5. Autorizaciones PBS...');
  const pbs = await fetchAPI(page, token, 'AutorizacionOrdenes/ConsultarSolicitudAutorizacion', {
    tipoDocumentoAfiliado: 'C',
    numeroDocumentoAfiliado: NUM_DOC,
  });
  if (pbs && typeof pbs !== 'string') {
    console.log(`Resultado: ${JSON.stringify(pbs).substring(0, 500)}`);
  } else {
    console.log(`Error: ${pbs}`);
  }

  // 6. Try getting the internal token
  console.log('\n6. Segundo token interno...');
  // The internal token endpoint uses different approach - try from page context using AngularJS
  const internalData = await page.evaluate(async (token) => {
    try {
      const res = await fetch('/TramitesUnClickNet/api/Oauth/PostIngresoTramitesUnClcik', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const text = await res.text();
      if (text.includes('Bloqueado')) return 'WAF';
      try { return JSON.parse(text); } catch { return text; }
    } catch (e) { return e.message; }
  }, token);
  console.log(`Resultado: ${JSON.stringify(internalData).substring(0, 500)}`);

  // Store in DB
  if (process.env.DATABASE_URL && datosAfiliado) {
    console.log('\n=== Guardando en base de datos ===');
    const sql = neon(process.env.DATABASE_URL);

    // Update paciente
    const updated = await sql`
      UPDATE pacientes
      SET nombre = ${datosAfiliado.primerNombre + ' ' + datosAfiliado.primerApellido + ' ' + datosAfiliado.segundoApellido},
          eps = 'Sura'
      WHERE identificacion = ${NUM_DOC}
      RETURNING id, nombre
    `;
    if (updated.length > 0) {
      console.log(`Paciente actualizado: ${updated[0].nombre} (id: ${updated[0].id})`);
    }
  }

  await browser.close();
  console.log('\n=== Sync completado ===');
}

syncData().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
