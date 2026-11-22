import {useEffect} from 'react';
import type {ThemeId} from './themes.ts';
let enabled=true,combo=0,lastSemantic=0,installed=false;
export function setGameSound(enabledNow:boolean){enabled=enabledNow}
export function resetSoundCombo(){combo=0}
export function soundAsset(event:string,theme:ThemeId='neutral',streak=1){
 if(event==='match')return `combo-${Math.max(1,Math.min(8,streak))}.mp3`;
 return ({window:'window.mp3',wrong:'wrong.mp3',lose:'failure.mp3',win:'success.mp3'} as Record<string,string>)[event]||(theme==='space'?'click-space.mp3':'click.mp3');
}
export function playGameSound(event:string,theme:ThemeId='neutral',allowed=true){
 if(event==='deal'){resetSoundCombo();return}
 // UI clicks are owned by the shared interaction listener.
 if(event==='flip'||event==='click')return;
 if(event==='match')combo++;if(event==='wrong'||event==='lose')combo=0;
 lastSemantic=performance.now();
 if(!enabled||!allowed)return;
 const a=new Audio(import.meta.env.BASE_URL+'assets/audio/'+soundAsset(event,theme,combo));a.volume=.4;void a.play().catch(()=>{});
 window.dispatchEvent(new CustomEvent('zg:audio',{detail:{event,asset:soundAsset(event,theme,combo)}}));
}
export function useGameSoundOutcome(outcome:'win'|'lose'|null){
 useEffect(()=>{if(outcome)playGameSound(outcome);else resetSoundCombo()},[outcome]);
}
export function installGameAudio(){
 if(installed)return;installed=true;
 const windows=()=>new Set(document.querySelectorAll('dialog[open],.modal-backdrop,.game-dialog,.overlay.result,.settings-shade,[popover]:popover-open'));
 let before=windows(),scheduled=false;
 const theme=()=>document.querySelector<HTMLElement>('.app')?.dataset.theme as ThemeId||'neutral';
 const changed=()=>{const next=windows(),different=next.size!==before.size||[...next].some(n=>!before.has(n));before=next;return different};
 const windowSound=()=>{if(changed()&&performance.now()-lastSemantic>100)playGameSound('window',theme())};
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;windowSound()})}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class']});
 document.addEventListener('click',e=>{
  const target=(e.target as Element)?.closest('button,a,input,select,summary,label');
  if(!target||target.matches(':disabled,label,select,input[type=range]')||target.closest('[inert]'))return;
  const at=performance.now();setTimeout(()=>{
   if(changed()){if(lastSemantic<at)playGameSound('window',theme());return}
   if(lastSemantic>=at||!enabled)return;
   const file=soundAsset('click',theme()),a=new Audio(import.meta.env.BASE_URL+'assets/audio/'+file);a.volume=.3;void a.play().catch(()=>{});
   window.dispatchEvent(new CustomEvent('zg:audio',{detail:{event:'click',asset:file}}));
  },0);
 },true);
 document.addEventListener('toggle',()=>requestAnimationFrame(windowSound),true);
 document.addEventListener('change',e=>{if((e.target as Element)?.matches('select,input[type=range]')){const a=new Audio(import.meta.env.BASE_URL+'assets/audio/'+soundAsset('click',theme()));if(enabled)void a.play().catch(()=>{})}});
}
