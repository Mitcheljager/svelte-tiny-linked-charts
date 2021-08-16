import svelte from "rollup-plugin-svelte"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import pkg from "./package.json"


export default [
  {
		input: "src/LinkedChart.svelte",
		output: [
			{
				file: pkg.module,
				"format": "en"
			},
			{
				file: pkg.main,
				"format": "umd",
				name: "LinkedChart"
			}
		],
		plugins: [
			svelte(),
			resolve({
				dedupe: ["svelte"]
			}),
			commonjs()
		]
	},
	{
		input: "src/LinkedLabel.svelte",
		output: [
			{
				file: pkg.module,
				"format": "en"
			},
			{
				file: pkg.main,
				"format": "umd",
				name: "LinkedLabel"
			}
		],
		plugins: [
			svelte(),
			resolve({
				dedupe: ["svelte"]
			}),
			commonjs()
		]
	}
]
