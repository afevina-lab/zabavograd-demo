import {RangeControl} from '../visual/primitives/Range.tsx';
import type {ComponentProps} from 'react';
const classes={root:'range-slider',heading:'range-slider-heading',track:'range-slider-track'};
export function RangeSlider(props:Omit<ComponentProps<typeof RangeControl>,'classNames'>){
 return <RangeControl {...props} classNames={classes}/>;
}
