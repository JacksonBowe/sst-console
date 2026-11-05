import { z } from "zod";

export const AccountIdSchema = z.string().regex(/^\d{12}$/);
