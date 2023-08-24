import { render } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import LinkedLabel from "$lib/LinkedLabel.svelte"
import { hoveringKey } from '$lib/stores/tinyLinkedCharts.js'

describe("LinkedLabel.svelte", () => {
  afterEach(() => {
    hoveringKey.set({})
  })

  it("Should render label with set empty property", () => {
    const { getByText } = render(LinkedLabel, { empty: "test", linked: "link-1" })

    expect(getByText("test")).toBeTruthy()
  })

  it("Should render value if hoveringValue has given uid", () => {
    hoveringKey.set({ "link-1": "Some label" })

    const { getByText, queryByText } = render(LinkedLabel, { empty: "test", linked: "link-1" })

    expect(queryByText("test")).not.toBeTruthy()
    expect(getByText("Some label")).toBeTruthy()
  })
})
