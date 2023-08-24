import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import LinkedChart from "$lib/LinkedChart.svelte"

function fakeData(times) {
  let data = {}

  for(let i = 0; i < times; i++) {
    data[i] = Math.floor(Math.random() * 50) + 50
  }

  return data
}

describe("LinkedChart.svelte", () => {
  it("Should render rect elements equal to length of data given", () => {
    const randomLength = Math.floor(Math.random() * 5) + 25
    const data = fakeData(randomLength)

    render(LinkedChart, { data: data })

    expect(document.querySelector("svg")).toBeTruthy()
    expect(document.querySelectorAll("rect[tabindex]").length).toBe(randomLength)
  })

  it("Should still render if labels and values are given instead of data", () => {
    const data = fakeData(20)

    render(LinkedChart, { labels: Object.keys(data), values: Object.values(data) })

    expect(document.querySelector("svg")).toBeTruthy()
    expect(document.querySelectorAll("rect[tabindex]").length).toBe(20)
  })

  it("Should show a value when showValue is enabled when a rect is hovered and no value when no longer hovered", async () => {
    const data = fakeData(20)

    const { getByText } = render(LinkedChart, { data: data, showValue: true })

    const elements = document.querySelectorAll("rect[tabindex]")

    await fireEvent.focus(elements[0])
    expect(getByText(data[0])).toBeTruthy()

    await fireEvent.focus(elements[10])
    expect(getByText(data[10])).toBeTruthy()

    await fireEvent.blur(document.querySelector("svg"))
    expect(() => getByText(data[10])).toThrow()
  })

  it("Should show default text for value if showValue is enabled and valueDefault is set", async () => {
    const data = fakeData(20)

    const { getByText } = render(LinkedChart, { data: data, showValue: true, valueDefault: "test" })

    expect(getByText("test")).toBeTruthy()
  })

  it("Should display a line if type is set to line", async () => {
    const data = fakeData(20)

    render(LinkedChart, { data: data, type: "line" })

    expect(document.querySelector("polyline")).toBeTruthy()
  })
})
