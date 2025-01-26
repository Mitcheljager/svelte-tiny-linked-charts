<script>
  import { hoveringKey } from "$lib/stores/tinyLinkedCharts.js"

  /** @type {{ linked: string, empty?: string, transform?: (label: string) => string }} */
  let { linked, empty = "&nbsp;", transform = (label = "") => label } = $props()

  /** @type {string | null} */
  let label = $derived($hoveringKey[linked])
</script>

{#if label}
  {transform(label)}
{:else}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html empty}
{/if}
