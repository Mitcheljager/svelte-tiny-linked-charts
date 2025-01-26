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
   * @property {string} [uid] Unique ID to link this chart to a LinkedValue component with the same uid.
   * @property {Record<string, number>} [data] Data that will be displayed in the chart supplied in key:value object. Key should be a string, value a number.
   * @property {string[]} [labels] Labels supplied separately, to be used together with `values` property.
   * @property {number[]} [values] Values supplied separately, to be used together with `labels` property.
   * @property {string} [linked] Key to link this chart to other charts with the same key.
   * @property {number} [height] Height of the chart in pixels.
   * @property {number} [width] Width of the chart in pixels.
   * @property {number} [barMinWidth] Width of the bars in the chart in pixels.
   * @property {number} [barMinHeight] Minimum height of the bars in the chart in pixels.
   * @property {number} [hideBarBelow] Bars below this value will be hidden, showing as 0 height.
   * @property {boolean} [grow] Whether or not the bar should grow to fill out the full width of the chart.
   * @property {"left" | "right"} [align] The side the bars should align to when they do not completely fill out the chart.
   * @property {number} [gap] Gap between the bars in pixels.
   * @property {string} [fill] Color of the bars, can be any valid CSS color.
   * @property {Array<string | null>} [fillArray] Array of colors for each individual bar.
   * @property {number} [fadeOpacity] The opacity the faded out bars should display in.
   * @property {boolean} [hover] Boolean whether or not this chart can be hovered at all.
   * @property {number} [transition] Transition the chart between different stats. Value is time in milliseconds.
   * @property {boolean} [showValue] Boolean whether or not a value will be shown.
   * @property {string} [valueDefault] Default value when not hovering.
   * @property {string} [valuePrepend] String to prepend the value.
   * @property {string} [valueAppend] String to append to the value.
   * @property {number} [valueUndefined] For when the hovering value returns undefined.
   * @property {"static" | "floating"} [valuePosition] Can be set to "floating" to follow the position of the hover.
   * @property {number} [scaleMax] Use this to overwrite the automatic scale set to the highest value in your array.
   * @property {number} [scaleMin] Use this to overwrite the default value floor of 0.
   * @property {"bar" | "line"} [type] Can be set to "line" to display a line chart instead.
   * @property {string} [lineColor] Color of the line if used with type="line".
   * @property {-1 | 0} [tabindex] Sets the tabindex of each bar.
   * @property {boolean} [preserveAspectRatio]  Sets whether or not the SVG will preserve it's aspect ratio
   * @property {(args: OnClick) => void} [onclick] Function that executes on click and returns the key and index for the clicked data.
   * @property {(args: OnValueUpdate) => void} [onvalueupdate] Function that executes when a value in the chart updates.
   * @property {(args: OnHover) => void} [onhover] Function that executes on hover of each bar, also fires on tab focus.
   * @property {(args: OnBlur) => void} [onblur] Function that executes when hover or focus leaves the chart.
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
    fillArray = [],
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
          fill={fillArray[i] || fill}
          width={barWidth}
          height={getHeight(value)}
          x={(gap + barWidth) * i}
          y={(height - getHeight(value))} />
      {:else if type == "line"}
        <circle
          fill={hover && $hoveringKey[linkedKey] !== null && $hoveringKey[linkedKey] == key ? (fillArray[i] || fill) : "transparent"}
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
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html valueDefault}
    {/if}
  </div>
{/if}
