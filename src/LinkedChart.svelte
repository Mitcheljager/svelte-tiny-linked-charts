<script>
  import { hoveringKey } from "./stores/tinyLinkedCharts.js"

  export let data = {}
  export let labels = []
  export let values = []
  export let height = 40
  export let width = 150
  export let barMinWidth = 4
  export let grow = false
  export let align = "right"
  export let gap = 1
  export let fill = "#ff3e00"
  export let fadeOpacity = 0.5
  export let linked = false
  export let hover = true
  export let transition = 0
  
  $: dataLength = Object.keys(data).length
  $: barWidth = grow ? getBarWidth(dataLength) : parseInt(barMinWidth)
  $: highestValue = dataLength ? getHighestValue() : 0
  $: alignmentOffset = dataLength ? getAlignment() : 0
  $: linkedKey = linked || (Math.random() + 1).toString(36).substring(7)
  $: if (labels.length && values.length) data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]]))

  function getHighestValue() {
    return Math.max(...Object.values(data))
  }

  function getHeight(value) {
    return Math.round((parseInt(height) / highestValue) * value)
  }

  function getBarWidth() {
    return Math.max((parseInt(width) - (dataLength * parseInt(gap))) / dataLength, parseInt(barMinWidth))
  }

  function getAlignment() {
    if (align == "left") return 0
    return (parseInt(gap) + parseInt(width)) - ((parseInt(gap) + barWidth) * dataLength)
  }
</script>



<svg
  { height }
  { width }
  viewBox="0 0 { width } { height }"
  preserveAspectRatio="none"
  on:mouseleave={ () => { $hoveringKey[linkedKey] = null } }
  on:blur={ () => { $hoveringKey[linkedKey] = null } }>

  <g transform="translate({ alignmentOffset }, 0)" { fill }>
    { #each Object.entries(data) as [key, value], i }
      <rect
        on:mouseover={ () => { $hoveringKey[linkedKey] = key } }
        on:focus={ () => { $hoveringKey[linkedKey] = key } }
        style={ transition ? `transition: all ${ transition }ms` : null }
        opacity={ hover && $hoveringKey[linkedKey] && $hoveringKey[linkedKey] != key ? fadeOpacity : 1 }
        width={ barWidth }
        height={ getHeight(value) }
        y={ height - getHeight(value) }
        x={ (parseInt(gap) + barWidth) * i } />
    { /each }
  </g>
</svg>
