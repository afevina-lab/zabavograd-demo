# Заполнение недостающих сведений библиотеки

Автоматически сформированные **предложения** добавлены непосредственно в карточки V2,
но не объявлены проверенными. Проверенные ранее редакторские данные не заменялись.
Формы находятся в `morphology.data.automatic_proposal.forms`; у исторических
карточек — в `machine_analysis.morphology.forms`. Тип парадигмы хранится
в `grammemes`. Звуки — в `phonetic_tags.data.sound_tokens`; у исторических
карточек — в `machine_analysis.phonetic.sound_tokens`. Все они имеют статус
`automatic_candidate_needs_review`. Индексы вхождений звуков и стечения
вычисляются из фонем, а не дублируются в каждой карточке. Генератор не использует
непроверенные словоформы; целевые звуки допускаются только при точном соответствии
исходной букве и отсутствии запретного контекста перед мягким согласным.

## Сводка

- words: 1693
- phonetic_candidates: 1205
- morphology_candidates: 1359
- phonetic_needs_review: 197
- morphology_needs_review: 43
- protected_curated: 259
- not_applicable: 32
- unreviewed_semantic_relations: 0

Не добавлялись автоматически родо-видовые, часть–целое, антонимические и
ролевые связи из тезаурусов: совпадение слова не доказывает совпадение значения.
Действующие связи сохраняются в `relations` (двунаправленное представление
выводится по типу отношения), кандидаты глагольных моделей — в
`speech_frame_candidates`. Для новых связей необходим выбор значения и проверка
типичности; материалы RuWordNet имеют дополнительные лицензионные ограничения.

## Требуют ручного разбора (первые 100)

- крона [forms]: homograph_or_ambiguous_analysis, countability_unverified
- крыло [forms]: homograph_or_ambiguous_analysis, countability_unverified
- баранка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- крупа [forms]: homograph_or_ambiguous_analysis, countability_unverified
- кроссовки [forms]: lemma_differs_from_card, countability_unverified
- маркер [forms]: homograph_or_ambiguous_analysis, countability_unverified
- родители [forms]: lemma_differs_from_card, countability_unverified
- май [forms]: homograph_or_ambiguous_analysis, countability_unverified
- воскресенье [forms]: homograph_or_ambiguous_analysis, countability_unverified
- белка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- близнецы [forms]: lemma_differs_from_card, countability_unverified
- бобр [forms]: lemma_differs_from_card, countability_unverified
- веснушки [forms]: lemma_differs_from_card, countability_unverified
- внуки [forms]: lemma_differs_from_card, countability_unverified
- волосы [forms]: lemma_differs_from_card, countability_unverified
- ворон [forms]: homograph_or_ambiguous_analysis, countability_unverified
- голубка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- губы [forms]: lemma_differs_from_card, countability_unverified
- дельфин [forms]: homograph_or_ambiguous_analysis, countability_unverified
- змея [forms]: homograph_or_ambiguous_analysis, countability_unverified
- кость [forms]: homograph_or_ambiguous_analysis, countability_unverified
- кукушонок [forms]: lemma_differs_from_card, countability_unverified
- лёгкие [forms]: homograph_or_ambiguous_analysis, lemma_differs_from_card, countability_unverified
- нарвал [forms]: homograph_or_ambiguous_analysis, countability_unverified
- павлин [forms]: homograph_or_ambiguous_analysis, countability_unverified
- попугай [forms]: homograph_or_ambiguous_analysis, countability_unverified
- пятка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- ресницы [forms]: lemma_differs_from_card, countability_unverified
- соловей [forms]: homograph_or_ambiguous_analysis, countability_unverified
- сом [forms]: homograph_or_ambiguous_analysis, countability_unverified
- стрижонок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- счастье [forms]: lemma_differs_from_card, countability_unverified
- тля [forms]: homograph_or_ambiguous_analysis, countability_unverified
- треска [forms]: homograph_or_ambiguous_analysis, countability_unverified
- тукан [forms]: homograph_or_ambiguous_analysis, countability_unverified
- уж [forms]: homograph_or_ambiguous_analysis
- усы [forms]: homograph_or_ambiguous_analysis, lemma_differs_from_card, countability_unverified
- шофёр [forms]: lemma_differs_from_card, countability_unverified
- ива [forms]: homograph_or_ambiguous_analysis, countability_unverified
- осина [forms]: homograph_or_ambiguous_analysis, countability_unverified
- гвоздика [forms]: homograph_or_ambiguous_analysis, countability_unverified
- астра [forms]: homograph_or_ambiguous_analysis, countability_unverified
- ирис [forms]: homograph_or_ambiguous_analysis, countability_unverified
- георгин [forms]: homograph_or_ambiguous_analysis, countability_unverified
- монстера [forms]: homograph_or_ambiguous_analysis, lemma_differs_from_card, countability_unverified
- лук [forms]: homograph_or_ambiguous_analysis, countability_unverified
- слива [forms]: homograph_or_ambiguous_analysis, countability_unverified
- лайм [forms]: homograph_or_ambiguous_analysis, countability_unverified
- личи [forms]: homograph_or_ambiguous_analysis, lemma_differs_from_card
- малина [forms]: homograph_or_ambiguous_analysis, countability_unverified
- калина [forms]: homograph_or_ambiguous_analysis, countability_unverified
- маслёнок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- вешенка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- хвоя [forms]: homograph_or_ambiguous_analysis, countability_unverified
- животное [forms]: homograph_or_ambiguous_analysis, countability_unverified
- круассан [forms]: homograph_or_ambiguous_analysis, countability_unverified
- банка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- ваза [forms]: homograph_or_ambiguous_analysis, countability_unverified
- валик [forms]: homograph_or_ambiguous_analysis, countability_unverified
- ванная [forms]: homograph_or_ambiguous_analysis, countability_unverified
- венок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- вилка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- гостиная [forms]: homograph_or_ambiguous_analysis, countability_unverified
- графин [forms]: homograph_or_ambiguous_analysis, countability_unverified
- детская [forms]: homograph_or_ambiguous_analysis, countability_unverified
- душ [forms]: homograph_or_ambiguous_analysis, countability_unverified
- замок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- казан [forms]: homograph_or_ambiguous_analysis, countability_unverified
- колонка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- креманка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- ложка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- мультиварка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- мыло [forms]: homograph_or_ambiguous_analysis, countability_unverified
- наушники [forms]: lemma_differs_from_card, countability_unverified
- пила [forms]: homograph_or_ambiguous_analysis, countability_unverified
- плечики [forms]: homograph_or_ambiguous_analysis, countability_unverified
- покрывало [forms]: homograph_or_ambiguous_analysis, countability_unverified
- полка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- потолок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- совок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- спицы [forms]: lemma_differs_from_card, countability_unverified
- спички [forms]: lemma_differs_from_card, countability_unverified
- столовая [forms]: homograph_or_ambiguous_analysis, countability_unverified
- фоторамка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- хлебопечка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- часы [forms]: homograph_or_ambiguous_analysis, countability_unverified
- щипцы [forms]: lemma_differs_from_card, countability_unverified
- брюки [forms]: grammatical_number_must_be_confirmed, countability_unverified
- джинсы [forms]: grammatical_number_must_be_confirmed, countability_unverified
- майка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- тапочка [forms]: homograph_or_ambiguous_analysis, countability_unverified
- кеды [forms]: lemma_differs_from_card, grammatical_number_must_be_confirmed, countability_unverified
- очки [forms]: homograph_or_ambiguous_analysis, grammatical_number_must_be_confirmed, countability_unverified
- носок [forms]: homograph_or_ambiguous_analysis, countability_unverified
- шлем [forms]: homograph_or_ambiguous_analysis, countability_unverified
- бубен [forms]: homograph_or_ambiguous_analysis, countability_unverified
- чай [forms]: homograph_or_ambiguous_analysis, countability_unverified
- пельмени [forms]: lemma_differs_from_card, countability_unverified
- печенье [forms]: homograph_or_ambiguous_analysis, countability_unverified
- варенье [forms]: homograph_or_ambiguous_analysis, countability_unverified

