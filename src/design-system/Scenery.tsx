import {Effects} from '../Effects.tsx';
import {SceneLayers} from './SceneLayers.tsx';
import type {ThemeId} from './themes.ts';
export function Scenery({theme,celebrate=false}:{theme:ThemeId;celebrate?:boolean}){
 return <><SceneLayers theme={theme}/><Effects theme={theme} celebrate={celebrate}/></>;
}

