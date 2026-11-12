'use strict';
// Run against the official generated files in the unprivileged PR build job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const buildSelector = '.build-info';


async function prepareApp(page,width,label){
 assert.equal(await page.locator('#mobileBar').isVisible(),width<=600,label+': functional comparison bar');
 if(width<=600) assert.ok(await page.locator('#mobileBar').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),label+': functional bar fits viewport');
}
async function startSyntheticComparison(page){
 const images=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const c=canvas.getContext('2d');c.fillStyle='#ddd';c.fillRect(0,0,400,300);let seed=31;
   for(let i=0;i<180;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%380+10;seed=(seed*1664525+1013904223)>>>0;const y=seed%280+10;c.fillStyle=i%2?'#222':'#777';c.fillRect(x,y,5+i%9,5+i%7);}
   const before=canvas.toDataURL('image/png');c.fillStyle='#c22';c.fillRect(175,125,35,35);return[before,canvas.toDataURL('image/png')];
 });
 for(const [i,id] of ['referenceInput','compareInput'].entries())await page.locator('#'+id).setInputFiles({name:'synthetic-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(images[i].split(',')[1],'base64')});
 await page.waitForFunction(()=>!document.querySelector('#compareButton').disabled);await page.locator('#compareButton').click();
 await page.waitForFunction(()=>!document.querySelector('#saveButton').disabled || document.querySelector('#errorBox').classList.contains('show'),null,{timeout:40000});
}
async function smoke(page,results,file){
 await startSyntheticComparison(page);
 assert.equal(await page.locator('#saveButton').isDisabled(),false,file+': comparison must succeed in every standalone variant');
 await page.locator('#outputFilename').fill('mobile-help-diff');
 const pending=page.waitForEvent('download');await page.locator('#saveButton').click();const download=await pending;assert.equal(download.suggestedFilename(),'mobile-help-diff.png');
 const suffix=file==='dist/index.self-extract.html'?'self-extract':file==='same-spot-diff.html'?'root':'readable';
 const target=path.join(results,'synthetic-'+suffix+'.png');await download.saveAs(target);const bytes=fs.readFileSync(target);
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),400);assert.equal(bytes.readUInt32BE(20),300);
 console.log('PASS synthetic image alignment to edited-name PNG '+file);
}

async function auditHeader(page, label) {
  const badge = page.locator('header #versionBadge');
  assert.equal(await badge.textContent(), 'v' + require('../app.config.json').version, label + ': current header version');
  assert.equal(await badge.isVisible(), true, label + ': version visible');
  const clipped = await badge.evaluate(el => {
    const r = el.getBoundingClientRect(), problems = [];
    if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) problems.push('outside viewport');
    if (el.scrollWidth > el.clientWidth + 1) problems.push('version text clipped');
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left < b.left - 1 || r.right > b.right + 1)) problems.push('ancestor clips x: ' + p.className);
      if (/hidden|clip|auto|scroll/.test(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1)) problems.push('ancestor clips y: ' + p.className);
    }
    return problems;
  });
  assert.deepEqual(clipped, [], label + ': complete header version remains readable');
  const help = page.locator('#helpButton svg');
  assert.equal(await help.isVisible(), true, label + ': Help icon visible');
  assert.ok(await help.evaluate(svg => {
    const paths = [...svg.querySelectorAll('path')], shape = paths.map(p => p.getAttribute('d')).join(' ');
    return /[aAcC]/.test(shape) && paths.some(p => /[hH]\.01/.test(p.getAttribute('d')) && getComputedStyle(p).strokeLinecap === 'round') && svg.getBBox().width > 0;
  }), label + ': question-mark curve and painted dot, not information icon');
  const shield = page.locator('.local-badge svg');
  if (await shield.count()) {
    assert.ok(await shield.evaluate(svg => [...svg.querySelectorAll('path')].some(p => /^M12 3 5 6/.test(p.getAttribute('d')))), label + ': local-processing shield');
  }
}