## Не обработаны автоматически (первые 100)

- вчера [morphology]: declared_part_of_speech_not_found_in_morph_dictionary
- завтра [morphology]: declared_part_of_speech_not_found_in_morph_dictionary
- сегодня [morphology]: declared_part_of_speech_not_found_in_morph_dictionary
- жара [phonetic]: unknown_or_ambiguous_stress
- крыло [phonetic]: unknown_or_ambiguous_stress
- крупа [phonetic]: unknown_or_ambiguous_stress
- розетка [phonetic]: unknown_or_ambiguous_stress
- перчатка [phonetic]: unknown_or_ambiguous_stress
- кроссовки [phonetic]: unknown_or_ambiguous_stress
- транспорт [phonetic]: unknown_or_ambiguous_stress
- парковка [phonetic]: unknown_or_ambiguous_stress
- правило [phonetic]: unknown_or_ambiguous_stress
- кормить [phonetic]: unknown_or_ambiguous_stress
- белка [phonetic]: unknown_or_ambiguous_stress
- белый медведь [morphology]: phrase_agreement_requires_review
- белый медведь [phonetic]: multiword_or_nonlexical
- божья коровка [morphology]: phrase_agreement_requires_review
- божья коровка [phonetic]: multiword_or_nonlexical
- внучка [phonetic]: unknown_or_ambiguous_stress
- воробьиный сыч [morphology]: phrase_agreement_requires_review
- воробьиный сыч [phonetic]: multiword_or_nonlexical
- ворон [phonetic]: unknown_or_ambiguous_stress
- голубка [phonetic]: unknown_or_ambiguous_stress
- губы [phonetic]: unknown_or_ambiguous_stress
- гуппи [phonetic]: unknown_or_ambiguous_stress
- дождевой червь [morphology]: phrase_agreement_requires_review
- дождевой червь [phonetic]: multiword_or_nonlexical
- жук-носорог [phonetic]: unknown_or_ambiguous_stress
- жук-олень [phonetic]: unknown_or_ambiguous_stress
- змея [phonetic]: unknown_or_ambiguous_stress
- золотая рыбка [morphology]: phrase_agreement_requires_review
- золотая рыбка [phonetic]: multiword_or_nonlexical
- кабаниха [phonetic]: unknown_or_ambiguous_stress
- колибри [phonetic]: unknown_or_ambiguous_stress
- колорадский жук [morphology]: phrase_agreement_requires_review
- колорадский жук [phonetic]: multiword_or_nonlexical
- косатка [phonetic]: unknown_or_ambiguous_stress
- кукушонок [phonetic]: unknown_or_ambiguous_stress
- лиса [phonetic]: unknown_or_ambiguous_stress
- майский жук [morphology]: phrase_agreement_requires_review
- майский жук [phonetic]: multiword_or_nonlexical
- морская звезда [morphology]: phrase_agreement_requires_review
- морская звезда [phonetic]: multiword_or_nonlexical
- морская свинка [morphology]: phrase_agreement_requires_review
- морская свинка [phonetic]: multiword_or_nonlexical
- морская черепаха [morphology]: phrase_agreement_requires_review
- морская черепаха [phonetic]: multiword_or_nonlexical
- морской ёж [morphology]: phrase_agreement_requires_review
- морской ёж [phonetic]: multiword_or_nonlexical
- морской конёк [morphology]: phrase_agreement_requires_review
- морской конёк [phonetic]: multiword_or_nonlexical
- морской котик [morphology]: phrase_agreement_requires_review
- морской котик [phonetic]: multiword_or_nonlexical
- олениха [phonetic]: unknown_or_ambiguous_stress
- перепёлка [phonetic]: unknown_or_ambiguous_stress
- пони [phonetic]: unknown_or_ambiguous_stress
- пятка [phonetic]: unknown_or_ambiguous_stress
- рыба-клоун [phonetic]: unknown_or_ambiguous_stress
- рыба-меч [phonetic]: unknown_or_ambiguous_stress
- северный олень [morphology]: phrase_agreement_requires_review
- северный олень [phonetic]: multiword_or_nonlexical
- скалярия [phonetic]: unknown_or_ambiguous_stress
- соловей [phonetic]: unknown_or_ambiguous_stress
- спина [phonetic]: unknown_or_ambiguous_stress
- стрижонок [phonetic]: unknown_or_ambiguous_stress
- сурикат [phonetic]: unknown_or_ambiguous_stress
- треска [phonetic]: unknown_or_ambiguous_stress
- тритон [phonetic]: unknown_or_ambiguous_stress
- тукан [phonetic]: unknown_or_ambiguous_stress
- утка [phonetic]: unknown_or_ambiguous_stress
- фламинго [phonetic]: unknown_or_ambiguous_stress
- чайка [phonetic]: unknown_or_ambiguous_stress
- шимпанзе [phonetic]: unknown_or_ambiguous_stress
- баобаб [phonetic]: invalid_or_incomplete_phoneme_sequence
- гвоздика [phonetic]: unknown_or_ambiguous_stress
- нарцисс [phonetic]: unknown_or_ambiguous_stress
- ирис [phonetic]: unknown_or_ambiguous_stress
- алоэ [phonetic]: unknown_or_ambiguous_stress
- монстера [phonetic]: unknown_or_ambiguous_stress
- каланхоэ [phonetic]: unknown_or_ambiguous_stress
- хлорофитум [phonetic]: unknown_or_ambiguous_stress
- сансевиерия [phonetic]: unknown_or_ambiguous_stress
- толстянка [phonetic]: unknown_or_ambiguous_stress
- спатифиллум [phonetic]: unknown_or_ambiguous_stress
- цветная капуста [morphology]: phrase_agreement_requires_review
- цветная капуста [phonetic]: multiword_or_nonlexical
- брокколи [phonetic]: unknown_or_ambiguous_stress
- пекинская капуста [morphology]: phrase_agreement_requires_review
- пекинская капуста [phonetic]: multiword_or_nonlexical
- киви [phonetic]: unknown_or_ambiguous_stress
- манго [phonetic]: unknown_or_ambiguous_stress
- авокадо [phonetic]: unknown_or_ambiguous_stress
- личи [phonetic]: unknown_or_ambiguous_stress
- белый гриб [morphology]: phrase_agreement_requires_review
- белый гриб [phonetic]: multiword_or_nonlexical
- бледная поганка [morphology]: phrase_agreement_requires_review
- бледная поганка [phonetic]: multiword_or_nonlexical
- вешенка [phonetic]: unknown_or_ambiguous_stress
- хвоя [phonetic]: unknown_or_ambiguous_stress
- круассан [phonetic]: unknown_or_ambiguous_stress

Полный список статусов сохраняется в соответствующих карточках. Причины
недостатка данных **не заменяются выдуманными ответами**.
