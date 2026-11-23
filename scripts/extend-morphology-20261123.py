#!/usr/bin/env python3
"""Extend existing *unapproved* pymorphy3 forms in canonical V2.
Neither previously approved data nor relation IDs change; --write is opt-in.
"""
import argparse
import copy
import json
from collections import Counter
from pathlib import Path

CASES = ('nomn', 'gent', 'datv', 'accs', 'ablt', 'loct')
GENDERS = ('masc', 'femn', 'neut')
PERSONS = ('1per', '2per', '3per')


def proposal_for(entry):
    if entry.get('morphology', {}).get('status') != 'automatic_candidate_needs_review':
        return None
    if (entry.get('legacy_source') or {}).get('raw'):
        return entry.get('machine_analysis', {}).get('morphology')
    return entry.get('morphology', {}).get('data', {}).get('automatic_proposal')


def exact_parse(morph, entry, proposal):
    if not isinstance(proposal, dict) or proposal.get('source') != 'pymorphy3' or proposal.get('status') != 'suggested':
        return None
    if proposal.get('usable_for_generation') is not False:
        return None
    # Matching the original analyzer tag is not semantic approval.
    exact = [p for p in morph.parse(entry.get('lemma', '')) if str(p.tag) == proposal.get('grammemes')
             and p.normal_form == proposal.get('lemma')]
    return exact[0] if exact else None


def all_forms(parse):
    """Only valid single-token inflections; do not fabricate periphrastic future."""
    pos = parse.tag.POS
    requests = {}
    if pos == 'NOUN':
        for number in ('sing', 'plur'):
            for case in CASES:
                requests[f'{case}_{number}'] = {case, number}
        if any('loc2' in p.tag for p in parse.lexeme):
            requests['loct2_sing'] = {'loc2', 'sing'}
        if any('gen2' in p.tag for p in parse.lexeme):
            requests['gent2_sing'] = {'gen2', 'sing'}
    elif pos in ('ADJF', 'ADJS'):
        for case in CASES:
            for gender in GENDERS:
                requests[f'{gender}_{case}_sing'] = {gender, case, 'sing'}
            requests[f'{case}_plur'] = {case, 'plur'}
        for gender in ('masc', 'neut'):
            for animacy in ('anim', 'inan'):
                requests[f'{gender}_accs_sing_{animacy}'] = {gender, 'accs', 'sing', animacy}
        for animacy in ('anim', 'inan'):
            requests[f'accs_plur_{animacy}'] = {'accs', 'plur', animacy}
        for gender in GENDERS:
            requests[f'short_{gender}'] = {'sing', gender, 'ADJS'}
        requests['short_plur'] = {'plur', 'ADJS'}
    elif pos in ('INFN', 'VERB'):
        for tense, prefix in (('pres', 'present'), ('futr', 'future')):
            for person, label in zip(PERSONS, ('1', '2', '3')):
                for number, short in (('sing', 'sg'), ('plur', 'pl')):
                    requests[f'{prefix}_{label}{short}'] = {tense, person, number}
        for gender in GENDERS:
            requests[f'past_{gender}'] = {'past', gender, 'sing'}
        requests['past_plur'] = {'past', 'plur'}
        requests['imperative_2sg'] = {'impr', 'sing'}
        requests['imperative_2pl'] = {'impr', 'plur'}
    result = {}
    for key, grammemes in requests.items():
        try:
            inflected = parse.inflect(grammemes)
        except (ValueError, AttributeError, KeyError):
            inflected = None
        if inflected and isinstance(inflected.word, str) and inflected.word and ' ' not in inflected.word:
            result[key] = inflected.word
    return result


def enrich(db, morph):
    result = copy.deepcopy(db)
    stats = Counter()
    issues, samples = [], []
    for entry in result['entries']:
        p = proposal_for(entry)
        if p is None:
            stats['protected_or_no_proposal'] += 1
            continue
        parse = exact_parse(morph, entry, p)
        if parse is None:
            stats['missing_exact_parse'] += 1
            issues.append({'id': entry['id'], 'lemma': entry['lemma'], 'reason': 'no_identical_pymorphy3_parse'})
            continue
        forms = p.get('forms')
        if not isinstance(forms, dict):
            stats['invalid_forms'] += 1
            continue
        additional = all_forms(parse)
        new = {k: v for k, v in additional.items() if not forms.get(k)}
        conflicts = sorted(k for k, v in additional.items() if forms.get(k) and forms[k] != v)
        if conflicts:
            stats['entries_with_conflicts'] += 1
            issues.append({'id': entry['id'], 'lemma': entry['lemma'], 'reason': 'existing_form_conflict', 'keys': conflicts})
        if new:
            forms.update(new)
            p['extended_by'] = 'pymorphy3-expanded-paradigms-20261123-v1'
            p['usable_for_generation'] = False
            stats['enriched_entries'] += 1
            stats['additional_form_keys'] += len(new)
            stats['forms_' + str(parse.tag.POS)] += len(new)
            if len(samples) < 25:
                samples.append({'id': entry['id'], 'lemma': entry['lemma'], 'added': new})
        else:
            stats['already_complete_or_no_inflections'] += 1
    if [e['id'] for e in result['entries']] != [e['id'] for e in db['entries']]:
        raise ValueError('Stable IDs changed')
    if result['relations'] != db['relations']:
        raise ValueError('Semantic relations changed')
    return result, {'schema': 'grammar_forms_expansion_report_v1', 'source': 'pymorphy3',
                    'status': 'review_only', 'usable_for_generation': False,
                    'statistics': dict(sorted(stats.items())), 'issues': issues, 'examples': samples}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', default='outputs/library-v2.json')
    parser.add_argument('--report', default='outputs/GRAMMAR_FORMS_REVIEW_20261123.json')
    parser.add_argument('--write', action='store_true', help='Extend unapproved existing suggestions')
    args = parser.parse_args()
    import pymorphy3
    source = Path(args.library)
    original = json.loads(source.read_text(encoding='utf-8'))
    db, report = enrich(original, pymorphy3.MorphAnalyzer())
    dest = Path(args.report)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.write:
        source.write_text(json.dumps(db, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'write': args.write, 'review': str(dest), **report['statistics']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
