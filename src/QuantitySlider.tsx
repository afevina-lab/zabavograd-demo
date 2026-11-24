import {Quantity,type QuantityProps} from './visual/primitives/Quantity.tsx';
const classes={root:'quantity-slider',stepper:'quantity-stepper'};
/** Compatibility entry point while existing screens move to the replacement CSS. */
export function QuantitySlider({values,...props}:Omit<QuantityProps,'stops'>&{values?:readonly number[]}){
 return <Quantity {...props} stops={values} classNames={classes}/>;
}
