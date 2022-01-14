# Tiny Linked Charts for Svelte

This is a library to display tiny bar charts. These charts are more so meant for graphic aids, rather than scientific representations. There's no axis labels, no extensive data visualisation, just bars.

**Demo and Docs**: https://mitcheljager.github.io/svelte-tiny-linked-charts/

### Installation

Install using Yarn or NPM.
```
yarn add svelte-tiny-linked-charts
```
```
npm install --save svelte-tiny-linked-charts
```

Include the chart in your app.
```
import { LinkedChart, LinkedLabel, LinkedValue } from "svelte-tiny-linked-charts"
```
```
<LinkedChart { data } />
<LinkedLabel />
<LinkedValue />
```

Supply your data in a simple key:value object:
```
let data = {
  "2005-01-01": 25,
  "2005-01-02": 20,
  "2005-01-03": 18,
  "2005-01-04": 17,
  "2005-01-05": 21
}
<LinkedChart { data } />
```

Or if you prefer supply the labels and values separately:
```
let labels = [
  "2005-01-01",
  "2005-01-02",
  "2005-01-03",
  "2005-01-04",
  "2005-01-05"
]
let values = [
  25,
  20,
  18,
  17,
  21
]
<LinkedChart { labels } { values } />
```

## Usage

For detailed documentation on every property check out: [https://mitcheljager.github.io/svelte-tiny-linked-charts/](https://mitcheljager.github.io/svelte-tiny-linked-charts/)

### Configuration

`<LinkedChart />` component.
| Property | Default | Description |
---|---|---
data | {} | Data that will be displayed in the chart supplied in key:value object.
labels | [] | Labels supplied separately, to be used together with "values" property.
values | [] | Values supplied separately, to be used together with "labels" property.
linked| | Key to link this chart to other charts with the same key.
uid | | Unique ID to link this chart to a LinkedValue component with the same uid.
height | 40 | Height of the chart in pixels.
width | 150 | Width of the chart in pixels.
barMinWidth | 4 | Width of the bars in the chart in pixels.
grow | false | Whether or not the bar should grow to fill out the full width of the chart.
align | right | The side the bars should align to when they do not completely fill out the chart.
gap | 1 | Gap between the bars in pixels.
fill | #ff3e00 | Color of the bars, can be any valid CSS color.
fadeOpacity | 0.5 | The opacity the faded out bars should display in.
hover | true | Boolean whether or not this chart can be hovered at all.
transition | 0 | Transition the chart between different stats. Value is time in milliseconds.
showValue | false | Boolean whether or not a value will be shown.
valueDefault | "\&nbsp;" | Default value when not hovering.
valueUndefined | 0 | For when the hovering value returns undefined.
valuePrepend | | String to prepend the value.
valueAppend | | String to append to the value.
valuePosition | static | Can be set to "floating" to follow the position of the hover.
scaleMax | 0 | Use this to overwrite the automatic scale set to the highest value in your array.
type | bar | Can be set to "line" to display a line chart instead.
lineColor | fill | Color of the line if used with type="line".
tabindex | -1 | Sets the tabindex of each bar.
dispatchEvents | false | Boolean whether or not to dispatch events on certain actions.

`<LinkedLabel />` component.
Property | Default | Description
--- | --- | ---
linked | | Key to link this label to charts with the same key.
empty | \&nbsp; | String that will be displayed when no bar is being hovered.

`<LinkedValue />` component.
Property | Default | Description
--- | --- | ---
uid | | Unique ID to link this value to a chart with the same uid.
empty | \&nbsp; | String that will be displayed when no bar is being hovered.
valueUndefined | 0 | For when the hovering value returns undefined.
