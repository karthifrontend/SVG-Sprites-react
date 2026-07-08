// Small formatting helpers used by the compiler UI. Today this just
// re-exports `copyToClipboard` from `sprite.ts` so consumers that
// import it from a `formatters` path (e.g. the live-demo editor)
// still resolve. Keeping this as its own module also leaves room to
// add non-sprite formatters (number, date, etc.) without touching
// `sprite.ts`.
export { copyToClipboard } from "./sprite";
