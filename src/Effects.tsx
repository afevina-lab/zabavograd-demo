import {AmbientEffects} from './visual/compositions/AmbientEffects.tsx';
import {THEMES,type ThemeId} from './design-system/themes.ts';
export function Effects({theme,celebrate}:{theme:ThemeId;celebrate:boolean}){return <AmbientEffects {...THEMES[theme].scene.effects} celebrate={celebrate}/>}
