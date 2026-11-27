// Experimental mode is explicit and persists only for this browser tab,
// including the OAuth callback. Never fall back to full-library reads.
const mode=new URLSearchParams(location.search).get('modular');
if(mode==='1'||mode==='0')sessionStorage.setItem('zg-editor-modular',mode);
if(sessionStorage.getItem('zg-editor-modular')==='1'){
 const {startModularEditor}=await import('./modular-ui.mjs');
 await startModularEditor();
}else await import('./app.js');
