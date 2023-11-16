import { z } from "../../deps.ts";

const budgetSchema = z.object({
	startOn: z.string(),
	endOn: z.string(),
	status: z.enum(["PENDENTE", "PAGO", "NÃO PAGO"]),
});

const patientSchema = z.object({
	patientId: z.string(),
	name: z.string(),
	specie: z.string(),
	breed: z.string(),
	birthDate: z.string(),
});

const ownerSchema = z.object({
	ownerId: z.string(),
	name: z.string(),
	phoneNumber: z.string(),
});

const hospitalizationSchema = z.object({
	weight: z.number().int().lte(100),
	entryDate: z.string(),
	dischargeDate: z.string(),
	complaints: z.string().array(),
	diagnostics: z.string().array(),
	budgetData: budgetSchema,
});

export const recuringHospitalizationSchema = z.object({
	patientId: z.string(),
	hospitalizationData: hospitalizationSchema,
});

export const newPatientSchema = z.object({
	patientData: patientSchema,
	hospitalizationData: hospitalizationSchema,
	ownerData: ownerSchema,
});
