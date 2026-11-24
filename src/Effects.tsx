import {AmbientEffects,type AmbientClasses} from './visual/compositions/AmbientEffects.tsx';
import {THEMES,type ThemeId} from './design-system/themes.ts';
const legacy:AmbientClasses={root:'effects sky-stars',celebrate:'sky-celebrate',star:'sky-star',shape:'procedural-star',comet:'procedural-comet',cometOne:'comet-one',cometTwo:'comet-two'};
export function Effects({theme,celebrate,classNames=legacy}:{theme:ThemeId;celebrate:boolean;classNames?:AmbientClasses}){
 return <AmbientEffects {...THEMES[theme].scene.effects} celebrate={celebrate} classNames={classNames}/>;
}
