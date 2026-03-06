import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  // Capture ALL API responses
  const apiResults = {};
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('TramitesUnClick') && !url.includes('.js') && !url.includes('.css') && !url.includes('.html')) {
      try {
        const text = await res.text();
        if (!text.includes('<!DOCTYPE') && !text.includes('Bloqueado')) {
          const ep = url.split('api/')[1] || url;
          apiResults[ep] = { status: res.status(), body: text };
          console.log(`  [${res.status()}] ${ep.substring(0, 60)}`);
        }
      } catch {}
    }
  });

  // SSO login
  console.log('SSO login...');
  await page.goto('https://portaleps.epssura.com/ServiciosUnClick/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  if (page.url().includes('servicelogin')) {
    await page.waitForSelector('#suraName', { timeout: 10000 });
    await page.select('#ctl00_ContentMain_suraType', 'C');
    await page.type('#suraName', 'REDACTED_DOC_NUMBER', { delay: 30 });
    await page.evaluate(() => {
      document.getElementById('suraPassword').value = 'REDACTED_PASSWORD';
      window.username = 'CREDACTED_DOC_NUMBER'; window.password = 'REDACTED_PASSWORD';
      login.submit();
    });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log('SSO done:', page.url(), '\n');

  // Wait for all initial API calls to complete
  await new Promise(r => setTimeout(r, 3000));

  // Navigate to autorizaciones section via Angular's router
  console.log('Navigating to autorizaciones...');
  await page.evaluate(() => {
    // Use Angular's state service
    const injector = angular.element(document.body).injector();
    const state = injector.get('$state');
    state.go('ordenes/ingreso');
  });
  await new Promise(r => setTimeout(r, 8000));

  // Check the page
  const pageState = await page.evaluate(() => {
    const scope = angular.element(document.querySelector('[ng-controller]')).scope();
    const rootScope = scope.$root;
    return {
      currentState: rootScope.$state?.current?.name,
      tipoDocAfiliado: rootScope.tipoDocAfiliado,
      numDocAfiliado: rootScope.numDocAfiliado,
      isPac: rootScope.isPac,
      token: !!sessionStorage.getItem('accessToken'),
      scopeLogin: sessionStorage.getItem('scopeLogin'),
      // Check specific controller
      mostrarFormAutenticacion: scope.mostrarFormAutenticacion,
      mostrarOpciones: scope.mostrarOpciones,
      grupoFamiliar: scope.grupoFamiliar,
      usuario: scope.usuario ? {
        tieneAcceso: scope.usuario.tieneAcceso,
        tienePAC: scope.usuario.tienePAC,
        puedeEnviarSolicitudes: scope.usuario.puedeEnviarSolicitudes,
        nombreAfiliado: scope.usuario.nombreAfiliado,
      } : null,
    };
  });
  console.log('\nPage state:', JSON.stringify(pageState, null, 2));

  // Check all visible elements on page
  const visibleContent = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,label,legend,.card-header,.panel-title'))
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent.trim().substring(0, 80))
      .filter(Boolean);
    const forms = Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea'))
      .filter(el => el.offsetParent !== null)
      .map(el => `${el.tagName}[${el.type||''}] #${el.id} ng-model=${el.getAttribute('ng-model')}`);
    const btns = Array.from(document.querySelectorAll('button,input[type=button],.btn'))
      .filter(el => el.offsetParent !== null)
      .map(el => `${el.textContent?.trim()?.substring(0, 40)} ng-click=${el.getAttribute('ng-click')}`);
    return { texts, forms, btns };
  });
  console.log('\nVisible headings:', visibleContent.texts);
  console.log('Visible forms:', visibleContent.forms);
  console.log('Visible buttons:', visibleContent.btns);

  // Print all captured API results
  console.log('\n=== ALL API Results ===');
  for (const [ep, data] of Object.entries(apiResults)) {
    if (data.status === 200) {
      console.log(`\n[200] ${ep}:`);
      console.log(data.body.substring(0, 600));
    }
  }

  await browser.close();
})();
