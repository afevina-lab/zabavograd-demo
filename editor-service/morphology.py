import sys,json
import pymorphy3
morph=pymorphy3.MorphAnalyzer()
patterns={'genitive_singular':{'gent','sing'},'genitive_plural':{'gent','plur'},'plural_nominative':{'nomn','plur'}}
rows=[]
for item in json.load(sys.stdin):
 proposals=[]
 for p in morph.parse(item['lemma'])[:3]:
  forms={}
  if p.tag.POS=='NOUN':
   for key,tags in patterns.items():
    f=p.inflect(tags)
    if f: forms[key]=f.word
  proposals.append({'lemma':p.normal_form,'tag':str(p.tag),'score':p.score,'forms':forms,'source':'pymorphy3/OpenCorpora','review_status':'suggested','usable_for_generation':False})
 rows.append({'id':item['id'],'proposals':proposals})
print(json.dumps({'entries':rows},ensure_ascii=False))
