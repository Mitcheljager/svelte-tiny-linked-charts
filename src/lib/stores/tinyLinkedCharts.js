import { writable } from "svelte/store"

/** @type {import('svelte/store').Writable<Record<string, string | null>>} */
export const hoveringKey = writable({})

/** @type {import('svelte/store').Writable<Record<string, number | null>>} */
export const hoveringValue = writable({})
