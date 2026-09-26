// packages/web/src/components/ui/dialog/index.ts
export { default as DialogConfirm } from "./DialogConfirm.vue";
export { default as DialogForm } from "./DialogForm.vue";
export { default as DialogTrigger } from "./DialogTrigger.vue";

export type DialogVariant =
	| "primary"
	| "positive"
	| "warning"
	| "negative"
	| "info";
