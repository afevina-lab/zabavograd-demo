import {LocationScene} from './LocationScene.tsx';
import {SceneSprites} from '../visual/compositions/SceneSprites.tsx';
import {THEMES,assetUrl,type ThemeId} from './themes.ts';
/** Theme-specific art and framing are resolved by the registry adapter. */
export function SceneLayers({theme}:{theme:ThemeId}){
 const scene=THEMES[theme].scene;
 if(scene.location)return <LocationScene location={scene.location}/>;
 return <SceneSprites sprites={scene.sprites.map(sprite=>({...sprite,src:assetUrl(sprite.src,import.meta.env.BASE_URL)}))} layout={scene.layout}/>;
}
