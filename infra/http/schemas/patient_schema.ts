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

const ANGOLAN_PHONE = /^9[1-9]\d{7}$/;

// RF-13: contacto específico opcional por hospitalização. Não transporta
// identificadores: o servidor nunca confia num owner/contact ID do cliente.
const contactSchema = z.object({
	name: z
		.string({ required_error: "O nome do contacto é obrigatório." })
		.min(1, "O nome do contacto é obrigatório."),
	phoneNumber: z
		.string({ required_error: "O telefone do contacto é obrigatório." })
		.regex(ANGOLAN_PHONE, "Insira um número de telefone angolano válido."),
	whatsapp: z.boolean({
		required_error: "Indique se o contacto tem WhatsApp.",
		invalid_type_error: "Indique se o contacto tem WhatsApp.",
	}),
});

const hospitalizationSchema = z.object({
	weight: z.number().gte(1).lte(100),
	entryDate: z.string().min(1),
	dischargeDate: z.string().optional(),
	complaints: z.string().array().min(1),
	diagnostics: z.string().array().min(1),
	contact: contactSchema.optional(),
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

// Edição dos dados globais do tutor durante a hospitalização: apenas nome,
// telefone e indicação explícita de WhatsApp. O identificador do tutor é
// resolvido no servidor a partir do paciente, nunca a partir do pedido.
const ownerUpdateSchema = z.object({
	name: z
		.string({ required_error: "O nome do tutor é obrigatório." })
		.min(1, "O nome do tutor é obrigatório."),
	phoneNumber: z
		.string({ required_error: "O telefone do tutor é obrigatório." })
		.regex(ANGOLAN_PHONE, "Insira um número de telefone angolano válido."),
	whatsapp: z.boolean({
		required_error: "Indique se o tutor tem WhatsApp.",
		invalid_type_error: "Indique se o tutor tem WhatsApp.",
	}),
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
	budgetData: budgetSchema,
	ownerData: ownerUpdateSchema.optional(),
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
