'use strict';
// Run against the official generated files in the unprivileged PR build job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const os = require('node:os');
const baselineSha = 'e9b4111bc472eabafebde7dcd9cec0373221bece';
// Only browser-assigned blob UUIDs differ; keep error text, frames, line and column exact.
const normalizeLoaderErrors = errors => errors.map(message => message.replace(/blob:null\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=:\d+:\d+)/g, 'blob:null/<runtime-object-url>'));
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
async function smoke(page,results,file,baselineFailure,errors){
 await startSyntheticComparison(page);
 if(file==='dist/index.self-extract.html'){
   assert.equal(await page.locator('#saveButton').isDisabled(),true,'known loader CSP limitation must match immutable baseline');
   assert.equal(await page.locator('#errorBox').innerText(),baselineFailure.message,'loader error must exactly match immutable baseline');
   assert.deepEqual(normalizeLoaderErrors(errors),normalizeLoaderErrors(baselineFailure.errors),'no additional loader errors beyond the observed baseline');
   fs.writeFileSync(path.join(results,'current-loader-csp.json'),JSON.stringify({base:baselineSha,message:await page.locator('#errorBox').innerText(),errors},null,2));
   errors.length=0;
   console.log('KNOWN BASELINE LIMITATION '+baselineSha+' self-extract comparison blocked by unchanged loader CSP; layout still strictly verified');
   return;
 }
 assert.equal(await page.locator('#saveButton').isDisabled(),false,file+': readable comparison must succeed');
 await page.locator('#outputFilename').fill('mobile-help-diff');
 const pending=page.waitForEvent('download');await page.locator('#saveButton').click();const download=await pending;assert.equal(download.suggestedFilename(),'mobile-help-diff.png');
 const target=path.join(results,file==='same-spot-diff.html'?'synthetic-root.png':'synthetic-readable.png');await download.saveAs(target);const bytes=fs.readFileSync(target);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),400);assert.equal(bytes.readUInt32BE(20),300);
 console.log('PASS synthetic image alignment to edited-name PNG '+file);
}

async function observeBaselineLoader(browser,results){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'same-spot-loader-baseline-'));
 const context=await browser.newContext({viewport:{width:360,height:640},locale:'ja',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
 try{
   const gitFile=name=>execFileSync('git',['show',baselineSha+':'+name],{cwd:path.resolve(__dirname,'..'),maxBuffer:8*1024*1024});
   const builder=gitFile('scripts/build-self-extract.ps1');
   assert.equal(builder.toString().replace(/\r\n/g,'\n'),fs.readFileSync(path.join(__dirname,'build-self-extract.ps1'),'utf8').replace(/\r\n/g,'\n'),'official loader builder remains unchanged');
   const input=path.join(temporary,'baseline-readable.html'),output=path.join(temporary,'baseline-loader.html'),script=path.join(temporary,'build-self-extract.ps1');
   fs.writeFileSync(input,gitFile('same-spot-diff.html'));fs.writeFileSync(script,builder);
   fs.writeFileSync(path.join(temporary,'verify-self-extract.ps1'),gitFile('scripts/verify-self-extract.ps1'));
   execFileSync('pwsh',['-NoProfile','-File',script,'-InputPath',input,'-OutputPath',output],{stdio:'pipe',maxBuffer:4*1024*1024});
   const csp=html=>html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)[0];
   assert.equal(csp(fs.readFileSync(output,'utf8')),csp(fs.readFileSync(path.join(__dirname,'../dist/index.self-extract.html'),'utf8')),'immutable base and head loader policies match');
   await page.goto(pathToFileURL(output).href);await page.locator('#helpButton').waitFor();
   if(await page.locator('html').getAttribute('lang')!=='ja')await page.locator('#languageButton').click();
   await startSyntheticComparison(page);
   const message=await page.locator('#errorBox').innerText();
   assert.equal(await page.locator('#saveButton').isDisabled(),true);assert.match(message,/WebAssembly\.Module/);assert.match(message,/Content Security Policy/);assert.match(message,/unsafe-eval/);
   assert.ok(errors.length>0);assert.ok(errors.every(error=>/WebAssembly|unsafe-eval|Content Security Policy/.test(error)));assert.deepEqual(requests,[]);
   await page.screenshot({path:path.join(results,'known-baseline-loader-csp.png')});
   const evidence={base:baselineSha,message,errors};fs.writeFileSync(path.join(results,'known-baseline-loader-csp.json'),JSON.stringify(evidence,null,2));
   console.log('BASELINE LOADER CSP '+JSON.stringify(evidence));return evidence;
 }finally{await context.close();fs.rmSync(temporary,{recursive:true,force:true});}
}

async function main() {
  const results = path.resolve(__dirname, '..', 'test-results', 'mobile-help');
  fs.mkdirSync(results, { recursive: true });
  const browser = await chromium.launch();
  try {
    const baselineFailure=await observeBaselineLoader(browser,results);
    for (const file of ['dist/index.html', 'dist/index.self-extract.html', 'same-spot-diff.html']) {
      for (const language of ['ja', 'en']) {
        for (const [width, height] of [[1360, 900], [601, 568], [600, 568], [360, 640], [320, 568], [393, 252]]) {
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
            assert.ok(await page.locator('.local-badge').evaluate(el => {
              const box = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el.querySelector('[data-i18n="localBadge"]'));
              return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1
                && [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1);
            }), label + ': badge text fits');
            assert.equal(await page.locator('main #buildMeta').count(), 0, label);
            assert.equal(await page.locator('footer').isVisible(), width > 600, label);
            await prepareApp(page, width, label);

            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');

            await page.locator('#helpButton').click();
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
            if(language==='ja' && width===360) await smoke(page,results,file,baselineFailure,errors);
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
