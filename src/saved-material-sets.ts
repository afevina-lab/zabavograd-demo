import type {Learning} from './learning.ts';
import type {Filters} from './material-types.ts';

// One versioned, portable document per browser origin. No games, assets, passwords,
// or pupil information are written here — only teacher-approved word IDs and rules.
export const MATERIAL_SETS_KEY='zabavograd.material-sets.v1';
const VERSION=1;
const MAX_SETS=200;
export type SavedMaterialSet={
 id:string;name:string;createdAt:string;updatedAt:string;
 learning:Learning;filters:Filters;
};
export type StorageLike=Pick<Storage,'getItem'|'setItem'>;

function validSet(value:unknown):value is SavedMaterialSet {
 if(!value||typeof value!=='object')return false;
 const p=value as Partial<SavedMaterialSet>;
 return typeof p.id==='string'&&p.id.length>0&&typeof p.name==='string'&&p.name.length>0
  &&typeof p.createdAt==='string'&&typeof p.updatedAt==='string'
  &&!!p.learning&&typeof p.learning.mode==='string'&&Array.isArray(p.learning.sounds)
  &&!!p.learning.rules&&typeof p.learning.rules==='object'
  &&!!p.filters&&typeof p.filters.topic==='string'&&typeof p.filters.subcategory==='string'
  &&typeof p.filters.position==='string'&&Array.isArray(p.filters.types)
  &&typeof p.filters.untyped==='boolean'&&typeof p.filters.noOpposition==='boolean';
}
export function readMaterialSets(storage:StorageLike=localStorage):SavedMaterialSet[]{
 const raw=storage.getItem(MATERIAL_SETS_KEY);
 if(raw===null)return [];
 let document:unknown;
 try{document=JSON.parse(raw)}catch{throw Error('Не удалось прочитать сохранённые наборы. Данные в браузере не изменены.')}
 if(!document||typeof document!=='object')throw Error('Неизвестный формат сохранённых наборов.');
 const value=document as {version?:unknown;sets?:unknown};
 if(value.version!==VERSION||!Array.isArray(value.sets)||!value.sets.every(validSet))
  throw Error('Неподдерживаемый или повреждённый формат наборов. Данные не перезаписаны.');
 return value.sets;
}
function store(sets:SavedMaterialSet[],storage:StorageLike){
 storage.setItem(MATERIAL_SETS_KEY,JSON.stringify({version:VERSION,sets}));
 return sets;
}
export function saveMaterialSet(
 data:{name:string;learning:Learning;filters:Filters},
 id?:string,storage:StorageLike=localStorage
):SavedMaterialSet[]{
 const name=data.name.trim().slice(0,80);
 if(!name)throw Error('Введите название набора.');
 const sets=readMaterialSets(storage),old=id?sets.find(s=>s.id===id):undefined;
 if(id&&!old)throw Error('Набор не найден. Выберите его заново.');
 if(!old&&sets.length>=MAX_SETS)throw Error('Достигнут предел в 200 наборов. Удалите ненужные.');
 if(data.learning.selectionMode==='approved'&&!data.learning.approvedWordIds?.length)
  throw Error('Для режима «Только одобренные» нужно выбрать слова.');
 const now=new Date().toISOString();
 const value:SavedMaterialSet={id:old?.id||globalThis.crypto?.randomUUID?.()||('set-'+Date.now()+'-'+Math.random().toString(36).slice(2)),
  name,createdAt:old?.createdAt||now,updatedAt:now,
  learning:JSON.parse(JSON.stringify(data.learning)) as Learning,
  filters:JSON.parse(JSON.stringify(data.filters)) as Filters};
 return store(old?sets.map(s=>s.id===old.id?value:s):[...sets,value],storage);
}
export function deleteMaterialSet(id:string,storage:StorageLike=localStorage):SavedMaterialSet[]{
 const sets=readMaterialSets(storage);
 if(!sets.some(s=>s.id===id))throw Error('Набор не найден.');
 return store(sets.filter(s=>s.id!==id),storage);
}
