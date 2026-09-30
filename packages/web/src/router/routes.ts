import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		component: () => import("@/layouts/ConsoleLayout.vue"),
		meta: { requiresAuth: true },
		children: [
			{
				path: "",
				redirect: { name: "apps" }
			},
			{
				path: "apps",
				name: "apps",
				component: () => import("@/pages/AppsPage.vue")
			},
			{
				path: "apps/:appName",
				name: "app-detail",
				component: () => import("@/pages/AppDetailPage.vue")
			},
			{
				path: "apps/:appName/stages/:stageName",
				name: "stage-detail",
				component: () => import("@/pages/Stage/StageDetailPage.vue")
			},
			{
				path: "apps/:appName/stages/:stageName/functions",
				name: "stage-functions",
				component: () => import("@/pages/Stage/StageFunctionsPage.vue")
			},
			{
				path: "apps/:appName/stages/:stageName/resources/:category(dynamodb|s3|cognito)",
				name: "stage-resource",
				component: () => import("@/pages/Stage/StageDetailPage.vue")
			},
			{
				path: "accounts",
				name: "accounts",
				component: () => import("@/pages/AccountsPage.vue")
			},
			{
				path: "accounts/:accountId",
				name: "account-detail",
				component: () => import("@/pages/AccountDetailPage.vue")
			},
			{
				path: "users",
				name: "users",
				component: () => import("@/pages/UsersPage.vue")
			},
			{
				path: "operations",
				name: "operations",
				component: () => import("@/pages/OperationsPage.vue")
			},
			{
				path: ":catchAll(.*)*",
				name: "not-found",
				component: () => import("@/pages/ErrorNotFound.vue")
			}
		]
	},
	{
		path: "/login",
		component: () => import("@/layouts/AuthLayout.vue"),
		meta: { guestOnly: true },
		children: [
			{
				path: "",
				name: "login",
				component: () => import("@/pages/AuthPage.vue")
			}
		]
	}
];

export default routes;
