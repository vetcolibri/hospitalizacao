import { z } from "deps";

export const loginSchema = z.object({
    username: z.string(),
    password: z.string()
})
