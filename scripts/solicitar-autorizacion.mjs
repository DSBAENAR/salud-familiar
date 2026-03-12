#!/usr/bin/env node
/**
 * Solicitar autorización EPS Sura - Automatizado con captcha solver
 *
 * Modos:
 *   --auto       100% automático con 2captcha (requiere TWOCAPTCHA_KEY en .env.local)
 *   (sin flag)   Semi-auto: abre navegador, tú haces click en "Enviar solicitud"
 *
 * Uso:
 *   node scripts/solicitar-autorizacion.mjs --procedimiento "consulta medicina general" --tipo 6 --archivo /path/to/formula.pdf
 *   node scripts/solicitar-autorizacion.mjs --auto --procedimiento "ecografia" --tipo 1 --archivo /path/to/orden.pdf
 *
 * Tipos de solicitud:
 *   6 = Citas con especialistas, laboratorios, radiografías y ecografías
 *   1 = Cirugías, resonancias y autorizaciones No PBS
 *   2 = Medicamentos
 *   5 = Reembolsos
 */
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import fs from 'fs';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

puppeteerExtra.use(StealthPlugin());

const SURA_PORTAL = 'https://portaleps.epssura.com/ServiciosUnClick/';
const NUM_DOC = process.env.SURA_NUM_DOC;
const PASSWORD = process.env.SURA_PASSWORD;
const CORREO_DEFAULT = process.env.SURA_CORREO || '';
const CELULAR_DEFAULT = process.env.SURA_CELULAR || '';
const TELEFONO_DEFAULT = process.env.SURA_TELEFONO || '';

if (!NUM_DOC || !PASSWORD) {
  console.error('ERROR: SURA_NUM_DOC y SURA_PASSWORD son requeridos como variables de entorno');
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    procedimiento: { type: 'string', short: 'p', default: 'consulta medicina general' },
    tipo: { type: 'string', short: 't', default: '6' },
    archivo: { type: 'string', short: 'a' },
    historia: { type: 'string', short: 'h' },
    observaciones: { type: 'string', short: 'o', default: '' },
    correo: { type: 'string', default: CORREO_DEFAULT },
    celular: { type: 'string', default: CELULAR_DEFAULT },
    telefono: { type: 'string', default: TELEFONO_DEFAULT },
    auto: { type: 'boolean', default: false },
  },
  strict: false,
});

const AUTO_MODE = args.auto;
const TWOCAPTCHA_KEY = process.env.TWOCAPTCHA_KEY || process.env.TWO_CAPTCHA_KEY;

if (AUTO_MODE && !TWOCAPTCHA_KEY) {
  console.error('ERROR: Modo --auto requiere TWOCAPTCHA_KEY en .env.local');
  console.error('  1. Crea cuenta en https://2captcha.com');
  console.error('  2. Agrega TWOCAPTCHA_KEY=tu_api_key en .env.local');
  process.exit(1);
}

// Configure 2captcha plugin if in auto mode
if (AUTO_MODE) {
  puppeteerExtra.use(
    RecaptchaPlugin({
      provider: { id: '2captcha', token: TWOCAPTCHA_KEY },
      visualFeedback: true, // colorea el captcha en el browser
    })
  );
}

const TIPOS = {
  '6': 'Citas con especialistas, laboratorios, radiografías y ecografías',
  '1': 'Cirugías, resonancias y autorizaciones No PBS',
  '2': 'Medicamentos',
  '5': 'Reembolsos',
};