async function main() {
  const results = path.resolve(__dirname, '..', 'test-results', 'mobile-help');
  fs.mkdirSync(results, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const file of ['dist/index.html', 'dist/index.self-extract.html', 'same-spot-diff.html']) {
      for (const language of ['ja', 'en']) {
        for (const [width, height] of [[1360, 900], [601, 568], [600, 568], [360, 640], [390,844], [320, 568], [393, 252]]) {
          const context = await browser.newContext({ viewport: { width, height }, locale: language, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const errors = [], requests = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
          const label = `${file} ${language} ${width}x${height}`;
          try {
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href);
            await page.locator('#helpButton').waitFor();
            if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
            await page.locator('#languageButton').click();await page.locator('#languageButton').click();
            assert.equal(await page.locator('html').getAttribute('lang'),language,label+': repeated language toggles');
            for(const id of ['buildMeta']){assert.equal(await page.locator('#'+id).count(),1,label+': unique metadata after toggles');assert.ok(!['','—','-'].includes((await page.locator('#'+id).textContent()).trim()),label+': populated metadata after toggles');}
            assert.equal(await page.locator('[data-i18n="localBadge"]').textContent(), language === 'en' ? 'Fully local processing' : '完全ローカル処理', label);
            assert.equal(await page.locator('.local-badge').isVisible(), width > 600, label + ': badge is desktop-only');
            if (width > 600) assert.ok(await page.locator('.local-badge').evaluate(el => {
              const box = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el.querySelector('[data-i18n="localBadge"]'));
              return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1
                && [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1);
            }), label + ': desktop badge text fits');
            const hero = page.locator('#heroTitle');
            assert.equal(await hero.innerText(), language === 'ja' ? '2枚の写真を比較' : 'Compare two photos', label + ': task-first title');
            const heroMetrics = async () => hero.evaluate(el => {
              const styles = getComputedStyle(el);
              return {
                fontSize: styles.fontSize,
                lineHeight: styles.lineHeight,
                fits: el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().height <= parseFloat(styles.lineHeight) * 1.1
              };
            });
            const beforeLanguageChange = await heroMetrics();
            assert.equal(beforeLanguageChange.fits, true, label + ': one-line hero title fits');
            await page.locator('#languageButton').click();
            const otherLanguage = await heroMetrics();
            assert.equal(otherLanguage.fits, true, label + ': other-language hero title fits');
            assert.equal(otherLanguage.fontSize, beforeLanguageChange.fontSize, label + ': Japanese/English hero font size');
            assert.equal(otherLanguage.lineHeight, beforeLanguageChange.lineHeight, label + ': Japanese/English hero line height');
            await page.locator('#languageButton').click();
            assert.equal(await page.locator('main #buildMeta').count(), 0, label);
            assert.equal(await page.locator('footer').isVisible(), width > 600, label);
            await prepareApp(page, width, label);

            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');

            await auditHeader(page, label);
        if (file === 'dist/index.html' && [320,360,390,1360].includes(width)) await page.screenshot({path:path.join(results, `${language}-${width}-main.png`)});
        await page.locator('#helpButton').click();
        const visibleHelpText = await page.locator('#helpDialog').innerText();
        assert.doesNotMatch(visibleHelpText, /(?:EN\s*\/\s*JA|JA\s*[\/／]\s*EN|ヘッダーのEN|Use EN in the header)/, label + ': redundant language instructions removed');

            const body = page.locator('#helpDialog .dialog-body');
            assert.ok(await body.evaluate(el => el.lastElementChild.contains(document.querySelector('#buildMeta'))), label + ': build is final body child');
            assert.equal(await page.locator(buildSelector).count(), 1, label);
            assert.equal(await page.locator(buildSelector).isVisible(), true, label);
            for (const id of ['buildMeta']) assert.equal(await page.locator('#' + id).count(), 1, label);

            assert.match(await page.locator('#buildMeta').innerText(), /v[0-9].*\d{4}/, label + ': populated version and timestamp');
            await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const finalItem = page.locator('#buildMeta');
            const finalBox = await finalItem.boundingBox(), bodyBox = await body.boundingBox();
            console.log('GEOMETRY ' + label + ' ' + JSON.stringify({ finalBox, bodyBox, viewportHeight: height }));
            assert.ok(finalBox && bodyBox && finalBox.y >= 0 && finalBox.y + finalBox.height <= height && finalBox.y >= bodyBox.y - 1 && finalBox.y + finalBox.height <= bodyBox.y + bodyBox.height + 1, label + ': final Help item reachable');
            assert.ok(await body.evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': Help width');
            const headerBox = await page.locator('#helpDialog .dialog-header').boundingBox();
            assert.ok(headerBox && headerBox.x >= 0 && headerBox.x + headerBox.width <= width && headerBox.y >= 0 && headerBox.y + headerBox.height <= height, label + ': header visible');
            const closeBox=await page.locator('#closeHelpButton').boundingBox();
            assert.ok(closeBox && closeBox.x>=0 && closeBox.x+closeBox.width<=width && closeBox.y>=headerBox.y && closeBox.y+closeBox.height<=headerBox.y+headerBox.height+1,label+': Close fits header');
            if (file === 'dist/index.html' && [1360, 320].includes(width)) {
              await page.screenshot({ path: path.join(results, `help-${language}-${width}.png`) });
            }
            const dialogBox = await page.locator('#helpDialog').boundingBox();
            assert.ok(finalBox.y >= dialogBox.y - 1 && finalBox.y + finalBox.height <= dialogBox.y + dialogBox.height + 1, label + ': final item inside dialog');
            assert.ok(dialogBox.y > 1, label + ': top coordinate is genuine backdrop');
            const beforeScroll = await page.evaluate(() => scrollY);
            await page.mouse.move(2, 1);
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => scrollY), beforeScroll, label + ': background locked');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': Escape');
            await page.locator('#helpButton').click();
            await page.locator('#closeHelpButton').click();
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': reopen and Close');
            await page.locator('#helpButton').click();
            await page.mouse.click(2, 1);
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': backdrop');
            if(language==='ja' && width===360) await smoke(page,results,file);
            assert.deepEqual(errors, [], label + ': console errors');
            assert.deepEqual(requests, [], label + ': external runtime requests');
            console.log('PASS ' + label);
          } catch (error) {
            await page.screenshot({ path: path.join(results, `failure-${file.replace(/[^a-z0-9]/gi, '-')}-${language}-${width}x${height}.png`) }).catch(() => {});
            throw error;
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
