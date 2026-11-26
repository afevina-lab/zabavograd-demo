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


SAFE_REVISION = 'safe-local-morphology-modular-v1'
SINGLE_ONLY = {'бельё', 'шерсть', 'мука', 'мёд'}
BLOCKED_FLAGS = {'homograph_or_ambiguous_analysis', 'lemma_differs_from_card',
                 'part_of_speech_conflict', 'editorial_gender_conflict',
                 'grammatical_number_must_be_confirmed'}

def safe_forms(entry, morph):
    """Reconstruct only exact, already proposed inflections, never counting forms."""
    if entry.get('kind') != 'word' or entry.get('same_lexical_meaning_as') or (entry.get('legacy_source') or {}).get('raw'):
        return {}, 'protected_entry'
    p = proposal_for(entry)
    data = entry.get('morphology', {}).get('data') or {}
    if 'approved_form_subset' in data:
        return {}, 'existing_approval'
    if not isinstance(p, dict) or not isinstance(p.get('forms'), dict):
        return {}, 'missing_proposal'
    if p.get('lemma') != entry.get('lemma') or not isinstance(p.get('flags'), list):
        return {}, 'unconfirmed_lemma_or_flags'
    flags = set(p['flags'])
    if flags & BLOCKED_FLAGS:
        return {}, 'risk_flags'
    parse = exact_parse(morph, entry, p)
    expected = {'noun': {'NOUN'}, 'adjective': {'ADJF', 'ADJS'}, 'verb': {'INFN', 'VERB'}}
    pos = entry.get('part_of_speech')
    if parse is None or parse.tag.POS not in expected.get(pos, set()):
        return {}, 'no_exact_parse'
    forms = {k: v for k, v in all_forms(parse).items()
             if p['forms'].get(k) == v and not k.startswith(('loct2_', 'gent2_', 'short_', 'count_'))}
    if pos == 'noun' and (entry['lemma'] in SINGLE_ONLY or 'countability_unverified' in flags):
        forms = {k: v for k, v in forms.items() if k.endswith('_sing')}
    return forms, None if forms else 'no_safe_forms'

def admit_safe_subset(db, morph, ids):
    if not 1 <= len(ids) <= 30 or len(set(ids)) != len(ids):
        raise ValueError('Select 1..30 distinct entry IDs')
    result = copy.deepcopy(db)
    index = {e['id']: e for e in result['entries']}
    stats = Counter()
    rows = []
    for entry_id in ids:
        entry = index[entry_id]
        forms, reason = safe_forms(entry, morph)
        if not forms:
            stats['skipped'] += 1
            rows.append({'id': entry_id, 'reason': reason})
            continue
        entry['morphology']['data']['approved_form_subset'] = {
            'revision': SAFE_REVISION, 'status': 'machine_checked', 'usable_for_generation': True,
            'source': 'pymorphy3_2.0.6_exact_lemma', 'review_method': 'exact_pymorphy3_paradigm_matching',
            'human_reviewed': False, 'automatic_counting_allowed': False, 'forms': forms}
        stats['changed'] += 1
        stats['forms'] += len(forms)
        rows.append({'id': entry_id, 'forms': forms})
    return result, {'schema': 'safe_form_subset_report_v1', 'status': 'machine_checked_candidate_not_approved',
                    'statistics': dict(stats), 'entries': rows}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', default='outputs/library-v2.json')
    parser.add_argument('--report', default='outputs/GRAMMAR_FORMS_REVIEW_20261123.json')
    parser.add_argument('--write', action='store_true', help='Extend unapproved existing suggestions (legacy only)')
    parser.add_argument('--candidate-dir', help='Create a validated modular candidate, never overwrite the source')
    parser.add_argument('--safe-entry', action='append', default=[], help='Explicit ID for exact machine-checked subset; repeat up to 30 times')
    args = parser.parse_args()
    import pymorphy3
    import os
    import subprocess
    import tempfile
    from library_source import read_snapshot, require_legacy_write, ROOT
    source = Path(args.library)
    modules = os.environ.get("ZABAVOGRAD_LIBRARY_MODULES")
    if (ROOT / "editorial/library-source-mode.json").exists():
        if modules is not None:
            parser.error("Canonical source override is prohibited")
        modules = str(ROOT / "outputs/library-modules")
    if args.safe_entry and (not modules or not args.candidate_dir or args.write):
        parser.error("--safe-entry requires a modular candidate directory, never --write")
    expected = None
    if modules is not None:
        if args.write or args.library != 'outputs/library-v2.json':
            parser.error("Modular mode disallows --write and alternate monolithic files")
        original, info = read_snapshot()
        expected = info["sha256"]
    else:
        if args.candidate_dir:
            parser.error("--candidate-dir requires ZABAVOGRAD_LIBRARY_MODULES")
        original = json.loads(source.read_text(encoding='utf-8'))
    morph = pymorphy3.MorphAnalyzer()
    if args.safe_entry:
        if pymorphy3.__version__ != '2.0.6':
            parser.error('Safe forms require pinned pymorphy3 2.0.6')
        db, report = admit_safe_subset(original, morph, args.safe_entry)
    else:
        db, report = enrich(original, morph)
    dest = Path(args.report)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if args.candidate_dir:
        with tempfile.TemporaryDirectory(prefix="zabavograd-analysis-") as tmp:
            proposed = Path(tmp) / "proposal.json"
            proposed.write_text(json.dumps(db, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            cmd = ["node", str(ROOT / "scripts/library-analysis-writer.cjs"),
                   modules, expected, str(proposed), str(Path(args.candidate_dir).resolve())]
            if args.safe_entry:
                cmd += ["--safe-subset", *args.safe_entry]
            subprocess.run(cmd, cwd=ROOT, check=True)
    if args.write:
        require_legacy_write()
        source.write_text(json.dumps(db, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'write': args.write, 'review': str(dest), **report['statistics']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
