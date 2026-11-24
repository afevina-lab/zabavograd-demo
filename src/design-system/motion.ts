/** Central interaction timing. NEVER vary by theme. */
export const MOTION=Object.freeze({
 lifeLossMs:560,ambientSwayMs:11000,ambientTwinkleMs:17000,ambientCelebrateMs:3000,cometOneMs:72000,cometTwoMs:97000,cometDelayMs:31000,
 dealMs:5500,dealStaggerMs:700,flipMs:400,flipBackMs:1100,
 mismatchMs:380,matchMs:1650,resultMs:2200,awardFlyMs:1050,awardDelayMs:2220,awardStaggerMs:190,layoutMs:420,
 conveyorFeedbackMs:650,sortVerdictMs:420,sortRetryMs:650,sortWrongMs:600,
 layoutEasing:'cubic-bezier(.2,.8,.2,1)',
} as const);


/** Fallbacks for visual sprite presets when no duration is supplied by an artwork. */
export const SCENE_MOTION_DEFAULTS=Object.freeze({none:0,float:22000,breathe:28000,twinkle:14000,sway:10000,fall:13000,cloud:20000});
