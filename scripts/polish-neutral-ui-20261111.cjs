'use strict';
/*
 * Release-layer patch for the public zabavograd-demo gh-pages site.
 * Run AFTER the checksum-verified 20261111 package installer.
 * It changes only the public game's UI JS/CSS/HTML, not the vocabulary.
 * The base ZIP and all its checksums are left intact for reproducible builds.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'assets/zabavograd-ui-20261111.js');
const htmlPath = path.join(root, 'index.html');
const polishSource = path.join(root, 'release/neutral-polish-20261111.css');
const polishDest = path.join(root, 'assets/neutral-polish-20261111.css');
const paper = path.join(root, 'assets/neutral/background-paper-2560.webp');

assert(fs.statSync(paper).size > 30000, 'High-resolution neutral background missing');
assert(fs.readFileSync(paper).toString('ascii', 0, 4) === 'RIFF', 'Expected a WebP file');

let js = fs.readFileSync(jsPath, 'utf8');
const startNeedle = 't.animate([{transform:`none`},{transform:`translate(';
const endNeedle = '}],{duration:2300,easing:`ease-in-out`})';
const start = js.indexOf(startNeedle);
assert(start >= 0, 'Expected whole-board match zoom was not found in JS; inspect updated compiler output');
const end = js.indexOf(endNeedle, start);
assert(end >= start && end - start < 500, 'Could not safely isolate whole-board zoom');
assert(!js.slice(start, end).includes('})}}'), 'Unexpected compiled code structure');
// Found cards already have CSS animations; do not apply a second transform to their board.
js = js.slice(0, start) + 'void 0' + js.slice(end + endNeedle.length);
assert(!js.includes('scale(1.08)'), 'Whole-board zoom remains in JS');
fs.writeFileSync(jsPath, js);

fs.copyFileSync(polishSource, polishDest);
const css = fs.readFileSync(polishDest, 'utf8');
assert(css.includes('border-image:none!important') && css.includes('background-paper-2560.webp'),
  'Expected seamless cards and new paper background in CSS');

let html = fs.readFileSync(htmlPath, 'utf8');
assert(html.includes('/zabavograd-demo/assets/zabavograd-ui-20261111.js'), 'Unexpected public application script URL');
assert(html.includes('</head>'), 'No head element for neutral polish stylesheet');
// Cache bust the modified compiled JS and load overrides after the original CSS.
html = html.replace('assets/zabavograd-ui-20261111.js"', 'assets/zabavograd-ui-20261111.js?rev=neutral-2"');
html = html.replace('</head>',
  '  <link rel="stylesheet" href="/zabavograd-demo/assets/neutral-polish-20261111.css?rev=2">\n' +
  '  <meta name="zabavograd-ui-release" content="neutral-polish-20261111-2">\n</head>');
assert(html.includes('neutral-polish-20261111.css') && html.includes('neutral-2'), 'Incomplete HTML patch');
fs.writeFileSync(htmlPath, html);

console.log('Patched demo UI: removed board-wide match zoom, installed seamless card CSS and 2560px paper. Vocabulary untouched.');
