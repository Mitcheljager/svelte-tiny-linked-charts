<script>
  import { hoveringValue } from "$lib/stores/tinyLinkedCharts.js"

  /** @type {{ uid: string, empty?: string, valueUndefined?: number, transform?: (value: number) => number | string }} */
  let {
    uid,
    empty = "&nbsp;",
    valueUndefined = 0,
    transform = (value) => value
  } = $props()

  /** @type {number | null} */
  let value = $derived($hoveringValue[uid])
</script>

{#if uid in $hoveringValue && value !== null}
  {transform(value) || valueUndefined}
{:else}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html empty}
{/if}
