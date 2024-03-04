<script>
  import { hoveringValue } from "$lib/stores/tinyLinkedCharts.js"

  export let uid
  export let empty = "&nbsp;"
  export let valueUndefined = 0
  export let transform = (value) => value

  $: value = $hoveringValue[uid]
</script>

{#if uid in $hoveringValue && value !== null}
  {transform(value) || valueUndefined}
{:else}
  {@html empty}
{/if}
