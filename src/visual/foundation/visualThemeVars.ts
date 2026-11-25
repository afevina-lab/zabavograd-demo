import type {CSSProperties} from 'react';
import {themeVars,type ThemeId} from '../../design-system/themes.ts';
import {MOTION} from '../../design-system/motion.ts';
import {BOARD_METRICS} from './geometry.ts';
/** The same theme and geometry variables for the lab and every real game. */
export function visualThemeVars(theme:ThemeId,base:string):CSSProperties{
 return {...themeVars(theme,base),'--v-bank-card-min':BOARD_METRICS.bankMinimum+'px','--v-placed-card-min':BOARD_METRICS.placedMinimum+'px','--v-feedback-duration':MOTION.conveyorFeedbackMs+'ms','--v-layout-duration':MOTION.layoutMs+'ms','--v-layout-easing':MOTION.layoutEasing} as CSSProperties;
}
