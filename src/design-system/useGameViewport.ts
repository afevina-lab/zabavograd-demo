import {useEffect} from 'react';
/** Settings always return to the scrollable document, even after fullscreen play. */
export function useGameViewport(playing:boolean){
 useEffect(()=>{if(!playing&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});},[playing]);
}

/** Request immersive landscape directly from the user-initiated Start action.
 * Browsers may deny fullscreen or orientation lock; gameplay must still work.
 */
export function enterGameViewport(){
 if(!window.matchMedia('(pointer:coarse)').matches&&navigator.maxTouchPoints===0)return;
 const root=document.querySelector<HTMLElement>('.app');
 if(!root)return;
 const orientation=screen.orientation as (ScreenOrientation & {lock?:(orientation:'landscape')=>Promise<void>})|undefined;
 const lock=()=>orientation?.lock?.('landscape').catch(()=>{});
 if(document.fullscreenElement){void lock();return;}
 if(!root.requestFullscreen)return;
 void root.requestFullscreen().then(lock).catch(()=>{});
}
