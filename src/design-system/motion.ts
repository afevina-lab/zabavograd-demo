/** Central interaction timing. NEVER vary by theme. */
export const MOTION=Object.freeze({
 dealMs:5500,dealStaggerMs:700,flipMs:400,flipBackMs:1100,
 mismatchMs:380,matchMs:1650,resultMs:2200,awardDelayMs:2220,awardStaggerMs:190,layoutMs:420,
 sortVerdictMs:420,sortRetryMs:650,sortWrongMs:600,
 layoutEasing:'cubic-bezier(.2,.8,.2,1)',
} as const);
