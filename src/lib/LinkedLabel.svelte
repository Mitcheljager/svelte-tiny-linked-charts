<script>
  import { hoveringKey } from "$lib/stores/tinyLinkedCharts.js"

  export let linked
  export let empty = "&nbsp;"

  $: label = $hoveringKey[linked]
</script>

{#if label}
  {label}
{:else}
  {@html empty}
{/if}
