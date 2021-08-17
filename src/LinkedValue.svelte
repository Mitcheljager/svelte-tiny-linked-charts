<script>
  import { hoveringValue } from "./stores/tinyLinkedCharts.js"

  export let uid
  export let empty = "&nbsp;"

  $: value = $hoveringValue[uid]
</script>



{ #if value }
  { value }
{ :else }
  { @html empty }
{ /if }
