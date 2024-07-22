import { z } from "deps";

export const reportSchema = z.object({
    patientId: z.string(),
    stateOfConsciousness: z.string().array(),
    food: z.object({
        type: z.string().array(),
        level: z.string(),
        date: z.string(),
    }),
    discharge: z.object({
        type: z.string(),
        aspect: z.string(),
    }),
    comments: z.string(),
});
