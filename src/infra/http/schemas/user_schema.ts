import { z } from "deps";

export const loginSchema = z.object({
    username: z.string(),
    password: z.string()
})

export const validateTokenSchema = z.object({
    token: z.string()
})
