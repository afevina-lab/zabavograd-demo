#!/usr/bin/env python3
"""Publish strictly checked local inflection subsets; never import external research data.
For child-oriented generation, candidate sources retain their original unverified state;
only exact-paradigm, explicitly allowed inflections get an active machine-checked subset.
"""
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/'outputs/library-v2.json'
REPORT=ROOT/'outputs/ACTIVE_FORMS_20261123.json'
REVISION='safe-local-morphology-20261123-v1'
SINGLE_ONLY={'бельё','шерсть','мука','мёд'}
INANIMATE_PHRASES={'письменный стол','книжный шкаф'}
BLOCKED_FLAGS={'homograph_or_ambiguous_analysis','lemma_differs_from_card',
 'part_of_speech_conflict','editorial_gender_conflict','grammatical_number_must_be_confirmed'}
modspec=importlib.util.spec_from_file_location('extend_morphology', ROOT/'scripts/extend-morphology-20261123.py')
extension=importlib.util.module_from_spec(modspec)
modspec.loader.exec_module(extension)

def noun_genders(parse):
    return parse.tag.gender or None

def phrase_forms(morph,lemma):
    bits=lemma.split(' ')
    if len(bits)!=2: return {}
    adj=[p for p in morph.parse(bits[0]) if p.tag.POS=='ADJF']
    nouns=[p for p in morph.parse(bits[1]) if p.tag.POS=='NOUN' and p.normal_form==bits[1]]
    if not adj or not nouns: return {}
    a=adj[0]
    n=nouns[0]
    if n.tag.gender!='masc' or n.tag.animacy!='inan': return {}
    forms={}
    for number in ('sing','plur'):
        for case in extension.CASES:
            numbertags={number,case}
            num=n.inflect(numbertags)
            ag=a.inflect(numbertags | ({'masc'} if number=='sing' else set()))
            if num and ag and num.word and ag.word:
                forms[case+'_'+number]=ag.word+' '+num.word
    return forms

def valid_forms_for_lemma(morph,entry,proposal):
    parse=extension.exact_parse(morph,entry,proposal)
    if parse is None: return None,'no_exact_parse'
    expected={'noun':{'NOUN'},'adjective':{'ADJF','ADJS'},'verb':{'INFN','VERB'}}
    pos=entry.get('part_of_speech') or (entry.get('legacy_source') or {}).get('raw',{}).get('part_of_speech')
    if pos in expected and parse.tag.POS not in expected[pos]:
        return None,'part_of_speech_mismatch'
    flags=set(proposal.get('flags') or [])
    if flags & BLOCKED_FLAGS: return None,'risk_flags'
    # Case paradigms are valid spellings, not blanket approval of semantic countability.
    claimed=proposal.get('forms') or {}
    calculated=extension.all_forms(parse)
    approved={key:form for key,form in calculated.items()
              if key in claimed and claimed[key]==form and not key.startswith(('loct2_','gent2_','short_'))}
    if not approved: return None,'no_identically_reconstructed_forms'
    if pos=='noun':
        # A number-agnostic machine reading must not make a mass noun countable.
        if entry.get('lemma') in SINGLE_ONLY:
            approved={k:v for k,v in approved.items() if k.endswith('_sing')}
        # Counting forms require a separate countability review, never inferred here.
        approved={k:v for k,v in approved.items() if not k.startswith('count_')}
    if not approved:return None,'no_safe_forms'
    return approved,None

def add_active(data,forms,source,can_count=False):
    if not isinstance(data,dict): return False
    existing=data.get('approved_form_subset')
    if existing:
        if existing.get('revision')==REVISION:
            return False
        # Never overwrite independent editorial approvals or other migrations.
        return False
    data['approved_form_subset']={'revision':REVISION,'status':'machine_checked',
       'usable_for_generation':True,'source':source,
       'review_method':'exact_pymorphy3_paradigm_matching',
       'human_reviewed':False,'automatic_counting_allowed':bool(can_count),
       'forms':forms}
    return True

def activate(db,morph):
    out=copy.deepcopy(db)
    stats=Counter();sample=[];blocked=[]
    for entry in out['entries']:
        if entry.get('legacy_source') and (entry.get('legacy_source') or {}).get('raw'):
            stats['preserved_legacy']+=1
            continue
        mor=entry.get('morphology') or {}
        if not isinstance(mor,dict):continue
        data=mor.get('data')
        if not isinstance(data,dict):
            stats['no_morphology_data']+=1
            continue
        if entry.get('id','').startswith('ru-editorial-gap-20261123-'):
            lemma=entry['lemma']
            if lemma in INANIMATE_PHRASES:
                forms=phrase_forms(morph,lemma)
                source='editorial_phrase_agreement_with_pymorphy3'
            else:
                expected={'noun':'NOUN','verb':'INFN'}
                choices=[p for p in morph.parse(lemma)
                         if p.normal_form==lemma and p.tag.POS==expected.get(entry.get('part_of_speech'))]
                if not choices:
                    blocked.append({'id':entry['id'],'lemma':lemma,'reason':'missing_matching_parse'})
                    stats['new_word_parse_unresolved']+=1
                    continue
                p=choices[0]
                forms={k:v for k,v in extension.all_forms(p).items()
                       if not k.startswith(('loct2_','gent2_','short_'))}
                source='pymorphy3_2.0.6_exact_lemma'
                if lemma in SINGLE_ONLY:
                    forms={k:v for k,v in forms.items() if k.endswith('_sing')}
            if forms and add_active(data,forms,source):
                mor['status']='machine_checked_forms_subset'
                stats['new_words_with_active_forms']+=1
                stats['active_forms_new']+=len(forms)
                if len(sample)<8:sample.append({'lemma':lemma,'forms':dict(list(forms.items())[:5])})
            elif not forms:
                stats['new_words_without_forms']+=1
                blocked.append({'id':entry['id'],'lemma':lemma,'reason':'no_safe_forms'})
            continue
        if mor.get('status')!='automatic_candidate_needs_review':
            stats['protected_or_not_a_candidate']+=1
            continue
        proposal=data.get('automatic_proposal')
        if not isinstance(proposal,dict) or proposal.get('status')!='suggested' or proposal.get('source')!='pymorphy3':
            stats['invalid_candidate']+=1
            continue
        forms,reason=valid_forms_for_lemma(morph,entry,proposal)
        if not forms:
            stats['excluded_'+reason]+=1
            continue
        if add_active(data,forms,'pymorphy3_2.0.6_exact_lemma'):
            stats['existing_words_with_active_forms']+=1
            stats['active_forms_existing']+=len(forms)
            if len(sample)<8:sample.append({'lemma':entry['lemma'],'forms':dict(list(forms.items())[:5])})
    return out,{'schema':'active_form_audit_v1','revision':REVISION,
                'active_status':'machine_checked_not_human_reviewed',
                'not_activated':['unmatched_lemmas','ambiguous_analyses','semantic_countability',
                                 'restricted_external_source_frames','unreviewed_original_analyses'],
                'statistics':dict(stats),'examples':sample,'unresolved':blocked}

def main():
    import pymorphy3
    db=json.loads(FILE.read_text(encoding='utf-8'))
    changed,report=activate(db,pymorphy3.MorphAnalyzer())
    FILE.write_text(json.dumps(changed,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['statistics'],ensure_ascii=False))
if __name__=='__main__':main()
