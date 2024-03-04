<script>
  import { hoveringKey } from "$lib/stores/tinyLinkedCharts.js"

  export let linked
  export let empty = "&nbsp;"
  export let transform = (label) => label

  $: label = $hoveringKey[linked]
</script>

{#if label}
  {transform(label)}
{:else}
  {@html empty}
{/if}
