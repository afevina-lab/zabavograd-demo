import {visualClasses} from '../primitives/classNames.ts';
import type {ReactNode} from 'react';
const classes={root:'v-matching-bank',heading:'v-matching-bank-heading',cards:'v-matching-bank-cards'};
export function MatchingBank({heading,children,classNames=classes}:{heading?:ReactNode;children:ReactNode;classNames?:typeof classes}){
 classNames=visualClasses(classes,classNames);
 return <section className={classNames.root} aria-label="Карточки для выбора">{heading&&<div className={classNames.heading}>{heading}</div>}<div className={classNames.cards}>{children}</div></section>;
}
