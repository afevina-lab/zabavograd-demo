import {useEffect} from 'react';
/** Settings always return to the scrollable document, even after fullscreen play. */
export function useGameViewport(playing:boolean){
 useEffect(()=>{if(!playing&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});},[playing]);
}
