import { defineBoot } from "#q-app";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

export const queryClient = new QueryClient();

export default defineBoot(({ app }) => {
	app.use(VueQueryPlugin, { queryClient });
});
