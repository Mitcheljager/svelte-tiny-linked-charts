import "jsdom-global/register"
import { render } from "@testing-library/svelte"

import LinkedValue from "../src/LinkedValue.svelte"

test("Value should be rendered with set empty property", () => {
  const { getByText } = render(LinkedValue, { empty: "test", uid: "some-uid" })

  expect(getByText("test")).toBeInTheDocument()
})
