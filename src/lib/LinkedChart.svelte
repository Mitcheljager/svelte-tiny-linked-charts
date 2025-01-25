<script>
  import { tick } from "svelte"
  import { hoveringKey, hoveringValue } from "$lib/stores/tinyLinkedCharts.js"

  /** @typedef {Object} OnValueUpdate
  * @property {number | null} [value]
  * @property {string} [uid]
  * @property {string} [linkedKey]
  * @property {HTMLElement | null} [valueElement]
  */

  /** @typedef {Object} OnClick
   * @property {string} [key]
   * @property {number} [index]
   */

  /** @typedef {Object} OnHover
   * @property {string} uid,
   * @property {string} key,
   * @property {number} index,
   * @property {string} linkedKey,
   * @property {number | null} value,
   * @property {HTMLElement} valueElement,
   * @property {EventTarget | null} eventElement
   */

  /** @typedef {Object} OnBlur
   * @property {string} uid,
   * @property {string} linkedKey,
   * @property {HTMLElement} valueElement,
   * @property {EventTarget | null} eventElement
   */

  /**
   * @typedef {Object} Props
   * @property {string} [uid]
   * @property {Record<string, number>} [data]
   * @property {string[]} [labels]
   * @property {number[]} [values]
   * @property {string} [linked]
   * @property {number} [height]
   * @property {number} [width]
   * @property {number} [barMinWidth]
   * @property {number} [barMinHeight]
   * @property {number} [hideBarBelow]
   * @property {boolean} [grow]
   * @property {"left" | "right"} [align]
   * @property {number} [gap]
   * @property {string} [fill]
   * @property {number} [fadeOpacity]
   * @property {boolean} [hover]
   * @property {number} [transition]
   * @property {boolean} [showValue]
   * @property {string} [valueDefault]
   * @property {string} [valuePrepend]
   * @property {string} [valueAppend]
   * @property {"static" | "floating"} [valuePosition]
   * @property {number} [valueUndefined]
   * @property {number} [scaleMax]
   * @property {number} [scaleMin]
   * @property {"bar" | "line"} [type]
   * @property {string} [lineColor]
   * @property {-1 | 0} [tabindex]
   * @property {boolean} [preserveAspectRatio]
   * @property {(args: OnClick) => void} [onclick]
   * @property {(args: OnValueUpdate) => void} [onvalueupdate]
   * @property {(args: OnHover) => void} [onhover]
   * @property {(args: OnBlur) => void} [onblur]
   */

  /** @type {Props & { [key: string]: any }} */
  let {
    uid = (Math.random() + 1).toString(36).substring(7),
    data = $bindable({}),
    labels = [],
    values = [],
    linked = "",
    height = 40,
    width = 150,
    barMinWidth = 4,
    barMinHeight = 0,
    hideBarBelow = 0,
    grow = false,
    align = "right",
    gap = 1,
    fill = "#ff3e00",
    fadeOpacity = 0.5,
    hover = true,
    transition = 0,
    showValue = false,
    valueDefault = "&nbsp;",
    valuePrepend = "",
    valueAppend = "",
    valuePosition = "static",
    valueUndefined = 0,
    scaleMax = 0,
    scaleMin = 0,
    type = "bar",
    lineColor = fill,
    tabindex = -1,
    preserveAspectRatio = false,
    onclick = ({ key, index }) => null,
    onvalueupdate = ({ value, uid, linkedKey, valueElement }) => null,
    onhover = ({ uid, key, index, linkedKey, value, valueElement, eventElement }) => null,
    onblur = ({ uid, linkedKey, valueElement, eventElement }) => null,
    ...rest
  } = $props()

  let valuePositionOffset = $state(0)
  /** @type {number[][]} */
  let polyline = $state([])
  let valueElement = $state()
  let dataLength = $derived(Object.keys(data).length)
  let barWidth = $derived(dataLength && grow ? getBarWidth() : barMinWidth)
  let highestValue = $derived(data ? getHighestValue() : 0)
  let alignmentOffset = $derived(dataLength ? getAlignment() : 0)
  let linkedKey = $derived(linked || (Math.random() + 1).toString(36).substring(7))

  $effect(() => {
    if (labels.length && values.length) data = Object.fromEntries(labels.map((_, i) => [labels[i], values[i]]))
  })

  $effect(() => {
    $hoveringValue[uid] = $hoveringKey[linkedKey] ? data[$hoveringKey[linkedKey]] : null
  })

  $effect(() => {
    if (valuePosition === "floating") valuePositionOffset = (gap + barWidth) * Object.keys(data).indexOf($hoveringKey[linkedKey] || "") + alignmentOffset
  })

  $effect(() => {
    if (type == "line") polyline = getPolyLinePoints(data)
  })

  $effect(() => {
    onvalueupdate({ value: $hoveringValue[uid], uid, linkedKey, valueElement })
  })

  $effect(() => {
    if (tabindex > 0) console.warn("tabindex should not be higher than 0")
  })

  /** @returns {number} */
  function getHighestValue() {
    if (scaleMax) return scaleMax
    if (dataLength) return Math.max(...Object.values(data))
    return 0
  }

  /**
	 * @param {number} value
   * @returns {number}
	 */
  function getHeight(value) {
    if (value < hideBarBelow || value < scaleMin) return 0

    const maxValue = scaleMax || highestValue
    const minValue = scaleMin || 0

    const scaledValue = (value - minValue) / (maxValue - minValue)
    return Math.max(Math.ceil(scaledValue * height), barMinHeight)
  }

  /** @returns {number} */
  function getBarWidth() {
    return Math.max((width - (dataLength * gap)) / dataLength, barMinWidth)
  }

  /** @returns {number} */
  function getAlignment() {
    if (align == "left") return 0
    return (gap + width) - ((gap + barWidth) * dataLength)
  }

  /** @param {Record<string, number>} data */
  function getPolyLinePoints(data) {
    let points = []

    for (let i = 0; i < Object.keys(data).length; i++) {
      points.push([i * ((barWidth + gap) + (barWidth / (Object.keys(data).length))), height - getHeight(Object.values(data)[i])])
    }

    return points
  }

  /**
   * @param {MouseEvent | FocusEvent | TouchEvent} event
	 * @param {string} key
	 * @param {number} index
	 */
  async function startHover(event, key, index) {
    if (!hover) return
    $hoveringKey[linkedKey] = key

    await tick()

    onhover({ uid, key, index, linkedKey, value: $hoveringValue[uid], valueElement, eventElement: event.target })
  }

  /**
	 * @param {FocusEvent} event
	 */
  async function endHover(event) {
    if (!hover) return
    $hoveringKey[linkedKey] = null
    $hoveringValue[uid] = null

    await tick()

    onblur({ uid, linkedKey, valueElement, eventElement: event.target })
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
  {width}
  height={type == "line" ? height + barWidth / 2 : height}
  viewBox="0 0 {width } {height}"
  preserveAspectRatio={preserveAspectRatio ? "true" : "none"}
  onmouseleave={endHover}
  onblur={endHover}
  {...rest}>

  <g transform="translate({alignmentOffset}, 0)">
    {#if type == "line"}
      <polyline points={polyline.join(" ")} stroke={lineColor} fill="transparent" />
    {/if}

    {#each Object.entries(data) as [key, value], i}
      {#if type == "bar"}
        <rect
          style={transition ? `transition: all ${transition}ms` : null}
          opacity={hover && $hoveringKey[linkedKey] && $hoveringKey[linkedKey] != key ? fadeOpacity : 1}
          fill={fill}
          width={barWidth}
          height={getHeight(value)}
          x={(gap + barWidth) * i}
          y={(height - getHeight(value))} />
      {:else if type == "line"}
        <circle
          fill={hover && $hoveringKey[linkedKey] !== null && $hoveringKey[linkedKey] == key ? fill : "transparent"}
          r={grow ? barMinWidth : barWidth / 2}
          cy={height - getHeight(value)}
          cx={((gap + barWidth) + (barWidth / (Object.keys(data).length))) * i} />
      {/if}

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <rect
        onmouseover={event => startHover(event, key, i)}
        onfocus={event => startHover(event, key, i)}
        ontouchstart={event => startHover(event, key, i)}
        onclick={() => onclick({ key, index: i })}
        onkeypress={() => onclick({ key, index: i })}
        width={barWidth}
        height={height}
        fill="transparent"
        x={(gap + barWidth) * i}
        {tabindex} />
    {/each}
  </g>
</svg>

{#if showValue && ($hoveringValue[uid] || valueDefault)}
  <div class="tiny-linked-charts-value" style={valuePosition == "floating" ? `position: absolute; transform: translateX(${valuePositionOffset}px)` : null}>
    {#if $hoveringValue[uid] !== null}
      {valuePrepend}
      <span bind:this={valueElement}>{$hoveringValue[uid] || valueUndefined}</span>
      {valueAppend}
    {:else}
      {@html valueDefault}
    {/if}
  </div>
{/if}
