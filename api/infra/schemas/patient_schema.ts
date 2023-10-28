import { z } from "../../deps.ts";

const patientSchema = z.object({
	name: z.string(),
	specie: z.enum(["CANINO", "FELINO"]),
	breed: z.string(),
	ownerName: z.string(),
	ownerId: z.string(),
	ownerPhoneNumber: z.string(),
});

const hospitalizationSchema = z.object({
	entryDate: z.string(),
	dischargeDate: z.string(),
	estimatedBudgetDate: z.string(),
	age: z.number().int().lte(20),
	weight: z.number().int().lte(100),
	complaints: z.string(),
	diagnostics: z.string(),
});

export const recuringHospitalizationSchema = z.object({
	patientId: z.string(),
	hospitalizationData: hospitalizationSchema,
});

export const newPatientSchema = z.object({
	patientData: patientSchema,
	hospitalizationSchema: hospitalizationSchema,
});
