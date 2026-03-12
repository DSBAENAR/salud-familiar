#!/usr/bin/env node
/**
 * Debug script: investigate reCAPTCHA mechanism on Sura portal
 * Usage: node scripts/debug-captcha.mjs
 */
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

puppeteerExtra.use(StealthPlugin());

const SURA_PORTAL = 'https://portaleps.epssura.com/ServiciosUnClick/';
const NUM_DOC = process.env.SURA_NUM_DOC;
const PASSWORD = process.env.SURA_PASSWORD;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
    defaultViewport: { width: 1280, height: 1000 },
  });
  const page = await browser.newPage();

  try {
    // ── 1. SSO Login ──
    console.log('[1] SSO Login...');
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
    console.log('  OK - URL:', page.url());

    // ── 2. Navigate to solicitudes ──
    console.log('[2] Navigating to solicitudes...');
    await page.evaluate(() => angular.element(document.body).injector().get('$state').go('ordenes/ingreso'));
    await delay(5000);
    await page.evaluate(() => document.querySelector('[ng-click*="goToSolicitudes"]')?.click());
    await delay(8000);
    console.log('  OK');

    // ── 3. Open direct form (solicitud directa) ──
    console.log('[3] Opening form...');
    await page.evaluate(() => {
      const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
      // Type a non-existing procedure to trigger direct form
      s.inputProcedimiento = 'test';
      s.$apply();
    });
    await delay(2000);
    await page.evaluate(() => {
      const links = [...document.querySelectorAll('a, button, span, div')];
      const enviar = links.find(el =>
        el.textContent?.trim().toLowerCase().includes('enviar solicitud') &&
        (el.getAttribute('ng-click') || el.onclick || el.tagName === 'A' || el.tagName === 'BUTTON')
      );
      if (enviar) enviar.click();
      else {
        const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
        if (s.activarFormSas) s.activarFormSas();
        s.$apply();
      }
    });
    await delay(5000);
    console.log('  OK');

    // ── 4. INVESTIGATE CAPTCHA ──
    console.log('\n══════════════════════════════════════');
    console.log('  CAPTCHA INVESTIGATION');
    console.log('══════════════════════════════════════\n');

    // 4a. Find reCAPTCHA elements in DOM
    const captchaInfo = await page.evaluate(() => {
      const results = {};

      // Find all g-recaptcha divs
      const recaptchaDivs = document.querySelectorAll('.g-recaptcha, [data-sitekey]');
      results.recaptchaDivs = [...recaptchaDivs].map(el => ({
        className: el.className,
        id: el.id,
        sitekey: el.getAttribute('data-sitekey'),
        size: el.getAttribute('data-size'),
        callback: el.getAttribute('data-callback'),
        badge: el.getAttribute('data-badge'),
        type: el.getAttribute('data-type'),
        outerHTML: el.outerHTML.substring(0, 500),
      }));

      // Find reCAPTCHA iframes
      const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
      results.iframes = [...iframes].map(f => ({
        src: f.src,
        title: f.title,
        width: f.width,
        height: f.height,
      }));

      // Check grecaptcha object
      try {
        results.grecaptchaExists = typeof grecaptcha !== 'undefined';
        if (typeof grecaptcha !== 'undefined') {
          results.grecaptchaResponse = grecaptcha.getResponse?.() || null;
          // Check widget count
          results.widgetMethods = Object.keys(grecaptcha).filter(k => typeof grecaptcha[k] === 'function');
        }
      } catch (e) {
        results.grecaptchaError = e.message;
      }

      // Check Angular scope for captcha-related properties
      try {
        const s = angular.element(document.querySelector('[ng-controller="solicitudesCtrl"]')).scope();
        results.scopeKeys = Object.keys(s).filter(k =>
          !k.startsWith('$') && !k.startsWith('_') &&
          (k.toLowerCase().includes('captcha') ||
           k.toLowerCase().includes('recaptcha') ||
           k.toLowerCase().includes('response') ||
           k.toLowerCase().includes('enviar') ||
           k.toLowerCase().includes('submit'))
        );

        // Dump the captcha-related scope values
        results.scopeCaptchaValues = {};
        for (const key of results.scopeKeys) {
          try {
            const val = s[key];
            if (typeof val === 'function') {
              results.scopeCaptchaValues[key] = `[function: ${val.toString().substring(0, 200)}]`;
            } else {
              results.scopeCaptchaValues[key] = JSON.parse(JSON.stringify(val));
            }
          } catch { results.scopeCaptchaValues[key] = '[unserializable]'; }
        }

        // Check modeloSolicitud structure
        if (s.modeloSolicitud) {
          results.modeloSolicitud = {};
          for (const key of Object.keys(s.modeloSolicitud)) {
            try {
              const val = s.modeloSolicitud[key];
              if (typeof val === 'function') {
                results.modeloSolicitud[key] = '[function]';
              } else {
                results.modeloSolicitud[key] = JSON.parse(JSON.stringify(val));
              }
            } catch { results.modeloSolicitud[key] = '[unserializable]'; }
          }
        }

        // Get enviarSolicitud source
        if (typeof s.enviarSolicitud === 'function') {
          results.enviarSolicitudSource = s.enviarSolicitud.toString().substring(0, 2000);
        }

        // Get setResponse source
        if (typeof s.setResponse === 'function') {
          results.setResponseSource = s.setResponse.toString().substring(0, 500);
        }

        // Check for vcRecaptchaService
        try {
          const injector = angular.element(document.body).injector();
          const vcService = injector.get('vcRecaptchaService');
          results.vcRecaptchaService = {
            exists: true,
            methods: Object.keys(vcService).filter(k => typeof vcService[k] === 'function'),
          };
          // Try to get the widget config
          if (vcService.data) {
            results.vcRecaptchaData = vcService.data;
          }
        } catch (e) {
          results.vcRecaptchaService = { exists: false, error: e.message };
        }

      } catch (e) {
        results.scopeError = e.message;
      }

      // Look for reCAPTCHA script tags
      const scripts = document.querySelectorAll('script[src*="recaptcha"]');
      results.scripts = [...scripts].map(s => s.src);

      // Look for ng-model or vc-recaptcha directives
      const vcElements = document.querySelectorAll('[vc-recaptcha], [data-vc-recaptcha]');
      results.vcElements = [...vcElements].map(el => ({
        tag: el.tagName,
        id: el.id,
        attributes: [...el.attributes].map(a => `${a.name}="${a.value}"`),
        outerHTML: el.outerHTML.substring(0, 500),
      }));

      return results;
    });

    console.log('=== reCAPTCHA divs ===');
    console.log(JSON.stringify(captchaInfo.recaptchaDivs, null, 2));

    console.log('\n=== reCAPTCHA iframes ===');
    console.log(JSON.stringify(captchaInfo.iframes, null, 2));

    console.log('\n=== reCAPTCHA scripts ===');
    console.log(JSON.stringify(captchaInfo.scripts, null, 2));

    console.log('\n=== vc-recaptcha elements ===');
    console.log(JSON.stringify(captchaInfo.vcElements, null, 2));

    console.log('\n=== grecaptcha object ===');
    console.log(JSON.stringify({
      exists: captchaInfo.grecaptchaExists,
      response: captchaInfo.grecaptchaResponse,
      methods: captchaInfo.widgetMethods,
      error: captchaInfo.grecaptchaError,
    }, null, 2));

    console.log('\n=== Angular scope captcha keys ===');
    console.log(JSON.stringify(captchaInfo.scopeKeys, null, 2));

    console.log('\n=== Scope captcha values ===');
    console.log(JSON.stringify(captchaInfo.scopeCaptchaValues, null, 2));

    console.log('\n=== modeloSolicitud ===');
    console.log(JSON.stringify(captchaInfo.modeloSolicitud, null, 2));

    console.log('\n=== enviarSolicitud source ===');
    console.log(captchaInfo.enviarSolicitudSource || 'NOT FOUND');

    console.log('\n=== setResponse source ===');
    console.log(captchaInfo.setResponseSource || 'NOT FOUND');

    console.log('\n=== vcRecaptchaService ===');
    console.log(JSON.stringify(captchaInfo.vcRecaptchaService, null, 2));

    // Take screenshot
    await page.screenshot({ path: '/tmp/sura-captcha-debug.png', fullPage: true });
    console.log('\nScreenshot saved: /tmp/sura-captcha-debug.png');

    // Keep browser open for manual inspection
    console.log('\nBrowser kept open for manual inspection. Press Ctrl+C to close.');
    await delay(300000); // 5 min

  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    await page.screenshot({ path: '/tmp/sura-captcha-error.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
