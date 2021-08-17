<script>
  import { hoveringKey, hoveringValue } from "./stores/tinyLinkedCharts.js"

  export let uid = (Math.random() + 1).toString(36).substring(7)
  export let data = {}
  export let labels = []
  export let values = []
  export let linked = ""
  export let height = 40
  export let width = 150
  export let barMinWidth = 4
  export let grow = false
  export let align = "right"
  export let gap = 1
  export let fill = "#ff3e00"
  export let fadeOpacity = 0.5
  export let hover = true
  export let transition = 0
  export let showValue = false
  export let valueDefault = "&nbsp;"
  export let valuePrepend = ""
  export let valueAppend = ""
  export let valuePosition = "static"
  export let scaleMax = 0

  let valuePositionOffset = 0
  
  $: dataLength = Object.keys(data).length
  $: barWidth = grow ? getBarWidth(dataLength) : parseInt(barMinWidth)
  $: highestValue = getHighestValue(dataLength)
  $: alignmentOffset = dataLength ? getAlignment() : 0
  $: linkedKey = linked || (Math.random() + 1).toString(36).substring(7)
  $: if (labels.length && values.length) data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]]))
  $: if (valuePosition == "floating") valuePositionOffset = (parseInt(gap) + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey])
  $: {
    if ($hoveringKey[linkedKey]) {
      $hoveringValue[uid] = data[$hoveringKey[linkedKey]]
    } else { 
      $hoveringValue[uid] = null
    }
  }

  function getHighestValue() {
    if (scaleMax) return scaleMax
    if (dataLength) return Math.max(...Object.values(data))
    return 0
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

  function startHover(key, index) {
    if (!hover) return
    $hoveringKey[linkedKey] = key
  }

  function endHover() {
    if (!hover) return
    $hoveringKey[linkedKey] = null
  }
</script>



<svg
  { height }
  { width }
  viewBox="0 0 { width } { height }"
  preserveAspectRatio="none"
  on:mouseleave={ endHover }
  on:blur={ endHover }>

  <g transform="translate({ alignmentOffset }, 0)" { fill }>
    { #each Object.entries(data) as [key, value], i }
      <rect
        on:mouseover={ () => startHover(key, i) }
        on:focus={ () => startHover(key, i) }
        on:touchstart={ () => startHover(key, i) }
        style={ transition ? `transition: all ${ transition }ms` : null }
        opacity={ hover && $hoveringKey[linkedKey] && $hoveringKey[linkedKey] != key ? fadeOpacity : 1 }
        width={ barWidth }
        height={ getHeight(value) }
        y={ height - getHeight(value) }
        x={ (parseInt(gap) + barWidth) * i } />
    { /each }
  </g>
</svg>

{ #if showValue }
  <div class="tiny-linked-charts-value" style={ valuePosition == "floating" ? `position: absolute; transform: translateX(${ valuePositionOffset }px)` : null }>
    { #if $hoveringValue[uid] }
      { valuePrepend }
      { $hoveringValue[uid] }
      { valueAppend }
    { :else }
      { @html valueDefault }
    { /if }
  </div>
{ /if }
