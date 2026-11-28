import {mountScene} from './render.mjs?v=20261128-animation';
/** opt-in bridge: existing game rules and old scene renderer are untouched. */
export function attachGameScene(element,scene,{themeId,compatibility,time=0,assetURL,autoplay=false,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}) {
 if(compatibility&&!compatibility[scene.id]?.includes(themeId))throw Error('Тема не совместима с локацией');
 let stopped=false;const draw=()=>{if(!stopped&&element.clientWidth&&element.clientHeight)mountScene(element,scene,{time,assetURL,reducedMotion});};
 let frame=0,last=performance.now();const tick=now=>{if(stopped)return;if(now-last>=1000/30){time+=(now-last)/1000;last=now;draw();}frame=requestAnimationFrame(tick);};
 const observer=new ResizeObserver(draw);observer.observe(element);draw();if(autoplay&&!reducedMotion)frame=requestAnimationFrame(tick);return {setTime(t){time=t;draw();},destroy(){stopped=true;cancelAnimationFrame(frame);observer.disconnect();element.replaceChildren();}};
}
