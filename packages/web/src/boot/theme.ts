import { defineBoot } from "#q-app";

import { restoreTheme } from "@/composables/theme";

export default defineBoot(({ store }) => {
	restoreTheme(store);
});
