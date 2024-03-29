<script>
  import { createEventDispatcher, tick } from "svelte"
  import { hoveringKey, hoveringValue } from "$lib/stores/tinyLinkedCharts.js"

  export let uid = (Math.random() + 1).toString(36).substring(7)
  export let data = {}
  export let labels = []
  export let values = []
  export let linked = ""
  export let height = 40
  export let width = 150
  export let barMinWidth = 4
  export let barMinHeight = 0
  export let hideBarBelow = 0
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
  export let valueUndefined = 0
  export let scaleMax = 0
  export let scaleMin = 0
  export let type = "bar"
  export let lineColor = fill
  export let tabindex = -1
  export let dispatchEvents = false
  export let preserveAspectRatio = false
  export let clickHandler = (key, i) => null

  const dispatch = createEventDispatcher()

  let valuePositionOffset = 0
  let polyline = []
  let valueElement

  $: dataLength = Object.keys(data).length
  $: barWidth = grow ? getBarWidth(dataLength) : parseInt(barMinWidth)
  $: highestValue = getHighestValue(data)
  $: alignmentOffset = dataLength ? getAlignment() : 0
  $: linkedKey = linked || (Math.random() + 1).toString(36).substring(7)
  $: $hoveringValue[uid] = $hoveringKey[linkedKey] ? data[$hoveringKey[linkedKey]] : null
  $: if (labels.length && values.length) data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]]))
  $: if (valuePosition == "floating") valuePositionOffset = (parseInt(gap) + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey]) + alignmentOffset
  $: if (type == "line") polyline = getPolyLinePoints(data)
  $: if (dispatchEvents) dispatch('value-update', { value: $hoveringValue[uid], uid, linkedKey, valueElement })
  $: if (tabindex > 0) console.warn("Tabindex should not be higher than 0")

  function getHighestValue() {
    if (scaleMax) return scaleMax
    if (dataLength) return Math.max(...Object.values(data))
    return 0
  }

  function getHeight(value) {
    if (value < hideBarBelow || value < scaleMin) return 0

    const maxValue = scaleMax || highestValue
    const minValue = scaleMin || 0

    const scaledValue = (value - minValue) / (maxValue - minValue)
    return Math.max(Math.ceil(scaledValue * parseInt(height)), barMinHeight)
  }

  function getBarWidth() {
    return Math.max((parseInt(width) - (dataLength * parseInt(gap))) / dataLength, parseInt(barMinWidth))
  }

  function getAlignment() {
    if (align == "left") return 0
    return (parseInt(gap) + parseInt(width)) - ((parseInt(gap) + barWidth) * dataLength)
  }

  function getPolyLinePoints() {
    let points = []

    for (let i = 0; i < Object.keys(data).length; i++) {
      points.push([i * ((barWidth + parseInt(gap)) + (barWidth / (Object.keys(data).length))), height - getHeight(Object.values(data)[i])])
    }

    return points
  }

  async function startHover(key, index) {
    if (!hover) return
    $hoveringKey[linkedKey] = key

    await tick()

    if (dispatchEvents) dispatch('hover', { uid, key, index, linkedKey, value: $hoveringValue[uid], valueElement, eventElement: event.target })
  }

  async function endHover() {
    if (!hover) return
    $hoveringKey[linkedKey] = null

    await tick()

    if (dispatchEvents) dispatch('blur', { uid, linkedKey, valueElement, eventElement: event.target })
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<svg
  { width }
  height={ type == "line" ? height + barWidth / 2 : height }
  viewBox="0 0 { width } { height }"
  preserveAspectRatio={ preserveAspectRatio ? "true" : "none" }
  {...$$restProps}
  on:mouseleave={ endHover }
  on:blur={ endHover }>

  <g transform="translate({ alignmentOffset }, 0)">
    { #if type == "line" }
      <polyline points={ polyline.join(" ") } stroke={ lineColor } fill="transparent" />
    { /if }

    { #each Object.entries(data) as [key, value], i }
      { #if type == "bar" }
        <rect
          style={ transition ? `transition: all ${ transition }ms` : null }
          opacity={ hover && $hoveringKey[linkedKey] && $hoveringKey[linkedKey] != key ? fadeOpacity : 1 }
          fill={ fill }
          width={ barWidth }
          height={ type == "line" ? height : getHeight(value) }
          x={ (parseInt(gap) + barWidth) * i }
          y={ (height - getHeight(value)) } />
      { :else if type == "line" }
        <circle
          fill={ hover && $hoveringKey[linkedKey] !== null && $hoveringKey[linkedKey] == key ? fill : "transparent" }
          r={ grow ? parseInt(barMinWidth) : barWidth / 2 }
          cy={ height - getHeight(value) }
          cx={ ((parseInt(gap) + barWidth) + (barWidth / (Object.keys(data).length))) * i } />
      { /if }

      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <rect
        on:mouseover={ () => startHover(key, i) }
        on:focus={ () => startHover(key, i) }
        on:touchstart={ () => startHover(key, i) }
        on:click={ () => clickHandler(key, i) }
        on:keypress={ () => clickHandler(key, i) }
        width={ barWidth }
        height={ height }
        fill="transparent"
        x={ (parseInt(gap) + barWidth) * i }
        { tabindex } />
    { /each }
  </g>
</svg>

{ #if showValue && ($hoveringValue[uid] || valueDefault) }
  <div class="tiny-linked-charts-value" style={ valuePosition == "floating" ? `position: absolute; transform: translateX(${ valuePositionOffset }px)` : null }>
    { #if $hoveringValue[uid] !== null }
      { valuePrepend }
      <span bind:this={valueElement}>{ $hoveringValue[uid] || valueUndefined }</span>
      { valueAppend }
    { :else }
      { @html valueDefault }
    { /if }
  </div>
{ /if }
