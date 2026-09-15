import { z } from "deps";

const patientSchema = z.object({
	patientId: z.string().min(1),
	name: z.string().min(1),
	specie: z.string().min(1),
	breed: z.string().min(1),
	birthDate: z.string().min(1),
});

const ownerSchema = z.object({
	ownerId: z.string().min(1),
	name: z.string().min(1),
	phoneNumber: z.string().min(1),
	whatsapp: z.boolean().optional(),
});

const hospitalizationSchema = z.object({
	weight: z.number().gte(1).lte(100),
	entryDate: z.string().min(1),
	dischargeDate: z.string().optional(),
	complaints: z.string().array().min(1),
	diagnostics: z.string().array().min(1),
});

const budgetSchema = z.object({
	startOn: z.string().min(1),
	endOn: z.string().min(1),
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

export const budgetUpdateSchema = z.object({
	startOn: z.string(),
	endOn: z.string(),
});
