import type {CSSProperties} from 'react';
import {THEMES,assetUrl,type ThemeId} from './themes.ts';

/** Universal scene sprite renderer: themes only supply assets and placement data. */
export function SceneLayers({theme}:{theme:ThemeId}){
 const sprites=THEMES[theme].scene.sprites;
 if(!sprites.length)return null;
 return <div className="zg-scene-layers" aria-hidden="true">{sprites.map(sprite=>
  <img key={sprite.id} alt="" className="zg-scene-sprite" data-zg-motion={sprite.motion}
    src={assetUrl(sprite.src,import.meta.env.BASE_URL)}
    style={{
      width:sprite.width,left:sprite.left,right:sprite.right,top:sprite.top,bottom:sprite.bottom,
      opacity:sprite.opacity??1,transformOrigin:sprite.origin||undefined,
      '--zg-sprite-duration':sprite.durationMs?String(sprite.durationMs)+'ms':undefined,
      '--zg-sprite-delay':sprite.delayMs?String(sprite.delayMs)+'ms':undefined
    } as CSSProperties}/>)}</div>;
}
