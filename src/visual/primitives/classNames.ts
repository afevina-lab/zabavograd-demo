/** Keep canonical component classes while a caller still supplies legacy selectors.
 * Only class tokens are combined; replacement CSS is never imported by this adapter. */
export function visualClasses<T extends Record<string,string>>(defaults:T,compatibility:T):T{
 const result={...defaults};
 for(const key of Object.keys(defaults) as (keyof T)[]){
  result[key]=[...new Set((defaults[key]+' '+compatibility[key]).split(/\s+/).filter(Boolean))].join(' ') as T[keyof T];
 }
 return result;
}
