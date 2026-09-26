import { defineBoot } from "#q-app";

import { useAuthStore } from "@/stores/auth";

export default defineBoot(({ router }) => {
	router.beforeEach(to => {
		const auth = useAuthStore();
		auth.hydrate();

		const requiresAuth = to.matched.some(route => route.meta.requiresAuth);
		const guestOnly = to.matched.some(route => route.meta.guestOnly);

		if (requiresAuth && !auth.isAuthenticated) {
			return { path: "/login", replace: true };
		}

		if (guestOnly && auth.isAuthenticated) {
			return { path: "/", replace: true };
		}

		return true;
	});
});
