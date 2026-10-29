// State domain public surface keeps current-State and State Update operations
// separately owned while providing one import path to callers.
export * from "./state";
export * as Update from "./state.update";
export { stateErrors } from "./errors";
