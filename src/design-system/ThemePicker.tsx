import type {ThemeId} from './themes.ts';
import {ThemeChoice} from '../visual/primitives/ThemeChoice.tsx';
export function ThemePicker({theme,setTheme}:{theme:ThemeId;setTheme:(v:ThemeId)=>void}){
 return <ThemeChoice value={theme} onChange={setTheme} thumbnailThemeClass/>;
}

