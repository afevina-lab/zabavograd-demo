import type {ReactNode} from 'react';
const classes={root:'v-matching-layout',groups:'v-matching-groups'};
export function MatchingLayout({groups,bank,actions,classNames=classes}:{groups:ReactNode;bank?:ReactNode;actions?:ReactNode;classNames?:typeof classes}){
 return <div className={classNames.root}><div className={classNames.groups}>{groups}</div>{bank}{actions}</div>;
}
