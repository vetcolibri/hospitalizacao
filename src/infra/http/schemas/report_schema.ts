import { z } from "deps";

export const reportSchema = z.object({
    patientId: z.string(),
    stateOfConsciousness: z.string().array(),
    food: z.object({
        types: z.string().array(),
        level: z.string(),
        datetime: z.string(),
    }),
    discharge: z.object({
        types: z.string().array(),
        aspects: z.string().array(),
    }),
    comments: z.string(),
});
