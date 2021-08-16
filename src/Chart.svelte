<script>
  import { onMount } from "svelte"

  import { hoveringKey } from "./stores/tinyLinkedCharts.js"

  export let data = {}
  export let height = 40
  export let width = 150
  export let barMinWidth = 4
  export let grow = false
  export let align = "right"
  export let gap = 1
  export let fill = "green"
  export let fadeOpacity = 0.5
  export let linked = false
  export let hover = true
  export let times // remove me
  
  $: dataLength = Object.keys(data).length
  $: highestValue = dataLength ? getHighestValue() : 0
  $: alignmentOffset = dataLength ? getAlignment() : 0
  $: linkedKey = linked || (Math.random() + 1).toString(36).substring(7)
  $: barWidth = grow ? getBarWidth(dataLength) : barMinWidth

  onMount(fakeData)

  function getHighestValue() {
    return Math.max(...Object.values(data))
  }

  function getHeight(value) {
    return (height / highestValue) * value
  }

  function getBarWidth() {
    return Math.max((width - (dataLength * gap)) / dataLength, barMinWidth)
  }

  function getAlignment() {
    if (align == "left") return 0
    return (gap + width) - ((gap + barWidth) * dataLength)
  }

  function fakeData() {
    for(let i = 0; i < times; i++) {
      data[i] = Math.floor(Math.random() * 100)
    }
  }
</script>



<svg
  { height }
  { width }
  on:mouseleave={ () => { $hoveringKey[linkedKey] = null } }
  on:blur={ () => { $hoveringKey[linkedKey] = null } }>

  <g transform="translate({ alignmentOffset }, 0)">
    { #each Object.entries(data) as [key, value], i }
      <rect
        on:mouseover={ () => { $hoveringKey[linkedKey] = key } }
        on:focus={ () => { $hoveringKey[linkedKey] = key } }
        style="--fade-opacity: { fadeOpacity }"
        class:faded={ hover && $hoveringKey[linkedKey] && $hoveringKey[linkedKey] != key }
        width={ barWidth }
        height={ getHeight(value) }
        y={ height - getHeight(value) }
        x={ (gap + barWidth) * i }
        { fill } />
    { /each }
  </g>
</svg>



<style>
  .faded {
    opacity: var(--fade-opacity);
  }
</style>
