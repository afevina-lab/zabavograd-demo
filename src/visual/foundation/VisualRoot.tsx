import type {ReactNode} from 'react';
import {themeAttributes,type ThemeId} from '../../design-system/themes.ts';
import {visualThemeVars} from './visualThemeVars.ts';
export function VisualRoot({theme,children}:{theme:ThemeId;children:ReactNode}){
 return <div className="v-root" {...themeAttributes(theme)} style={visualThemeVars(theme,import.meta.env.BASE_URL)}>{children}</div>;
}
