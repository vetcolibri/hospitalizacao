import { z } from "../../deps.ts";

export const patientSchema = z.object({
	patientId: z.string(),
	hospitalizationData: z.object({
		entryDate: z.string(),
		dischargeDate: z.string(),
		estimatedBudgetDate: z.string(),
		age: z.number().int().lte(20),
		weight: z.number().int().lte(100),
		complains: z.string(),
		diagnostics: z.string(),
	}),
});
