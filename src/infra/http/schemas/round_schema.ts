import { z } from "deps";

export const roundSchema = z.object({
  patientId: z.string(),
  parameters: z.object({
    heartRate: z
      .object({
        value: z.number(),
      })
      .optional(),
    respiratoryRate: z
      .object({
        value: z.number(),
      })
      .optional(),
    trc: z
      .object({
        value: z.number(),
      })
      .optional(),
    avdn: z
      .object({
        value: z.string(),
      })
      .optional(),
    mucosas: z
      .object({
        value: z.string(),
      })
      .optional(),
    temperature: z
      .object({
        value: z.number(),
      })
      .optional(),
    bloodGlucose: z
      .object({
        value: z.number(),
      })
      .optional(),
    hct: z
      .object({
        value: z.number(),
      })
      .optional(),
    bloodPressure: z
      .object({
        value: z.string(),
      })
      .optional(),
  }),
});
