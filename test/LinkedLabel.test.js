import "jsdom-global/register"
import { render } from "@testing-library/svelte"

import LinkedLabel from "../src/LinkedLabel.svelte"

test("Label should be rendered with set empty property", () => {
  const { getByText } = render(LinkedLabel, { empty: "test", linked: "link-1" })

  expect(getByText("test")).toBeInTheDocument()
})
