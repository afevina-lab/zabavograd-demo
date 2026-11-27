export const roles=['subject','object','child','parent','male','female','offspring'];
export const pictures=e=>(e.illustrations?.senses||[]).flatMap(s=>s.variants||[]);
export const related=(d,id)=>d.relations.filter(r=>roles.some(k=>r[k]?.id===id));
export function validate(d){
 if(d?.schema_version!==2||!Array.isArray(d.entries)||!Array.isArray(d.categories)||!Array.isArray(d.relations))throw Error('Ожидается полная библиотека V2');
 const ids=new Set(),cats=new Set(d.categories.map(c=>c.path));
 for(const e of d.entries){if(!e.id||ids.has(e.id)||typeof e.lemma!=='string'||!e.lemma.trim())throw Error('Пустое слово или повторный ID');ids.add(e.id);if(!Array.isArray(e.categories)||e.categories.some(c=>!cats.has(c.path)||typeof c.default_selection!=='boolean'))throw Error('Неизвестная ветка: '+e.lemma);if(![0,10,20,30,50,70,100].includes(e.selection?.base_weight))throw Error('Допустимые веса: 0, 10, 20, 30, 50, 70, 100 — '+e.lemma);}
 const rids=new Set();for(const r of d.relations){if(!r.id||rids.has(r.id))throw Error('Повторный ID связи');rids.add(r.id);for(const k of roles)if(r[k]?.id&&!ids.has(r[k].id))throw Error('Неизвестное слово в связи '+r.id);if(r.type==='is_a'&&r.child?.id===r.parent?.id)throw Error('Слово не может быть своим родовым понятием');}
 return true;
}
export function diff(base,next){const old=new Map(base.entries.map(e=>[e.id,e]));return next.entries.filter(e=>JSON.stringify(e)!==JSON.stringify(old.get(e.id))).map(e=>({id:e.id,lemma:e.lemma,isNew:!old.has(e.id)}));}
