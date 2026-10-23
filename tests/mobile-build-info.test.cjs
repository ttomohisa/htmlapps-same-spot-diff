const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const originalBuild="<div class=\"build-info\"><span data-i18n=\"runtimeInfo\">比較機能は最初に使うときだけ端末内で準備します。</span> <span id=\"buildMeta\"></span></div>";
test('existing metadata block is unique and the final Help scroll-body child',()=>{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];assert.doesNotMatch(main,/id="buildMeta"/);
 const help=html.match(/<dialog id="helpDialog"[^>]*>([\s\S]*?)<\/dialog>/)[1];
 const start=help.search(/<div class="dialog-body"[^>]*>/);let depth=0,end=-1;
 for(const m of help.slice(start).matchAll(/<div\b[^>]*>|<\/div>/g)){depth+=m[0].startsWith('</')?-1:1;if(depth===0){end=start+m.index;break;}}
 assert.ok(end>start);const body=help.slice(start,end);assert.ok(body.includes(originalBuild));
 assert.match(body.slice(body.indexOf(originalBuild)+originalBuild.length),/^\s*(?:<!--[^]*?-->\s*)?$/);
 for(const id of ["buildMeta"])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
});
test('only the informational page footer is hidden at the existing mobile breakpoint',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];const start=css.search(/@media\s*\(max-width:\s*600px\)\s*\{/);assert.ok(start>=0);
 const open=css.indexOf('{',start);let depth=1,end=open+1;for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
 assert.match(css.slice(open+1,end-1),/(?:^|})\s*footer\s*\{\s*display:\s*none\s*;?\s*\}/);
});
test('the exact Japanese local-processing badge has the canonical English equivalent',()=>{
 assert.match(html,/localBadge: '完全ローカル処理'/);assert.match(html,/localBadge: 'Fully local processing'/);
 assert.match(html,/画像と比較結果はこの端末内だけで処理されます/);
});

test('Help allocates remaining height to its scroll body without shrinking the header',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 assert.match(css,/#helpDialog\[open\]\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;?\s*\}/);
 assert.match(css,/#helpDialog \.dialog-header\s*\{\s*flex:\s*none;?\s*\}/);
 assert.match(css,/#helpDialog \.dialog-body\s*\{\s*min-height:\s*0;\s*flex:\s*1 1 auto;?\s*\}/);
});
