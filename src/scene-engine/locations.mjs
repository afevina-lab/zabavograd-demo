import childrenRoom from './children-room.mjs?v=20261128-animation';
import {attachGameScene} from './game-adapter.mjs?v=20261128-animation';
export const LOCATIONS={'children-room':childrenRoom};
export function mountLocation(element,id,{base='/',reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}) {
  const scene=LOCATIONS[id];if(!scene)throw Error('Неизвестная локация: '+id);
  return attachGameScene(element,scene,{assetURL:p=>base.replace(/\/?$/,'/')+p,reducedMotion,autoplay:true});
}
