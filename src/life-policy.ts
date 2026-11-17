export type LifeMode='manual'|'mistakes'|'both';
export const manualLives=(mode:LifeMode)=>mode!=='mistakes';
export const automaticLives=(mode:LifeMode)=>mode!=='manual';
export const spendLives=(value:number,errors=1)=>Math.max(0,value-Math.max(0,errors)*.5);
