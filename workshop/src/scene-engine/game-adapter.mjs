import {mountScene} from './render.mjs';
/** opt-in bridge: existing game rules and old scene renderer are untouched. */
export function attachGameScene(element,scene,{themeId,compatibility,time=0,assetURL,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}) {
 if(compatibility&&!compatibility[scene.id]?.includes(themeId))throw Error('Тема не совместима с локацией');
 let stopped=false;const draw=()=>{if(!stopped&&element.clientWidth&&element.clientHeight)mountScene(element,scene,{time,assetURL,reducedMotion});};
 const observer=new ResizeObserver(draw);observer.observe(element);draw();return {setTime(t){time=t;draw();},destroy(){stopped=true;observer.disconnect();element.replaceChildren();}};
}
