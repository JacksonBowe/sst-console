import { Hono } from "hono";

import { jobRoutes } from "./job";
import { onSiteRoutes } from "./onsite";

const contractingRoutes = new Hono();

contractingRoutes.route("/jobs", jobRoutes);
contractingRoutes.route("/onsite/task-templates", onSiteRoutes);

export { contractingRoutes };
