import { z } from "deps";

export const scheduleAlertSchema = z.object({
  patientId: z.string(),
  alertData: z.object({
    time: z
      .string()
      .datetime()
      .refine((datetime) => new Date(datetime) >= new Date(), {
        message: "A datetime não pode ser menor que a data atual",
        path: [],
      }),
    rate: z.number().int().positive(),
    parameters: z.string().array(),
    comments: z.string(),
  }),
});

export const cancelAlertSchema = z.object({
  alertId: z.string(),
});
