import { render } from "@testing-library/svelte"
import { afterEach, describe, expect, it } from "vitest"

import LinkedValue from "$lib/LinkedValue.svelte"
import { hoveringValue } from "$lib/stores/tinyLinkedCharts.js"

describe("LinkedValue.svelte", () => {
  afterEach(() => {
    hoveringValue.set({})
  })

  it("Should render value with set empty property", () => {
    const { getByText } = render(LinkedValue, { empty: "test", uid: "some-uid" })

    expect(getByText("test")).toBeTruthy()
  })

  it("Should render value if hoveringValue has given uid", () => {
    hoveringValue.set({ "some-uid": 50 })
    const { getByText, queryByText } = render(LinkedValue, { empty: "test", uid: "some-uid" })

    expect(queryByText("test")).not.toBeTruthy()
    expect(getByText(50)).toBeTruthy()
  })
})
