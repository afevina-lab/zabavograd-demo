/** Words shown in the shared lesson preview; no second title or redundant CTA. */
export function MaterialSummary({items,empty='Выберите тему или измените условия подбора.'}:{items:{label:string}[];empty?:string}){
 return <p className={items.length?'setup-material-summary':'setup-preview-message'}>{items.length?items.map(item=>item.label).join(' · '):empty}</p>;
}
