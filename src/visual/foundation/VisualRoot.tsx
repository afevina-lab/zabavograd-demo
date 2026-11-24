import {BOARD_METRICS} from './geometry.ts';
import type {CSSProperties,ReactNode} from 'react';
import {themeAttributes,themeVars,type ThemeId} from '../../design-system/themes.ts';
import {MOTION} from '../../design-system/motion.ts';
/** One adapter to the existing art and motion registries. No duplicate theme catalogue. */
export function VisualRoot({theme,children}:{theme:ThemeId;children:ReactNode}){
 const variables={...themeVars(theme,import.meta.env.BASE_URL),'--v-bank-card-min':BOARD_METRICS.bankMinimum+'px','--v-placed-card-min':BOARD_METRICS.placedMinimum+'px','--v-feedback-duration':MOTION.conveyorFeedbackMs+'ms','--v-layout-duration':`${MOTION.layoutMs}ms`,'--v-layout-easing':MOTION.layoutEasing} as CSSProperties;
 return <div className="v-root" {...themeAttributes(theme)} style={variables}>{children}</div>;
}



