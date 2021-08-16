<script>
  import { hoveringKey } from "./stores/tinyLinkedCharts.js"

  export let linked

  $: label = $hoveringKey[linked]
</script>



{ #if label }
  { label }
{ /if }



<style>
  div {
    color: red;
  }
</style>