function ensureTestPDF(filepath) {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
206
%%EOF`);
  }
  return filepath;
}

// ─── Helper: get solicitudesCtrl scope ───
function getScopeJS() {
  return `angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope()`;
}

async function run() {
  const procedimiento = args.procedimiento;
  const tipoSolicitud = args.tipo;
  const archivoFormula = args.archivo || ensureTestPDF('/tmp/formula-medica-test.pdf');
  const archivoHistoria = args.historia || null;
  const observaciones = args.observaciones || `Solicitud de ${procedimiento}`;

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  Solicitud de Autorización EPS Sura  ${AUTO_MODE ? '[AUTO]' : '[SEMI-AUTO]'}     ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Procedimiento : ${procedimiento}`);
  console.log(`  Tipo          : ${TIPOS[tipoSolicitud] || tipoSolicitud}`);
  console.log(`  Fórmula médica: ${archivoFormula}`);
  if (archivoHistoria) console.log(`  Historia clín.: ${archivoHistoria}`);
  console.log(`  Observaciones : ${observaciones}`);
  console.log(`  Contacto      : ${args.correo} | ${args.celular} | ${args.telefono}`);
  if (AUTO_MODE) console.log(`  2captcha      : ${TWOCAPTCHA_KEY.substring(0, 8)}...`);
  console.log('');

  if (archivoFormula && !fs.existsSync(archivoFormula)) {
    console.error(`ERROR: Archivo no encontrado: ${archivoFormula}`);
    process.exit(1);
  }

  const launchOptions = {
    headless: AUTO_MODE ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 1000 },
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteerExtra.launch(launchOptions);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Track API responses
  let submitResponse = null;
  page.on('response', async (res) => {
    if (res.url().includes('GenerarSolicitudAutorizacion')) {
      try { submitResponse = { status: res.status(), body: await res.text() }; } catch {}
    }
  });

  try {
    // ── 1. SSO Login ──
    console.log('[1/8] Iniciando sesión SSO...');
    await page.goto(SURA_PORTAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);
    if (page.url().includes('servicelogin')) {
      await page.waitForSelector('#suraName', { timeout: 10000 });
      await page.select('#ctl00_ContentMain_suraType', 'C');
      await page.type('#suraName', NUM_DOC, { delay: 50 });
      await page.evaluate((pwd) => {
        document.getElementById('suraPassword').value = pwd;
        window.username = document.getElementById('ctl00_ContentMain_suraType').value + document.getElementById('suraName').value;
        window.password = pwd;
        login.submit();
      }, PASSWORD);
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await delay(8000);
    }
    if (!page.url().includes('epssura.com')) throw new Error('No se pudo iniciar sesión SSO');
    console.log('  OK');
    await delay(3000);

    // ── 2. Navigate ──
    console.log('[2/8] Navegando a autorizaciones...');
    await page.evaluate(() => angular.element(document.body).injector().get('$state').go('ordenes/ingreso'));
    await delay(5000);
    await page.evaluate(() => document.querySelector('[ng-click*="goToSolicitudes"]')?.click());
    await delay(8000);
    const state = await page.evaluate(() => angular.element(document.body).injector().get('$state').current.name);
    if (state !== 'solicitudes/autorizacionOrdenes') throw new Error('No se pudo navegar a solicitudes');
    console.log('  OK');

    // ── 3. Select procedure ──
    console.log(`[3/8] Buscando "${procedimiento}"...`);
    const procResult = await page.evaluate((term) => {
      const scope = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
      const matches = scope.listProc.filter(p =>
        p.descripcionProcedimiento.toLowerCase().includes(term.toLowerCase())
      );
      if (matches.length === 0) return { found: false, total: scope.listProc.length };
      const proc = matches[0];
      scope.inputProcedimiento = proc.descripcionProcedimiento.trim();
      scope.selectProcedimiento(proc);
      scope.$apply();
      return { found: true, codigo: proc.codigoProcedimiento, desc: proc.descripcionProcedimiento.trim() };
    }, procedimiento);

    let skipValidation = false;
    if (!procResult.found) {
      console.log(`  WARN: "${procedimiento}" no encontrado en listado. Enviando solicitud directa...`);
      // Click "Enviar solicitud" button from the warning message
      await page.evaluate(() => {
        // Look for the "Enviar solicitud" link/button in the important warning box
        const links = [...document.querySelectorAll('a, button, span, div')];
        const enviar = links.find(el =>
          el.textContent?.trim().toLowerCase().includes('enviar solicitud') &&
          (el.getAttribute('ng-click') || el.onclick || el.tagName === 'A' || el.tagName === 'BUTTON')
        );
        if (enviar) {
          enviar.click();
        } else {
          // Try Angular scope method directly
          const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
          if (s.activarFormSas) s.activarFormSas();
          s.$apply();
        }
      });
      await delay(5000);
      skipValidation = true;
    } else {
      console.log(`  OK: ${procResult.codigo} - ${procResult.desc}`);
    }

    if (!skipValidation) {
      // ── 4. Validate ──
      console.log('[4/8] Validando procedimiento...');
      await page.evaluate(() => {
        angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().obtenerDataValidacion();
      });
      await delay(5000);
      const validation = await page.evaluate(() => {
        return angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().validacionProc;
      });
      if (validation?.error) throw new Error(`Validación falló: ${validation.error}`);
      console.log(`  OK: ${validation?.datosPrestador?.descripcion}`);

      // ── 5. Open form ──
      console.log('[5/8] Abriendo formulario...');
      await page.evaluate(() => {
        angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().activarFormSas();
      });
      await delay(3000);
      console.log('  OK');
    } else {
      console.log('[4/8] Saltando validación (solicitud directa)...');
      console.log('[5/8] Formulario ya abierto...');
    }

    // ── 6. Fill form ──
    console.log('[6/8] Llenando formulario...');
    const tipoIdx = { '6': 0, '1': 1, '2': 2, '5': 3 }[tipoSolicitud] || 0;
    await page.evaluate((p) => {
      const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();

      // telefono
      const telS = angular.element(document.getElementById('telefono')).isolateScope() || angular.element(document.getElementById('telefono')).scope();
      telS.model = p.telefono;
      telS.$apply();

      // celular
      const celS = angular.element(document.getElementById('celular')).isolateScope() || angular.element(document.getElementById('celular')).scope();
      celS.model = p.celular;
      celS.$apply();

      // correo
      if (!s.modeloSolicitud.correo) s.modeloSolicitud.correo = {};
      s.modeloSolicitud.correo.valor = p.correo;
      document.getElementById('correo').value = p.correo;
      angular.element(document.getElementById('correo')).triggerHandler('input');

      // tipo solicitud
      const selS = angular.element(document.getElementById('selectTipoSolicitud')).isolateScope() || angular.element(document.getElementById('selectTipoSolicitud')).scope();
      selS.model = s.listaTiposSolicitud[p.tipoIdx];
      selS.$apply();
      s.verificarTipoSolicitud();

      // observaciones
      s.modeloSolicitud.observaciones = p.observaciones;
      document.getElementById('observacion').value = p.observaciones;
      angular.element(document.getElementById('observacion')).triggerHandler('input');

      s.$apply();
    }, { telefono: args.telefono, celular: args.celular, correo: args.correo, tipoIdx, observaciones });

    // Fix celular directive validation
    const celInput = await page.$('#celular');
    if (celInput) {
      await celInput.click({ clickCount: 3 });
      await celInput.type(args.celular, { delay: 30 });
    }
    await page.evaluate(() => {
      const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
      if (s.form?.celular) {
        s.form.celular.$setViewValue(document.getElementById('celular').value);
        s.form.celular.$setValidity('required', true);
      }
      s.$apply();
    });
    console.log('  OK');

    // Wait for form to settle after tipo change (re-renders upload components)
    await delay(5000);

    // ── 7. Upload files ──
    console.log('[7/8] Subiendo archivos...');
    await page.screenshot({ path: '/tmp/sura-pre-upload.png', fullPage: true });

    if (archivoFormula) {
      let formulaInput = await page.$('#formulaMedica');

      if (!formulaInput) {
        // Discover file inputs — "Remisión o fórmula médica" is typically the last one
        const allFileInputs = await page.$$('input[type="file"]');
        console.log(`  Descubiertos ${allFileInputs.length} inputs de archivo`);
        if (allFileInputs.length > 0) {
          formulaInput = allFileInputs[allFileInputs.length - 1];
        }
      }

      if (formulaInput) {
        await formulaInput.uploadFile(archivoFormula);
        // Trigger change event for Angular directive
        await page.evaluate((sel) => {
          const input = sel ? document.getElementById(sel) : document.querySelectorAll('input[type="file"]')[document.querySelectorAll('input[type="file"]').length - 1];
          if (input) {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            angular.element(input).triggerHandler('change');
          }
        }, await page.evaluate(() => document.getElementById('formulaMedica') ? 'formulaMedica' : null));
        await delay(8000);
        const docId = await page.evaluate(() =>
          angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().archivoFormulaMedica?.idDocument
        );
        console.log(docId ? `  OK fórmula: ${docId}` : '  WARN: fórmula no subió');
      } else {
        console.log('  WARN: No se encontró input para fórmula');
      }
    }
    if (archivoHistoria) {
      const histSize = fs.statSync(archivoHistoria).size;
      if (histSize > 4096 * 1024) {
        console.log(`  WARN: historia (${(histSize / 1024).toFixed(0)} KB) excede límite de 4096 KB, omitiendo`);
      } else {
        let historiaInput = await page.$('#historiaClinica');

        if (!historiaInput) {
          const allFileInputs = await page.$$('input[type="file"]');
          if (allFileInputs.length > 1) {
            historiaInput = allFileInputs[0]; // first input is typically historia
          }
        }

        if (historiaInput) {
          await historiaInput.uploadFile(archivoHistoria);
          await page.evaluate((sel) => {
            const input = sel ? document.getElementById(sel) : document.querySelectorAll('input[type="file"]')[0];
            if (input) {
              input.dispatchEvent(new Event('change', { bubbles: true }));
              angular.element(input).triggerHandler('change');
            }
          }, await page.evaluate(() => document.getElementById('historiaClinica') ? 'historiaClinica' : null));
          await delay(8000);
          const docId = await page.evaluate(() =>
            angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().archivoHistoriaClinica?.idDocument
          );
          console.log(docId ? `  OK historia: ${docId}` : '  WARN: historia no subió');
        } else {
          console.log('  WARN: No se encontró input para historia');
        }
      }
    }

    // ── 8. Submit with captcha ──
    console.log('[8/8] Enviando solicitud...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    if (AUTO_MODE) {
      // ── AUTO: reCAPTCHA invisible + 2captcha ──
      // The Sura portal uses vc-recaptcha (angular-recaptcha) with size="invisible".
      // Flow: vcRecaptchaService.execute() → Google challenge → setResponse(token) → enviarSolicitud()
      // With 2captcha plugin: solveRecaptchas() solves and injects the token, then we call setResponse().
      console.log('  Resolviendo reCAPTCHA con 2captcha...');

      // Use plugin to solve the invisible reCAPTCHA
      const captchaResult = await page.solveRecaptchas();

      if (captchaResult.error) {
        console.error(`  ERROR reCAPTCHA: ${captchaResult.error}`);
        throw new Error(`2captcha falló: ${captchaResult.error}`);
      }

      // Get the solved token
      const token = captchaResult.solutions?.[0]?.text
        || captchaResult.solved?.[0]?.text
        || await page.evaluate(() => { try { return grecaptcha.getResponse(); } catch { return null; } });

      if (token) {
        console.log(`  OK captcha resuelto: ${token.substring(0, 40)}...`);

        // Use setResponse() — the Angular callback that Sura expects.
        // setResponse(response) sets the token AND calls enviarSolicitud() automatically.
        await page.evaluate((captchaToken) => {
          const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
          s.setResponse(captchaToken);
          s.$apply();
        }, token);

        console.log('  Esperando respuesta del servidor...');
        await delay(15000);
      } else {
        console.log('  WARN: No se obtuvo token, intentando execute()...');
        // Trigger the invisible captcha via vcRecaptchaService.execute()
        // The 2captcha plugin should intercept and solve it, then the callback fires.
        await page.evaluate(() => {
          const injector = angular.element(document.body).injector();
          const vcService = injector.get('vcRecaptchaService');
          const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
          const widgetId = s.modeloSolicitud?.recaptcha?.recaptchaId || 0;
          vcService.execute(widgetId);
        });
        console.log('  Ejecutando captcha invisible, esperando resolución...');
        await delay(30000);
      }

      // Retry if no response yet — try execute() as fallback
      if (!submitResponse) {
        console.log('  Reintentando con execute()...');
        await page.evaluate(() => {
          const injector = angular.element(document.body).injector();
          const vcService = injector.get('vcRecaptchaService');
          const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
          const widgetId = s.modeloSolicitud?.recaptcha?.recaptchaId || 0;
          // Reset and re-execute
          vcService.reload(widgetId);
          vcService.execute(widgetId);
        });
        await delay(30000);
      }

    } else {
      // ── SEMI-AUTO: User clicks "Enviar solicitud" manually ──
      const formValid = await page.evaluate(() => {
        return angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope().form?.$valid;
      });

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(formValid
        ? '  Formulario listo. Haz click en "Enviar solicitud".'
        : '  Formulario tiene errores. Revisa campos en el navegador.');
      console.log('  Resuelve el captcha si aparece.');
      console.log('  Esperando hasta 5 minutos...');
      console.log('═══════════════════════════════════════════════════════');

      for (let i = 0; i < 300; i++) {
        await delay(1000);
        if (submitResponse) break;
      }
    }

    // ── Result ──
    console.log('');
    if (submitResponse) {
      if (submitResponse.status === 200) {
        let data;
        try { data = JSON.parse(submitResponse.body); } catch {}
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  SOLICITUD ENVIADA EXITOSAMENTE                     ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        if (data?.numeroSolicitud) console.log(`  Número: ${data.numeroSolicitud}`);
        console.log(`  Respuesta: ${(submitResponse.body || '').substring(0, 300)}`);
      } else {
        console.log(`  ERROR ${submitResponse.status}: ${submitResponse.body?.substring(0, 300)}`);
      }
    } else {
      console.log(AUTO_MODE
        ? '  No se recibió respuesta. Puede que el captcha haya fallado.'
        : '  Tiempo agotado (5 min). No se envió la solicitud.');
    }

    await page.screenshot({ path: '/tmp/sura-solicitud-result.png', fullPage: true });
    if (!AUTO_MODE && submitResponse) await delay(10000);

  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    await page.screenshot({ path: '/tmp/sura-solicitud-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    console.log('\nProceso completado.');
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

run().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
