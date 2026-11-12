#!/usr/bin/env python3
"""Build a standalone sortable HTML viewer for pending-word analysis drafts."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
data=json.loads((ROOT/"outputs/library-v2-auto-analysis.json").read_text(encoding="utf-8"))
out=ROOT/"outputs/Анализ-слов-v2.html"
rows=[]
for entry in data["entries"]:
 p=entry["phonetic"]
 m=entry["morphology"]
 rows.append({
  "id":entry["id"],"word":entry["lemma"],"meaning":entry.get("meaning") or "",
  "weight":entry["weight"],"kind":entry["kind"],
  "ph_status":p["status"],"ph_reason":p.get("reason",""),
  "stress":p.get("accented"),"syllables":p.get("syllables"),
  "phonemes":p.get("sound_tokens",[]),
  "markova":p.get("markova_type_proposal"),
  "clusters":p.get("clusters",[]),
  "occurrences":p.get("occurrences",[]),
  "mismatches":[
    (str(o.get("sound","?"))+" (буква "+str(o.get("letter","?"))+")")
      if o.get("automation_status")=="letter_sound_mismatch" else
    (str(o.get("sound","?"))+" перед мягким "+str(o.get("following_consonant","?")))
    for o in p.get("occurrences",[])
    if o.get("automation_status") in ("letter_sound_mismatch","before_soft_consonant")
  ],
  "hard":p.get("hard_consonants",[]),"soft":p.get("soft_consonants",[]),
  "morph_status":m["status"],"morph_reason":m.get("reason",""),
  "part":m.get("part_of_speech",""),"tag":m.get("tag",""),
  "forms":m.get("forms",{}),"alternatives":m.get("alternatives",[]),
  "ambiguous":m.get("ambiguous",False),
 })
payload=json.dumps({"stats":data["stats"],"rows":rows},ensure_ascii=False,separators=(",",":"))
payload=payload.replace("<","\\u003c").replace("&","\\u0026")
page=r"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Забавоград — проверка фонетики и форм</title>
<style>
:root{font-family:system-ui,-apple-system,Arial,sans-serif;background:#f5f7fa;color:#28384c}
body{margin:0;padding:18px}main{max-width:1390px;margin:auto}
h1{font-size:clamp(22px,3vw,34px);margin:10px 0}p{line-height:1.55}
.info{background:#fff2dc;padding:14px;border-left:4px solid #c68a40;border-radius:7px}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}
.stat{background:white;border:1px solid #e1e5ee;border-radius:10px;padding:12px 18px}.stat b{display:block;font-size:23px}
.controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:15px 0}
input,select,button{font:inherit;border:1px solid #b9c7d5;border-radius:8px;padding:10px;background:white;color:#23354a}
button{cursor:pointer}button:hover{background:#e4edf7}
input{min-width:200px;flex:1}
.scroll{overflow:auto;max-height:67vh;background:white;border:1px solid #dde5ee;border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:900px}
th,td{padding:10px 12px;border-bottom:1px solid #ebeff3;text-align:left}
th{position:sticky;top:0;background:#263a5b;color:white;white-space:nowrap}
th button{border:0;padding:0;background:transparent;color:white;font-weight:700}
th button:hover{background:transparent;text-decoration:underline}
tbody tr{cursor:pointer}tbody tr:hover{background:#eef4ff}
.small{color:#697789;font-size:13px}
.badge{border-radius:99px;background:#e6f0fa;color:#295480;padding:3px 8px;white-space:nowrap}
.need{background:#ffecd3;color:#99521c}
dialog{border:0;border-radius:13px;max-width:min(860px,92vw);max-height:88vh;width:800px;padding:20px;box-shadow:0 22px 65px #0005}
dialog::backdrop{background:#14223a88}
.detailgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f6fa;padding:10px;border-radius:8px}
@media(max-width:600px){body{padding:10px}.stats{gap:6px}.stat{padding:8px}.scroll{max-height:68vh}}
</style></head><body><main>
<p class="small">ЗАБАВОГРАД · ПЕДАГОГИЧЕСКИЙ ПРОСМОТР · V2</p>
<h1>Фонетика и формы слов — на проверку</h1>
<p class="info"><b>Черновые автоматические предложения, не утверждённые данные!</b>
Проверь ударения, звуки, омографы, исчисляемость и предложенные формы. Тип Марковой — предварительный. Предложения G2P участвуют в автоматизации, кроме звуков из других букв и согласных непосредственно перед мягким согласным. Поиск звуков сохраняет эти вхождения. Предложенные морфологические формы требуют дополнительной проверки.</p>
<div class="stats" id="stats"></div>
<div class="controls"><input id="q" placeholder="Поиск слова / значения" aria-label="Поиск">
<select id="filter"><option value="">Все записи</option><option value="phonetic">Фонетика требует ручного анализа</option><option value="morph">Формы требуют ручного анализа</option><option value="both">Оба анализа предложены</option></select>
<button id="export">Экспорт CSV</button></div>
<p id="shown" class="small"></p>
<div class="scroll"><table><thead><tr>
<th><button data-sort="word">Слово ↕</button></th>
<th><button data-sort="weight">Вес ↕</button></th>
<th><button data-sort="ph_status">Фонетика ↕</button></th>
<th><button data-sort="stress">Ударение ↕</button></th>
<th><button data-sort="syllables">Слогов ↕</button></th>
<th>Звуки</th><th>Не подходят для автоматизации</th>
<th><button data-sort="markova">Маркова ↕</button></th>
<th><button data-sort="morph_status">Морфология ↕</button></th>
</tr></thead><tbody id="rows"></tbody></table></div>
<div class="controls"><button id="prev">Назад</button><span id="page" class="small"></span><button id="next">Вперёд</button></div>
<dialog id="detail"><div style="display:flex;justify-content:space-between;gap:12px"><h2 id="detailtitle"></h2><button id="close">Закрыть</button></div><div id="detailbody"></div></dialog>
<p class="small">Источники предложений: pymorphy3 и nsu-ai/russian_g2p. Предварительная разметка не заменяет методическую проверку.</p>
<script id="dataset" type="application/json">DATA_REPLACE</script>
<script>
(function(){
"use strict";
const src=JSON.parse(document.getElementById("dataset").textContent);
const all=src.rows;const doc=id=>document.getElementById(id);
let filtered=all.slice(),page=0,field="weight",descending=true;
const perPage=70;
const cell=(tr,value,cls)=>{
 const td=document.createElement("td");td.textContent=value==null?"—":String(value);
 if(cls)td.className=cls;tr.appendChild(td);return td;
};
function showStats(){
 const stats=[
  ["Всего",src.stats.pending_entries],
  ["Фонетика предложена",src.stats.phonetics.candidate_needs_review||0],
  ["Морфология предложена",src.stats.morphology.candidate_needs_review||0],
  ["Нужна ручная фонетика",src.stats.phonetics.needs_review||0],
 ];
 for(const item of stats){
  const x=document.createElement("div");x.className="stat";
  const b=document.createElement("b");b.textContent=item[1];
  const t=document.createElement("span");t.textContent=item[0];x.append(b,t);doc("stats").appendChild(x);
 }
}
function compare(a,b){
 const v=x=>field==="markova"?x.markova:field==="stress"?x.stress||"":x[field];
 const av=v(a),bv=v(b);
 if(av==null)return 1;if(bv==null)return -1;
 const cmp=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),"ru");
 return descending?-cmp:cmp;
}
function filterRows(){
 const q=doc("q").value.trim().toLocaleLowerCase("ru"),f=doc("filter").value;
 filtered=all.filter(x=>(!q||(x.word+" "+x.meaning).toLocaleLowerCase("ru").includes(q))
  &&(!f||(f==="phonetic"?x.ph_status!=="candidate_needs_review":
             f==="morph"?x.morph_status!=="candidate_needs_review":
             x.ph_status==="candidate_needs_review"&&x.morph_status==="candidate_needs_review")));
 filtered.sort(compare);page=0;render();
}
function render(){
 const pages=Math.max(1,Math.ceil(filtered.length/perPage));
 page=Math.max(0,Math.min(page,pages-1));
 const tbody=doc("rows");tbody.replaceChildren();
 for(const x of filtered.slice(page*perPage,(page+1)*perPage)){
  const tr=document.createElement("tr");tr.tabIndex=0;
  cell(tr,x.word);cell(tr,x.weight);cell(tr,x.ph_status==="candidate_needs_review"?"Предложено":"Проверить",x.ph_status==="candidate_needs_review"?"badge":"badge need");
  cell(tr,x.stress);cell(tr,x.syllables);cell(tr,x.phonemes.join(" · "));
  cell(tr,x.mismatches.join(", ")||"—");
  cell(tr,x.markova);cell(tr,x.morph_status==="candidate_needs_review"?"Предложено":"Проверить",x.morph_status==="candidate_needs_review"?"badge":"badge need");
  tr.onclick=()=>details(x);tr.onkeydown=e=>{if(e.key==="Enter")details(x)};
  tbody.appendChild(tr);
 }
 doc("shown").textContent="Найдено: "+filtered.length;
 doc("page").textContent="Страница "+(page+1)+" из "+pages;
 doc("prev").disabled=page===0;doc("next").disabled=page===pages-1;
}
function details(x){
 doc("detailtitle").textContent=x.word+(x.meaning?" — "+x.meaning:"");
 const body=doc("detailbody");body.replaceChildren();
 const grid=document.createElement("div");grid.className="detailgrid";
 const add=(heading,content)=>{
  const box=document.createElement("section"),h=document.createElement("h3"),p=document.createElement("pre");
  h.textContent=heading;p.textContent=content;box.append(h,p);grid.appendChild(box);
 };
 add("Фонетика",JSON.stringify({
  status:x.ph_status,reason:x.ph_reason,accented:x.stress,
  mismatch_letters:x.mismatches,
  phonemes:x.phonemes,syllables:x.syllables,markova:x.markova,
  clusters:x.clusters,hard:x.hard,soft:x.soft,occurrences:x.occurrences
 },null,2));
 add("Морфология",JSON.stringify({
  status:x.morph_status,reason:x.morph_reason,part:x.part,tag:x.tag,
  forms:x.forms,ambiguous:x.ambiguous,alternatives:x.alternatives
 },null,2));
 body.appendChild(grid);doc("detail").showModal();
}
doc("q").oninput=filterRows;doc("filter").onchange=filterRows;
document.querySelectorAll("th [data-sort]").forEach(btn=>btn.onclick=()=>{
 const next=btn.dataset.sort;
 descending=next===field?!descending:next==="weight";
 field=next;page=0;filtered.sort(compare);render();
});
doc("prev").onclick=()=>{page--;render()};doc("next").onclick=()=>{page++;render()};
doc("close").onclick=()=>doc("detail").close();
doc("export").onclick=()=>{
 const headings=["Слово","Вес","Ударение","Звуки","Не подходят для автоматизации","Слогов","Маркова","Фонетика","Морфология"];
 const csv=[headings,...filtered.map(x=>[
  x.word,x.weight,x.stress||"",x.phonemes.join(" "),x.mismatches.join(", "),x.syllables||"",x.markova||"",x.ph_status,x.morph_status
 ])].map(xs=>xs.map(v=>'"'+String(v==null?"":v).replaceAll('"','""')+'"').join(";")).join("\r\n");
 const a=document.createElement("a"),blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);a.href=url;a.download="zabavograd-analysis-v2.csv";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
};
showStats();filterRows();
})();
</script></main></body></html>"""
out.write_text(page.replace("DATA_REPLACE",payload),encoding="utf-8")
print("Built standalone review HTML:",out,len(rows),"words")
