import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withReadyFonts} from '../scripts/visual-html-bootstrap.mjs';
import {captureStableFrame} from '../scripts/settle-visual-frame.mjs';
test('capture bootstrap retains stylesheet and defers the exact entry until fonts load',()=>{const html='<link rel="stylesheet" href="/assets/game.css"><script type="module" crossorigin src="/assets/game.js"></script>';const result=withReadyFonts(html);assert(result.includes('<link rel="stylesheet" href="/assets/game.css">'));assert(result.indexOf('await Promise.all')<result.indexOf('await import("/assets/game.js")'));assert(result.includes("['Akt','Akt.ttf'"))});
test('capture bootstrap fails closed when build HTML changes its entry shape',()=>{assert.throws(()=>withReadyFonts('<html></html>'),/no external module/)});
test('stable capture waits for the quiet period after the last compositor change',async()=>{let time=0;const result=await captureStableFrame({capture:async()=>time<400?'transient':'final',now:()=>time,sleep:async ms=>{time+=ms},quietMs:500,pollMs:100,timeoutMs:2000});assert.equal(result,'final');assert.equal(time,900)});
test('stable capture rejects a frame that never settles',async()=>{let time=0;await assert.rejects(captureStableFrame({capture:async()=>String(time),now:()=>time,sleep:async ms=>{time+=ms},quietMs:500,pollMs:100,timeoutMs:900}),/never settled/)});
