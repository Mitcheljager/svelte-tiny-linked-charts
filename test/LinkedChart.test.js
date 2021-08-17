import "jsdom-global/register"
import { fireEvent, render } from "@testing-library/svelte"

import LinkedChart from "../src/LinkedChart.svelte"

function fakeData(times) {
  let data = {}

  for(let i = 0; i < times; i++) {
    data[i] = Math.floor(Math.random() * 50) + 50
  }

  return data
}

test("Basic chart with data should render rect equal to length of data given", () => {
  const randomLength = Math.floor(Math.random() * 5) + 25
  const data = fakeData(randomLength)

  render(LinkedChart, { data: data })

  expect(document.querySelector("svg")).toBeInTheDocument()
  expect(document.querySelectorAll("rect").length).toBe(randomLength)
})

test("If labels and values are given instead of data it should still render", () => {
  const data = fakeData(20)

  render(LinkedChart, { labels: Object.keys(data), values: Object.values(data) })

  expect(document.querySelector("svg")).toBeInTheDocument()
  expect(document.querySelectorAll("rect").length).toBe(20)
})

test("If showValue is enabled a value should show when a rect is hovered and no value when no longer hovered", async () => {
  const data = fakeData(20)

  const { getByText } = render(LinkedChart, { data: data, showValue: true })

  const elements = document.querySelectorAll("rect")

  await fireEvent.focus(elements[0])
  expect(getByText(data[0])).toBeInTheDocument()

  await fireEvent.focus(elements[10])
  expect(getByText(data[10])).toBeInTheDocument()

  await fireEvent.blur(document.querySelector("svg"))
  expect(() => getByText(data[10])).toThrow()
})

test("If showValue is enabled and valueDefault is set, a default text should show for the value", async () => {
  const data = fakeData(20)

  const { getByText } = render(LinkedChart, { data: data, showValue: true, valueDefault: "test" })

  expect(getByText("test")).toBeInTheDocument()
})
