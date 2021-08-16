<script>
  import { hoveringKey } from "./stores/tinyLinkedCharts.js"

  export let linked

  $: label = $hoveringKey[linked]
</script>



{ #if label }
  { label }
{ :else }
  &nbsp;
{ /if }
