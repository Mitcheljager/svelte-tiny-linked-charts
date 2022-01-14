<script>
  import { hoveringValue } from "./stores/tinyLinkedCharts.js"

  export let uid
  export let empty = "&nbsp;"
  export let valueUndefined = 0

  $: value = $hoveringValue[uid]
</script>



{ #if uid in $hoveringValue && value !== null }
  { value || valueUndefined }
{ :else }
  { @html empty }
{ /if }
