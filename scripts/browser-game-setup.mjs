// Shared real-UI setup for CI probes; no application state injection.
export function createGameSetup({cmd,evaluate,until,origin,themeIndex}){
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function choose(selector,value){await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing select');e.value="+JSON.stringify(value)+";e.dispatchEvent(new Event('change',{bubbles:true}))})()");await sleep(100)}
async function setup(game,{timed=false,rounds=1}={}){
 await cmd('Page.navigate',{url:origin+'?game='+game});await until("!!document.querySelector(':is(.v-settings-scroll,.unified-settings-content)')");
 await evaluate("document.querySelectorAll(':is(.v-theme-choice,.themes) button')["+themeIndex+"]?.click()");
 if(game==='sorting'){
 for(let i=0;i<2;i++){
 await evaluate("(()=>{const e=document.querySelectorAll('.sort-group-settings>:is(.v-settings-section,.settings-block)')["+i+"].querySelector('select[aria-label=\"Учебная задача\"]');e.value='lexical';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 await sleep(150);
 await evaluate("document.querySelectorAll('.sort-group-settings>:is(.v-settings-section,.settings-block)')["+i+"].querySelector(':is(.v-picker-trigger,.category-picker-trigger)').click()");
 await until("[...document.querySelectorAll('.category-picker[open] :is(.v-selection-tree,.category-grid)>li summary')].some(e=>e.textContent.includes("+JSON.stringify(i?'Дом и быт':'Животный мир')+"))");
 await evaluate("(()=>{const d=document.querySelector('.category-picker[open]');d.querySelectorAll('input:checked').forEach(e=>e.click());const nodes=[...d.querySelectorAll(':is(.v-selection-tree,.category-grid)>li')];const n=nodes.find(e=>e.querySelector('summary')?.textContent.includes('"+(i?'Дом и быт':'Животный мир')+"'));if(!n)throw Error('Category missing');n.querySelector('details').open=true;n.querySelector('input').click()})()");
 await sleep(100);await evaluate("document.querySelector('.category-picker[open] :is(.v-button--primary,.primary)').click()");await sleep(200);
 }
 }
 if(game==='matching')await choose('select[aria-label="Учебная задача"]','math');
 await evaluate("(()=>{const d=document.querySelector('.challenge');d.open=true;const label=[...d.querySelectorAll('label')].find(e=>e.textContent==='Жизни');const e=label.querySelector('input');if(!e.checked)e.click()})()");
 if(timed)await evaluate("(()=>{const d=document.querySelector('.challenge');const label=[...d.querySelectorAll('label')].find(e=>e.textContent.startsWith('На время'));if(!label)throw Error('Missing timer toggle');const e=label.querySelector('input');if(!e.checked)e.click()})()");
 for(let round=1;round<rounds;round++)await evaluate("document.querySelector('button[aria-label=\"Увеличить: Количество раундов\"]').click()");
 await until("!![...document.querySelectorAll(':is(.v-settings-footer,.setup-footer) button')].find(e=>e.textContent.startsWith('Начать')&&!e.disabled)");
 await evaluate("[...document.querySelectorAll(':is(.v-settings-footer,.setup-footer) button')].find(e=>e.textContent.startsWith('Начать')&&!e.disabled).click()");
 await until("!!document.querySelector('.app.game-active')||!!document.querySelector('[aria-label^=\"Разделить игру на \"]')");
 if(await evaluate("!!document.querySelector('[aria-label^=\"Разделить игру на \"]')"))await evaluate("document.querySelector('[aria-label^=\"Разделить игру на \"] :is(.v-button--secondary,.secondary)').click()");
 await until("!!document.querySelector('.app.game-active')");
}
return setup;
}
