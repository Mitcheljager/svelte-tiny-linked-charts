import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LinkedChart from "$lib/LinkedChart.svelte"

/**
 * @param {number} times
 * @param {number} [min]
 * @param {number} [max]
 */
function fakeData(times, min = 50, max = 100) {
  /** @type {Record<string, number>} */
  let data = {}

  for(let i = 0; i < times; i++) {
    data[i] = Math.floor(Math.random() * (max - min)) + min
  }

  return data
}

describe("LinkedChart.svelte", () => {
  it("Should render rect elements equal to length of data given", () => {
    const randomLength = Math.floor(Math.random() * 5) + 25
    const data = fakeData(randomLength)
    const { container } = render(LinkedChart, { data })

    expect(container.querySelector("svg")).toBeTruthy()
    expect(container.querySelectorAll("rect[tabindex]").length).toBe(randomLength)
  })

  it("Should still render if labels and values are given instead of data", () => {
    const data = fakeData(20)
    const { container } = render(LinkedChart, { labels: Object.keys(data), values: Object.values(data) })

    expect(container.querySelector("svg")).toBeTruthy()
    expect(container.querySelectorAll("rect[tabindex]").length).toBe(20)
  })

  it("Should show a value when showValue is enabled when a rect is hovered and no value when no longer hovered", async () => {
    const data = fakeData(20)
    const { getByText, container } = render(LinkedChart, { data, showValue: true })

    const elements = container.querySelectorAll("rect[tabindex]")

    await fireEvent.focus(elements[0])
    expect(getByText(data[0])).toBeTruthy()

    await fireEvent.focus(elements[10])
    expect(getByText(data[10])).toBeTruthy()

    await fireEvent.blur(/** @type {SVGElement} */(container.querySelector("svg")))
    expect(() => getByText(data[10])).toThrow()
  })

  it("Should show valuePrepend before value when hovered", async () => {
    const data = fakeData(20)
    const { getByText, container } = render(LinkedChart, { data, showValue: true, valuePrepend: "Some prepend" })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect[tabindex]"))

    await fireEvent.mouseOver(rect)

    expect(getByText("Some prepend")).toBeTruthy()
  })

  it("Should show valueAppend after value when hovered", async () => {
    const data = fakeData(20)
    const { getByText, container } = render(LinkedChart, { data, showValue: true, valueAppend: "Some append" })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect[tabindex]"))

    await fireEvent.mouseOver(rect)

    expect(getByText("Some append")).toBeTruthy()
  })

  it("Should show default text for value if showValue is enabled and valueDefault is set", () => {
    const data = fakeData(20)
    const { getByText } = render(LinkedChart, { data, showValue: true, valueDefault: "Some Label" })

    expect(getByText("Some Label")).toBeTruthy()
  })

  it("Should show value as floating when valuePosition is given as floating", async () => {
    const data = fakeData(20)
    const { getByText, container } = render(LinkedChart, { data, showValue: true, valuePosition: "floating" })

    const element = container.querySelector(".tiny-linked-charts-value")
    const rect = /** @type {SVGElement} */ (container.querySelector(".tiny-linked-charts-value"))

    await fireEvent.mouseOver(rect)

    expect(element?.getAttribute("style")).toContain("position: absolute; transform: translateX")
  })

  it("Should display a line if type is set to line", () => {
    const data = fakeData(20)
    const { container } = render(LinkedChart, { data, type: "line" })

    expect(container.querySelector("polyline")).toBeTruthy()
  })

  it("Should use given fill color as color for bars", () => {
    const data = fakeData(20)
    const { container } = render(LinkedChart, { data, fill: "#ff00ff" })

    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#ff00ff")
  })

  it("Should render bars with minimum given width when barMinWidth is given", () => {
    const data = fakeData(20)
    const { container } = render(LinkedChart, { data, barMinWidth: 5 })

    expect(container.querySelector("rect")?.getAttribute("width")).toBe("5")
  })

  it("Should render bars to fill out width of the container when grow prop is given", () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, width: 100, grow: true, gap: 0 })

    expect(container.querySelector("rect")?.getAttribute("width")).toBe("20")
  })

  it("Should render bars to fill out width when grow is given and account for the gap size when given", () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, width: 100, grow: true, gap: 5 })

    expect(container.querySelector("rect")?.getAttribute("width")).toBe("15")
  })

  it("Should change styling of bars on hover when hovered", async () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data })

    const barRects = container.querySelectorAll("rect:not([tabindex])")
    const hoverableRects = container.querySelectorAll("rect[tabindex]")

    await fireEvent.mouseOver(hoverableRects[1])

    expect(barRects[2]?.getAttribute("opacity")).not.toBe("1")
  })

  it("Should change styling of bars to given fadeOpacity prop when hovered", async () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, fadeOpacity: 0.1 })

    const barRects = container.querySelectorAll("rect:not([tabindex])")
    const hoverableRects = container.querySelectorAll("rect[tabindex]")

    await fireEvent.mouseOver(hoverableRects[1])

    expect(barRects[2]?.getAttribute("opacity")).toBe("0.1")
  })

  it("Should not change styling of bars on hover when hover is false", async () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, hover: false })

    const barRects = container.querySelectorAll("rect:not([tabindex])")
    const hoverableRects = container.querySelectorAll("rect[tabindex]")

    await fireEvent.mouseOver(hoverableRects[1])

    expect(barRects[2]?.getAttribute("opacity")).toBe("1")
  })

  it("Should render with given height prop", () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, height: 20 })

    expect(container.querySelector("svg")?.getAttribute("height")).toBe("20")
  })

  it("Should render with given width prop", () => {
    const data = fakeData(5)
    const { container } = render(LinkedChart, { data, width: 200 })

    expect(container.querySelector("svg")?.getAttribute("width")).toBe("200")
  })

  it("Should fire given onhover function when hovering bars", async () => {
    const data = fakeData(5)
    const onhover = vi.fn()
    const { container } = render(LinkedChart, { data, onhover })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect[tabindex]"))

    await fireEvent.mouseOver(rect)

    expect(onhover).toBeCalledWith({
      eventElement: expect.any(SVGRectElement),
      index: 0,
      key: "0",
      linkedKey: expect.any(String),
      uid: expect.any(String),
      value: expect.any(Number),
      valueElement: undefined
    })
  })

  it("Should fire given onblur function when exiting hover of svg", async () => {
    const data = fakeData(5)
    const onblur = vi.fn()
    const { container } = render(LinkedChart, { data, onblur })

    const svg = /** @type {SVGElement} */ (container.querySelector("svg"))

    await fireEvent.mouseLeave(svg)

    expect(onblur).toBeCalledWith({
      eventElement: expect.any(SVGElement),
      linkedKey: expect.any(String),
      uid: expect.any(String),
      valueElement: undefined
    })
  })

  it("Should fire given onclick function when clicking bars", async () => {
    const data = fakeData(5)
    const onclick = vi.fn()
    const { container } = render(LinkedChart, { data, onclick })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect[tabindex]"))

    await fireEvent.click(rect)

    expect(onclick).toBeCalledWith({
      key: expect.any(String),
      index: expect.any(Number),
    })
  })

  it("Should use 0 as floor in bars by default", () => {
    const data = { "1": 50, "2": 100 }
    const { container } = render(LinkedChart, { data, height: 50 })

    console.log(container.innerHTML)

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect"))

    expect(rect.getAttribute("height")).toBe("25")
  })

  it("Should use scaleMin as floor in bars if given", () => {
    const data = { "1": 50, "2": 100 }
    const { container } = render(LinkedChart, { data, height: 50, scaleMin: 50 })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect"))

    expect(rect.getAttribute("height")).toBe("0")
  })

  it("Should use max value as ceiling in bars by default", () => {
    const data = { "1": 25 }
    const { container } = render(LinkedChart, { data, height: 50 })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect"))

    expect(rect.getAttribute("height")).toBe("50")
  })

  it("Should use scaleMax as ceiling in bars if given", () => {
    const data = { "1": 20 }
    const { container } = render(LinkedChart, { data, height: 50, scaleMax: 100 })

    const rect = /** @type {SVGRectElement} */ (container.querySelector("rect"))

    expect(rect.getAttribute("height")).toBe("10")
  })

  it("Should not preserve aspect ratio by default", () => {
    const { container } = render(LinkedChart, { data: {} })

    const svg = /** @type {SVGElement} */ (container.querySelector("svg"))

    expect(svg.getAttribute("preserveAspectRatio")).toBe("none")
  })

  it("Should preserve aspect ratio when prop is given", () => {
    const { container } = render(LinkedChart, { data: {}, preserveAspectRatio: true })

    const svg = /** @type {SVGElement} */ (container.querySelector("svg"))

    expect(svg.getAttribute("preserveAspectRatio")).toBe("true")
  })

  it("Should include any rest props on the svg", () => {
    const { container } = render(LinkedChart, { data: {}, "data-thing": "Data value", "aria-label": "Some label" })

    const svg = /** @type {SVGElement} */ (container.querySelector("svg"))

    expect(svg.getAttribute("data-thing")).toBe("Data value")
    expect(svg.getAttribute("aria-label")).toBe("Some label")
  })
})
