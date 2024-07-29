import { z } from "deps";

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
	whatsapp: z.boolean().optional(),
});

const hospitalizationSchema = z.object({
	weight: z.number().lte(100),
	entryDate: z.string(),
	dischargeDate: z.string().optional(),
	complaints: z.string().array(),
	diagnostics: z.string().array(),
});

const budgetSchema = z.object({
	startOn: z.string(),
	endOn: z.string(),
	status: z.enum([
		"NÃO PAGO",
		"PENDENTE",
		"PENDENTE (ORÇAMENTO ENVIADO)",
		"PAGO",
	]),
});

export const newPatientSchema = z.object({
	patientData: patientSchema,
	hospitalizationData: hospitalizationSchema,
	ownerData: ownerSchema,
	budgetData: budgetSchema,
});

export const newHospitalizationSchema = z.object({
	patientId: z.string(),
	hospitalizationData: hospitalizationSchema,
});

export const endhospitalizationSchema = z.object({
	patientId: z.string(),
});

export const endBudgetSchema = z.object({
	patientId: z.string(),
	hospitalizationId: z.string(),
	status: z.enum([
		"NÃO PAGO",
		"PENDENTE",
		"PENDENTE (ORÇAMENTO ENVIADO)",
		"PAGO",
	]),
});
