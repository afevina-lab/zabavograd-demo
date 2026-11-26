import {GameActions} from '../compositions/GameActions.tsx';
import {visualClasses} from '../primitives/classNames.ts';
import type {CSSProperties,ReactNode,Ref} from 'react';
export type SortingLayoutClasses={root:string;bank:string;groups:string};
const classes:SortingLayoutClasses={root:'v-sorting-board',bank:'v-sorting-bank',groups:'v-sorting-groups'};
export function SortingLayout({bank,groups,actions,style,bankStyle,bankRef,bankLabel='Банк карточек',classNames=classes}:{bank:ReactNode;groups:ReactNode;actions?:ReactNode;style?:CSSProperties;bankStyle?:CSSProperties;bankRef?:Ref<HTMLDivElement>;bankLabel?:string;classNames?:SortingLayoutClasses}){
 classNames=visualClasses(classes,classNames);
 return <div className={classNames.root} style={style}>
  <div className={classNames.bank} style={bankStyle} ref={bankRef} aria-label={bankLabel}>{bank}</div>
  <div className={classNames.groups}>{groups}</div>
  <GameActions>{actions}</GameActions>
 </div>;
}
