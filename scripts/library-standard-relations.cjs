'use strict';
// Independently checked ordinary facts, exact sense IDs; not a general automatic
// approval of dictionary matches. Only these facts can use this provenance.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const facts=[
  [
    "is_a",
    "ru-new-20261102-0089",
    "пятиугольник",
    "ru-new-20261102-0091",
    "многоугольник"
  ],
  [
    "is_a",
    "ru-new-20261102-0085",
    "треугольник",
    "ru-new-20261102-0091",
    "многоугольник"
  ],
  [
    "is_a",
    "ru-new-20261102-0090",
    "шестиугольник",
    "ru-new-20261102-0091",
    "многоугольник"
  ],
  [
    "instance_of",
    "ru-r-add-d0b2d0b5d0bdd0b5d180d0b0",
    "венера",
    "ru-new-20261108-70a763e9e7",
    "планета"
  ],
  [
    "instance_of",
    "ru-r-add-d181d0b0d182d183d180d0bd",
    "сатурн",
    "ru-new-20261108-70a763e9e7",
    "планета"
  ],
  [
    "instance_of",
    "ru-r-add-d0bcd0b5d180d0bad183d180d0b8d0b9",
    "меркурий",
    "ru-new-20261108-70a763e9e7",
    "планета"
  ],
  [
    "instance_of",
    "ru-r-add-d0bcd0b0d180d181",
    "марс",
    "ru-new-20261108-70a763e9e7",
    "планета"
  ],
  [
    "is_a",
    "ru-r-add-d0b1d0bed180d189",
    "борщ",
    "ru-noun-20261109-0061",
    "суп"
  ],
  [
    "is_a",
    "ru-new-20261102-0039",
    "сарафан",
    "ru-noun-20261109-0001",
    "платье"
  ],
  [
    "is_a",
    "ru-noun-20261109-0004",
    "джинсы",
    "ru-noun-20261109-0003",
    "брюки"
  ],
  [
    "is_a",
    "modular-noun-d94e5d30943ddc81fc29dcd2",
    "джип",
    "ru-noun-20261109-0067",
    "автомобиль"
  ],
  [
    "is_a",
    "ru-r-add-d0b3d180d183d0bed0b2d0b8d0ba",
    "грузовик",
    "ru-noun-20261109-0067",
    "автомобиль"
  ],
  [
    "synonym",
    "ru-new-20261108-53796f6d09",
    "штаны",
    "ru-noun-20261109-0003",
    "брюки"
  ],
  [
    "part_of",
    "ru-new-20261102-0022",
    "рог",
    "ru-r-004",
    "баран"
  ],
  [
    "part_of",
    "ru-new-20261102-0023",
    "крыло",
    "ru-r-extra-007",
    "сорока"
  ]
];
const key=(t,a,b)=>JSON.stringify([t,...(t==='synonym'||t==='antonym'?[a,b].sort():[a,b])]);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,24);
const inverse={is_a:'has_instance',instance_of:'has_instance',part_of:'has_part',synonym:'synonym'};
const byFact=new Map(facts.map(([t,a,al,b,bl])=>[key(t,a,b),[t,a,al,b,bl]]));
function verify(db,r){
 const f=byFact.get(key(r.type,r.subject?.id,r.object?.id));if(!f)return false;
 const [t,a,al,b,bl]=f;
 const entries=new Map(db.entries.map(e=>[e.id,e]));
 return r.id==='semantic-standard-'+hash(key(t,a,b))&&r.subject.id===a&&r.subject.lemma===al&&r.object.id===b&&r.object.lemma===bl&&entries.get(a)?.lemma===al&&entries.get(b)?.lemma===bl&&r.inverse_type===inverse[t]&&r.provenance?.source==='zabavograd_editorial'&&r.provenance.authorship==='independent'&&r.provenance.revision==='machine-standard-lexical-v1'&&r.approval?.review_method==='exact_standard_fact'&&r.approval.human_reviewed===false;
}
function apply(db){
 const out=structuredClone(db),entries=new Map(out.entries.map(e=>[e.id,e]));
 const active=new Set(out.relations.flatMap(r=>{
  const a=r.subject?.id??r.child?.id,b=r.object?.id??r.parent?.id;if(!a||!b)return[];
  return [r.type==='has_part'?key('part_of',b,a):key(r.type,a,b)];
 }));
 let added=0,resolved=0;
 for(const [t,a,al,b,bl] of facts){
  const x=entries.get(a),y=entries.get(b);
  if(!x||!y||x.lemma!==al||y.lemma!==bl||x.same_lexical_meaning_as||y.same_lexical_meaning_as)continue;
  const k=key(t,a,b);
  if(!active.has(k)){
   const r={id:'semantic-standard-'+hash(k),type:t,subject:{id:a,lemma:al},object:{id:b,lemma:bl},inverse_type:inverse[t],approval:{status:'verified',usable_for_generation:true,sense_checked:true,typical_for_children:true,review_method:'exact_standard_fact',human_reviewed:false},provenance:{source:'zabavograd_editorial',authorship:'independent',revision:'machine-standard-lexical-v1'}};
   assert(verify(out,r));out.relations.push(r);active.add(k);added++;
  }
  for(const e of [x,y]){
   if(!e.external_linguistic_proposals)continue;
   const n=e.external_linguistic_proposals.length;
   e.external_linguistic_proposals=e.external_linguistic_proposals.filter(p=>p.source!=='ruwordnet'||key(p.relation_type,p.entry_id,p.object_id)!==k);
   resolved+=n-e.external_linguistic_proposals.length;
   if(!e.external_linguistic_proposals.length)delete e.external_linguistic_proposals;
  }
 }
 return {db:out,stats:{added,resolved}};
}
module.exports={apply,verify};
