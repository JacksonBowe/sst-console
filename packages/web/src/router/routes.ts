import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		component: () => import("@/layouts/MainLayout.vue"),
		meta: { requiresAuth: true },
		children: [
			{ path: "", component: () => import("@/pages/IndexPage.vue") },
			{
				path: "second",
				component: () => import("@/pages/SecondPage.vue")
			}
		]
	},
	{
		path: "/login",
		component: () => import("@/layouts/AuthLayout.vue"),
		meta: { guestOnly: true },
		children: [
			{ path: "", component: () => import("@/pages/AuthPage.vue") }
		]
	},

	// Always leave this as last one,
	// but you can also remove it
	{
		path: "/:catchAll(.*)*",
		component: () => import("@/pages/ErrorNotFound.vue")
	}
];

export default routes;
