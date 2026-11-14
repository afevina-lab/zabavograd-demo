export function starsForScore(correct:number,total:number){const percent=total?Math.round(correct/total*100):0;return percent>=81?3:percent>=51?2:percent>=30?1:0;}
