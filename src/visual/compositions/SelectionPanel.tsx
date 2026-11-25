import type {ReactNode} from 'react';
export function SelectionPanel({content,actions}:{content:ReactNode;actions:ReactNode}){
 return <div className="v-selection-panel panel-scroll"><div className="v-selection-content">{content}</div><div className="v-selection-footer">{actions}</div></div>;
}
