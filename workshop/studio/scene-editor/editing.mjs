import {inverse,point,resolveVariant} from '../../src/scene-engine/engine.mjs';

/** Stable layer movement, including descendants of selected groups. */
export function reorderedLayers(nodes, selection, direction) {
  const chosen = new Set(selection);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) if (chosen.has(node.parent) && !chosen.has(node.id)) {
      chosen.add(node.id);
      changed = true;
    }
  }
  const order = [...nodes].sort((a,b)=>a.z-b.z);
  const previous = order.map(n=>n.id).join('|');
  if (direction === 'up') {
    for (let i=order.length-2;i>=0;i--) if (chosen.has(order[i].id) && !chosen.has(order[i+1].id)) {
      [order[i],order[i+1]] = [order[i+1],order[i]];
    }
  } else if (direction === 'down') {
    for (let i=1;i<order.length;i++) if (chosen.has(order[i].id) && !chosen.has(order[i-1].id)) {
      [order[i],order[i-1]] = [order[i-1],order[i]];
    }
  } else throw Error('Неизвестное направление слоя');
  if (order.map(n=>n.id).join('|') === previous) return [];
  return order.map((node,z)=>({id:node.id,z})).filter(({id,z})=>nodes.find(n=>n.id===id).z!==z);
}

export function socketPosition(item, viewportPoint) {
  const local = point(inverse(item.matrix), viewportPoint);
  const x = local.x/item.source.width, y = local.y/item.source.height;
  if (x < -1e-6 || y < -1e-6 || x > 1+1e-6 || y > 1+1e-6) throw Error('Нажмите внутри выбранного предмета. Esc — отмена.');
  return {x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))};
}

export function nextSocket(node) {
  let index=1;
  while(Object.hasOwn(node.sockets||{},'point-'+index)) index++;
  return {id:'point-'+index,name:'Точка '+index};
}

export function socketUsers(scene, target, socket) {
  const users = new Set();
  for (const node of scene.nodes) if (node.attachment?.target===target && node.attachment.socket===socket) users.add(node.name);
  for (const variant of scene.variants||[]) for (const node of resolveVariant(scene,scene.width,scene.height,variant.id).scene.nodes) {
    if(node.attachment?.target===target && node.attachment.socket===socket) users.add(node.name);
  }
  return [...users];
}

export function parseSceneCode(text) {
  const stripped=String(text).trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/,'$1');
  let value;
  try { value=JSON.parse(stripped); }
  catch { throw Error('Не удалось прочитать код сцены. Нужен JSON-файл мастерской или JSON-код без JavaScript.'); }
  if(!value || typeof value!=='object' || Array.isArray(value)) throw Error('В файле должна быть конфигурация сцены.');
  if(value.format==='zabavograd-scene-document' || value.schemaVersion===1 && Array.isArray(value.nodes)) return value;
  throw Error('Это не документ сцены. Откройте файл .zabavograd-scene.json или JSON-конфигурацию сцены.');
}
