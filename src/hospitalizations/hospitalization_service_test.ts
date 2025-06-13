import { assert, assertEquals, assertInstanceOf } from "@deps/assert";
import { EventBus, InMemEventBus } from "@shared/event_bus.ts";
import { InmemHospitalizationRepository } from "./inmem_hospitalization_repository.ts";
import { Context } from "@shared/context.ts";
import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { ContactPersonValue } from "./contact_person_value.ts";
import { Hospitalization } from "./hospitalization.ts";
import { HospitalizationsService } from "./hospitalization_service.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { Event } from "@shared/event.ts";
import { EventHandler } from "@shared/event_handler.ts";
import { HOSPITALIZATION_CREATED_EVENT_NAME } from "./hospitalization_created_event.ts";
import { HOSPITALIZATION_UPDATED_EVENT_NAME } from "./hospitalization_updated_event.ts";
import { PeriodicReport } from "./periodic_report.ts";
import { PATIENT_DISCHARGED_EVENT_NAME } from "./patient_discharged_event.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";
import { HospitalizationCreatedPayload } from "./hospitalization_created_event.ts";
import { HospitalizationUpdatedPayload } from "./hospitalization_updated_event.ts";
import { ComplaintEnum } from "./complaint_enum.ts";
import { DiagnosisEnum } from "./diagnosis_enum.ts";
import { UserRoleEnum } from "../shared/user_role_enum.ts";
import { HospitalizationStateEnum } from "./hospitalization_state_enum.ts";
import { StateAtDischargeEnum } from "./state_at_discharge_enum.ts";
import {
	PERIODIC_REPORT_RELEASED_EVENT_NAME,
	PeriodicReportReleasedPayload,
} from "./periodic_report_released_event.ts";
import { PatientDischargedPayload } from "./patient_discharged_event.ts";

Deno.test("HospitalizationsService.createHospitalization", async (t) => {
	await t.step(
		"Deve criar uma hospitalização com sucesso se todos os dados forem válidos",
		async () => {
			let eventPublished = false;
			let createdPayload: HospitalizationCreatedPayload | null = null;
			const publish = <T>(evt: Event<T>) => {
				if (evt.header("EventName") === HOSPITALIZATION_CREATED_EVENT_NAME) {
					eventPublished = true;
					createdPayload = evt.payload as HospitalizationCreatedPayload;
				}
			};

			const eventBus: EventBus = {
				publish,
				publishAll: (...evts: Event<unknown>[]) => {
					evts.forEach((e) => publish(e));
				},
				subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
			};

			const { service, hospitalizationRepository, context } = setupService(
				{ eventBus },
			);

			const request = {
				admissionDate: "2024-01-01",
				estimatedDischargeDate: "2024-01-03",
				initialDiagnosis: [DiagnosisEnum.GASTROENTERITIS, DiagnosisEnum.DEHYDRATION],
				complaints: [ComplaintEnum.ANOREXIA, ComplaintEnum.VOMITING, ComplaintEnum.LETHARGY],
				petId: IdValue.random().value,
				petName: "Buddy",
				petAge: "3 anos",
				petWeight: 15.5,
				ownerId: IdValue.random().value,
				ownerName: "Maria Santos",
				contactPersonName: "João Silva",
				contactPersonPhoneNumber: "912345678",
				contactPersonHasWhatsApp: true,
				contactPersonCountryCode: "351",
				contactPersonEmail: "joao@example.com",
			};

			const result = await service.createHospitalization(context, request);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);
			assertEquals(eventPublished, true, "HospitalizationCreatedEvent não foi publicado.");

			const hospitalizationOrErr = await hospitalizationRepository.findById(result.right!);
			assertEquals(hospitalizationOrErr.isRight(), true);
			const hospitalization = hospitalizationOrErr.right!;
			assertEquals(
				hospitalization.actualDiagnosis,
				hospitalization.initialDiagnosis,
			);
			assertEquals(hospitalization.state, HospitalizationStateEnum.ON_GOING);
			assertEquals(hospitalization.isActive, true);

			if (createdPayload) {
				const payload = createdPayload as HospitalizationCreatedPayload; // Explicit cast
				assertEquals(payload.state, HospitalizationStateEnum.ON_GOING);
			} else {
				assert(false, "createdPayload should not be null");
			}
		},
	);

	await t.step("Deve retornar erro se o pet já tiver uma hospitalização ativa", async () => {
		const { service, hospitalizationRepository, context } = setupService();

		// Criar pessoa de contacto
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const contactPerson = ContactPersonValue.create(
			"Ana Costa",
			whatsAppNumber,
		).right;

		// Criar hospitalização ativa
		const petId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(IdValue.random())
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.OTHER_INFECTION])
			.withComplaints([ComplaintEnum.FEVER, ComplaintEnum.LETHARGY])
			.withPetId(petId)
			.withPetName("Luna")
			.withPetAge("1 ano")
			.withPetWeight(8.2)
			.withOwnerId(IdValue.random())
			.withOwnerName("Pedro Silva")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		// Tentar criar outra hospitalização para o mesmo pet
		const request = {
			admissionDate: "2024-01-02",
			estimatedDischargeDate: "2024-01-04",
			initialDiagnosis: [DiagnosisEnum.KENNEL_COUGH],
			complaints: [ComplaintEnum.COUGHING],
			petId: petId.value,
			petName: "Luna",
			petAge: "1 ano",
			petWeight: 8.2,
			ownerId: IdValue.random().value,
			ownerName: "Pedro Silva",
			contactPersonName: "Ana Costa",
			contactPersonPhoneNumber: "912345678",
			contactPersonHasWhatsApp: true,
			contactPersonCountryCode: "351",
		};

		const result = await service.createHospitalization(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step("Deve retornar erro se o principal não tiver o papel adequado", async () => {
		const { service } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: [UserRoleEnum.TRAINEE], // Papel inadequado
		};

		const request = {
			admissionDate: "2024-01-01",
			estimatedDischargeDate: "2024-01-03",
			initialDiagnosis: [DiagnosisEnum.GASTROENTERITIS],
			complaints: [ComplaintEnum.VOMITING],
			petId: IdValue.random().value,
			petName: "Rex",
			petAge: "5 anos",
			petWeight: 25.0,
			ownerId: IdValue.random().value,
			ownerName: "Sofia Martins",
			contactPersonName: "Sofia Martins",
			contactPersonPhoneNumber: "923456789",
			contactPersonHasWhatsApp: true,
		};

		const result = await service.createHospitalization(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});

	await t.step("Deve retornar erro se os dados forem inválidos", async () => {
		const { service, context } = setupService();

		const request = {
			admissionDate: "data-inválida",
			estimatedDischargeDate: "2024-01-03",
			initialDiagnosis: [] as DiagnosisEnum[], // Intentionally empty for validation test
			complaints: [] as ComplaintEnum[], // Intentionally empty for validation test
			petId: "id-inválido",
			petName: "",
			petAge: "",
			petWeight: -5,
			ownerId: "id-inválido",
			ownerName: "",
			contactPersonName: "",
			contactPersonPhoneNumber: "invalid-phone",
			contactPersonHasWhatsApp: true,
		};

		const result = await service.createHospitalization(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});
});

Deno.test("HospitalizationsService.updateContactPerson", async (t) => {
	await t.step("Deve atualizar a pessoa de contacto com sucesso", async () => {
		let eventPublished = false;
		let publishedEventPayload: HospitalizationUpdatedPayload | null = null;
		const publish = <T>(evt: Event<T>) => {
			if (evt.header("EventName") === HOSPITALIZATION_UPDATED_EVENT_NAME) {
				eventPublished = true;
				publishedEventPayload = evt.payload as HospitalizationUpdatedPayload;
			}
		};
		const eventBus: EventBus = {
			publish,
			publishAll: (...evts: Event<unknown>[]) => evts.forEach(publish),
			subscribe: () => {},
		};
		const { service, hospitalizationRepository, context } = setupService({ eventBus });

		// Criar pessoa de contacto inicial
		const initialContactPerson = ContactPersonValue.create(
			"Nome Antigo",
			PhoneNumberValue.create("911111111", true, "351").right,
			"antigo@email.com",
		).right!;
		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.OTHER_INFECTION])
			.withComplaints([ComplaintEnum.OTHER]) // Or a more specific enum member if appropriate
			.withPetId(IdValue.random())
			.withPetName("PetName")
			.withPetAge("1 ano")
			.withPetWeight(5)
			.withOwnerId(IdValue.random())
			.withOwnerName("OwnerName")
			.withContactPerson(initialContactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const updateRequest = {
			id: hospitalizationId.value,
			name: "Novo Nome",
			phoneNumber: "987654321",
			whatsapp: true,
			contactPersonEmail: "novo@email.com",
		};

		const result = await service.updateContactPerson(context, updateRequest);

		assertEquals(result.isRight(), true, `Erro: ${JSON.stringify(result.value)}`);
		assertEquals(
			eventPublished,
			true,
			"Evento HOSPITALIZATION_UPDATED_EVENT_NAME não foi publicado.",
		);
		assertEquals(publishedEventPayload!.contactPersonChanged, true);

		const updatedHospOrErr = await hospitalizationRepository.findById(hospitalizationId);
		assertEquals(updatedHospOrErr.isRight(), true);
		const updatedHosp = updatedHospOrErr.right;
		assertEquals(updatedHosp.contactPerson.fullName, "Novo Nome");
		assertEquals(updatedHosp.contactPerson.phoneNumber.number, "987654321");
		assertEquals(updatedHosp.contactPerson.email, "novo@email.com");
	});

	await t.step(
		"Deve retornar erro se a hospitalização não existir ao tentar atualizar pessoa de contacto",
		async () => {
			const { service, context } = setupService();
			const updateRequest = {
				id: IdValue.random().value,
				name: "Nome Qualquer",
				phoneNumber: "933333333",
				whatsapp: true,
			};
			const result = await service.updateContactPerson(context, updateRequest);
			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, Array);
			const error = (result.value as ValidationError[])[0];
			assert(error.message.includes("not found"));
		},
	);

	await t.step("Deve retornar erro se os dados da pessoa de contacto forem inválidos", async () => {
		const { service, hospitalizationRepository, context } = setupService();
		const hospitalizationId = IdValue.random();
		const contactPerson = ContactPersonValue.create(
			"Nome Valido",
			PhoneNumberValue.create("911111111", true, "351").right!,
		).right!;
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.TRAUMA])
			.withComplaints([ComplaintEnum.PAIN])
			.withPetId(IdValue.random())
			.withPetName("Pet Name")
			.withPetAge("1")
			.withPetWeight(1)
			.withOwnerId(IdValue.random())
			.withOwnerName("Owner Name")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const updateRequest = {
			id: hospitalizationId.value,
			name: "", // Nome inválido
			phoneNumber: "922222222",
			whatsapp: true,
		};
		const result = await service.updateContactPerson(context, updateRequest);
		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array);
	});

	await t.step(
		"Deve retornar ForbiddenError se o utilizador não tiver permissão para atualizar pessoa de contacto",
		async () => {
			const { service } = setupService();
			const forbiddenContext: Context = { principal: "test", roles: [UserRoleEnum.TRAINEE] };
			const updateRequest = {
				id: IdValue.random().value,
				name: "Novo Nome",
				phoneNumber: "987654321",
				whatsapp: true,
			};
			const result = await service.updateContactPerson(forbiddenContext, updateRequest);
			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, ForbiddenError);
		},
	);
});

Deno.test("HospitalizationsService.updateDiagnosis", async (t) => {
	await t.step("Deve atualizar o diagnóstico com sucesso", async () => {
		let eventPublished = false;
		let publishedEventPayload: HospitalizationUpdatedPayload | null = null;
		const publish = <T>(evt: Event<T>) => {
			if (evt.header("EventName") === HOSPITALIZATION_UPDATED_EVENT_NAME) {
				eventPublished = true;
				publishedEventPayload = evt.payload as HospitalizationUpdatedPayload;
			}
		};
		const eventBus: EventBus = {
			publish,
			publishAll: (...evts: Event<unknown>[]) => evts.forEach(publish),
			subscribe: () => {},
		};
		const { service, hospitalizationRepository, context } = setupService({ eventBus });

		const contactPerson = ContactPersonValue.create(
			"Nome Contato",
			PhoneNumberValue.create("911111111", true, "351").right!,
		).right!;
		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.GASTROENTERITIS, DiagnosisEnum.DEHYDRATION])
			.withComplaints([ComplaintEnum.VOMITING, ComplaintEnum.DIARRHEA])
			.withPetId(IdValue.random())
			.withPetName("PetName")
			.withPetAge("1 ano")
			.withPetWeight(5)
			.withOwnerId(IdValue.random())
			.withOwnerName("OwnerName")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const newDiagnosis = [DiagnosisEnum.GASTROENTERITIS, DiagnosisEnum.PARVOVIRUS];
		const updateRequest = {
			id: hospitalizationId.value,
			actualDiagnosis: newDiagnosis,
		};

		const result = await service.updateDiagnosis(context, updateRequest);

		assertEquals(result.isRight(), true, `Erro: ${JSON.stringify(result.value)}`);
		assertEquals(
			eventPublished,
			true,
			"Evento HOSPITALIZATION_UPDATED_EVENT_NAME não foi publicado.",
		);
		assertEquals(publishedEventPayload!.actualDiagnosis, newDiagnosis);

		const updatedHospOrErr = await hospitalizationRepository.findById(hospitalizationId);
		assertEquals(updatedHospOrErr.isRight(), true);
		assertEquals(updatedHospOrErr.right.actualDiagnosis, newDiagnosis);
	});

	await t.step(
		"Deve retornar erro se a hospitalização não existir ao tentar atualizar diagnóstico",
		async () => {
			const { service, context } = setupService();
			const updateRequest = {
				id: IdValue.random().value,
				actualDiagnosis: [DiagnosisEnum.FRACTURE],
			};
			const result = await service.updateDiagnosis(context, updateRequest);
			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, Array);
		},
	);

	await t.step(
		"Deve retornar erro se os dados do diagnóstico forem inválidos (ex: array vazio)",
		async () => {
			const { service, hospitalizationRepository, context } = setupService();
			const hospitalizationId = IdValue.random();
			const contactPerson = ContactPersonValue.create(
				"Nome Valido",
				PhoneNumberValue.create("911111111", true, "351").right!,
			).right!;
			const hospitalization = new Hospitalization.Builder()
				.withId(hospitalizationId)
				.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
				.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
				.withInitialDiagnosis([DiagnosisEnum.DEHYDRATION])
				.withComplaints([ComplaintEnum.LETHARGY])
				.withPetId(IdValue.random())
				.withPetName("Pet Name")
				.withPetAge("1")
				.withPetWeight(1)
				.withOwnerId(IdValue.random())
				.withOwnerName("Owner Name")
				.withContactPerson(contactPerson)
				.build();
			await hospitalizationRepository.save(hospitalization);

			const updateRequest = {
				id: hospitalizationId.value,
				actualDiagnosis: [], // Diagnóstico inválido
			};
			const result = await service.updateDiagnosis(context, updateRequest);
			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, Array);
		},
	);

	await t.step(
		"Deve retornar ForbiddenError se o utilizador não tiver permissão para atualizar diagnóstico",
		async () => {
			const { service } = setupService();
			const forbiddenContext: Context = { principal: "test", roles: [UserRoleEnum.TRAINEE] };
			const updateRequest = { id: IdValue.random().value, actualDiagnosis: [DiagnosisEnum.OTHER] };
			const result = await service.updateDiagnosis(forbiddenContext, updateRequest);
			assertEquals(result.isLeft(), true);
			assertInstanceOf(result.value, ForbiddenError);
		},
	);
});

Deno.test("HospitalizationsService.dischargeHospitalization", async (t) => {
	await t.step("Deve dar alta a uma hospitalização com sucesso", async () => {
		let eventPublished = false;
		let publishedEventPayload: PatientDischargedPayload | null = null;
		const eventBus: EventBus = {
			publish: <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PATIENT_DISCHARGED_EVENT_NAME) {
					eventPublished = true;
					publishedEventPayload = evt.payload as PatientDischargedPayload;
				}
			},
			publishAll: (...evts: Event<unknown>[]) => evts.forEach((e) => eventBus.publish(e)),
			subscribe: () => {},
		};
		const { service, hospitalizationRepository, context } = setupService({ eventBus });

		// Criar pessoa de contacto
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const contactPerson = ContactPersonValue.create(
			"Luisa Santos",
			whatsAppNumber,
		).right;

		// Criar hospitalização
		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.POST_SURGICAL_OBSERVATION])
			.withComplaints([ComplaintEnum.PAIN])
			.withPetId(IdValue.random())
			.withPetName("Bella")
			.withPetAge("1 ano")
			.withPetWeight(6.5)
			.withOwnerId(IdValue.random())
			.withOwnerName("Luisa Santos")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const dischargeRequest = {
			id: hospitalizationId.value,
			dischargeDate: "2024-01-02",
			stateAtDischarge: StateAtDischargeEnum.CURED,
		};

		const result = await service.dischargeHospitalization(context, dischargeRequest);

		assertEquals(
			result.isRight(),
			true,
			`Expected right, got left: ${JSON.stringify(result.value)}`,
		);
		assertEquals(eventPublished, true, "PatientDischargedEvent não foi publicado.");

		const dischargedHospitalizationOrErr = await hospitalizationRepository.findById(
			hospitalizationId,
		);
		assertEquals(dischargedHospitalizationOrErr.isRight(), true);
		const dischargedHospitalization = dischargedHospitalizationOrErr.right!;
		assertEquals(dischargedHospitalization.isActive, false);
		assertEquals(dischargedHospitalization.state, HospitalizationStateEnum.CLOSED);
		assertEquals(
			dischargedHospitalization.stateAtDischarge,
			dischargeRequest.stateAtDischarge,
		);
		assertEquals(dischargedHospitalization.dischargeDate?.value, dischargeRequest.dischargeDate);

		if (publishedEventPayload) {
			const payload = publishedEventPayload as PatientDischargedPayload; // Explicit cast
			assertEquals(payload.dischargeDate, dischargeRequest.dischargeDate);
			assertEquals(payload.stateAtDischarge, dischargeRequest.stateAtDischarge);
			assertEquals(payload.totalReports, dischargedHospitalization.periodicReports.length);
		} else {
			assert(false, "publishedEventPayload should not be null here after eventPublished is true");
		}
	});

	await t.step("Deve retornar erro se apenas MED_VET pode dar alta", async () => {
		const { service, hospitalizationRepository } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: [UserRoleEnum.VET_ASSISTANT], // Papel inadequado para dar alta
		};

		// Criar pessoa de contacto
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const contactPerson = ContactPersonValue.create(
			"Carla Pereira",
			whatsAppNumber,
		).right;

		// Criar hospitalização
		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.TRAUMA])
			.withComplaints([ComplaintEnum.INJURY])
			.withPetId(IdValue.random())
			.withPetName("Max")
			.withPetAge("2 anos")
			.withPetWeight(7.8)
			.withOwnerId(IdValue.random())
			.withOwnerName("Carla Pereira")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const dischargeRequest = {
			id: hospitalizationId.value,
			dischargeDate: "2024-01-02",
			stateAtDischarge: StateAtDischargeEnum.CURED,
		};

		const result = await service.dischargeHospitalization(ctx, dischargeRequest);
		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});
});

Deno.test("HospitalizationsService.createPeriodicReport", async (t) => {
	await t.step("Deve criar um relatório periódico com sucesso e publicar evento", async () => {
		let eventPublished = false;
		let publishedEventPayload: PeriodicReportReleasedPayload | null = null;
		const eventBus: EventBus = {
			publish: <T>(evt: Event<T>) => {
				if (evt.header("EventName") === PERIODIC_REPORT_RELEASED_EVENT_NAME) {
					eventPublished = true;
					publishedEventPayload = evt.payload as unknown as PeriodicReportReleasedPayload;
				}
			},
			publishAll: (...evts: Event<unknown>[]) => evts.forEach((e) => eventBus.publish(e)),
			subscribe: () => {},
		};
		const { service, hospitalizationRepository, context } = setupService({ eventBus });

		// Criar pessoa de contacto e hospitalização
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const contactPerson = ContactPersonValue.create(
			"Fernanda Lima",
			whatsAppNumber,
		).right;

		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.GASTROENTERITIS])
			.withComplaints([ComplaintEnum.VOMITING])
			.withPetId(IdValue.random())
			.withPetName("Buddy")
			.withPetAge("3 anos")
			.withPetWeight(15.5)
			.withOwnerId(IdValue.random())
			.withOwnerName("Maria Santos")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		const reportRequest = {
			hospitalizationId: hospitalizationId.value,
			timestamp: "2024-01-01",
			consciousnessStates: ConsciousnessStateEnum.AWAKE,
			annotations: "Pet alerta e responsivo. Sinais vitais estáveis.",
		};

		const result = await service.createPeriodicReport(context, reportRequest);

		assertEquals(
			result.isRight(),
			true,
			`Expected right, got left: ${JSON.stringify(result.value)}`,
		);

		const updatedHospitalizationOrErr = await hospitalizationRepository.findById(hospitalizationId);
		assertEquals(updatedHospitalizationOrErr.isRight(), true);
		const updatedHospitalization = updatedHospitalizationOrErr.right!;
		assertEquals(updatedHospitalization.periodicReports.length, 1);

		const report: PeriodicReport = updatedHospitalization.periodicReports[0];
		assertEquals(report.consciousnessStates, ConsciousnessStateEnum.AWAKE);
		assertEquals(report.annotations, "Pet alerta e responsivo. Sinais vitais estáveis.");

		assertEquals(eventPublished, true, "PeriodicReportReleasedEvent não foi publicado.");
		assert(publishedEventPayload !== null, "Payload do evento não deveria ser nulo.");
		const payload = publishedEventPayload as PeriodicReportReleasedPayload;
		assertEquals(payload.hospitalizationId, hospitalizationId.value);
		assertEquals(payload.reportId, report.id.value);
		assertEquals(payload.timestamp, reportRequest.timestamp);
		assertEquals(payload.consciousnessState, reportRequest.consciousnessStates);
		assertEquals(payload.annotations, reportRequest.annotations);
	});

	await t.step(
		"Deve retornar erro ao tentar adicionar relatório a hospitalização finalizada",
		async () => {
			const { service, hospitalizationRepository, context } = setupService();

			// Criar pessoa de contacto e hospitalização
			const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
			const contactPerson = ContactPersonValue.create(
				"Marta Silva",
				whatsAppNumber,
			).right;

			const hospitalizationId = IdValue.random();
			const hospitalization = new Hospitalization.Builder()
				.withId(hospitalizationId)
				.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
				.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
				.withInitialDiagnosis([DiagnosisEnum.OTHER_INFECTION])
				.withComplaints([ComplaintEnum.FEVER])
				.withPetId(IdValue.random())
				.withPetName("Luna")
				.withPetAge("1 ano")
				.withPetWeight(8.2)
				.withOwnerId(IdValue.random())
				.withOwnerName("Pedro Silva")
				.withContactPerson(contactPerson)
				.build();

			// Dar alta à hospitalização
			const dischargeResult = hospitalization.dischargePatient(
				DateValue.fromString("2024-01-02").right,
				StateAtDischargeEnum.CURED,
			);
			assertEquals(dischargeResult.isRight(), true);
			await hospitalizationRepository.save(hospitalization);

			const reportRequest = {
				hospitalizationId: hospitalizationId.value,
				timestamp: "2024-01-04",
				consciousnessStates: ConsciousnessStateEnum.AWAKE,
				annotations: "Tentativa de relatório após alta",
			};

			const result = await service.createPeriodicReport(context, reportRequest);

			assertEquals(result.isLeft(), true);
		},
	);

	await t.step(
		"Deve criar um relatório simples sem alimentação nem descargas e publicar evento",
		async () => {
			let eventPublished = false;
			let publishedEventPayload: PeriodicReportReleasedPayload | null = null;
			const eventBus: EventBus = {
				publish: <T>(evt: Event<T>) => {
					if (evt.header("EventName") === PERIODIC_REPORT_RELEASED_EVENT_NAME) {
						eventPublished = true;
						publishedEventPayload = evt.payload as unknown as PeriodicReportReleasedPayload;
					}
				},
				publishAll: (...evts: Event<unknown>[]) => evts.forEach((e) => eventBus.publish(e)),
				subscribe: () => {},
			};
			const { service, hospitalizationRepository, context } = setupService({ eventBus });

			// Criar pessoa de contacto e hospitalização
			const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
			const contactPerson = ContactPersonValue.create(
				"Paulo Mendes",
				whatsAppNumber,
			).right;

			const hospitalizationId = IdValue.random();
			const hospitalization = new Hospitalization.Builder()
				.withId(hospitalizationId)
				.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
				.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
				.withInitialDiagnosis([DiagnosisEnum.KENNEL_COUGH])
				.withComplaints([ComplaintEnum.COUGHING])
				.withPetId(IdValue.random())
				.withPetName("Rex")
				.withPetAge("5 anos")
				.withPetWeight(25.0)
				.withOwnerId(IdValue.random())
				.withOwnerName("Sofia Martins")
				.withContactPerson(contactPerson)
				.build();
			await hospitalizationRepository.save(hospitalization);

			const reportRequest = {
				hospitalizationId: hospitalizationId.value,
				timestamp: "2024-01-01",
				consciousnessStates: ConsciousnessStateEnum.ASLEEP,
				annotations: "Pet a dormir pacificamente.",
			};

			const result = await service.createPeriodicReport(context, reportRequest);

			assertEquals(
				result.isRight(),
				true,
				`Expected right, got left: ${JSON.stringify(result.value)}`,
			);

			const updatedHospitalizationOrErr = await hospitalizationRepository.findById(
				hospitalizationId,
			);
			assertEquals(updatedHospitalizationOrErr.isRight(), true);
			const updatedHospitalization = updatedHospitalizationOrErr.right!;
			assertEquals(updatedHospitalization.periodicReports.length, 1);

			const report: PeriodicReport = updatedHospitalization.periodicReports[0];
			assertEquals(report.consciousnessStates, ConsciousnessStateEnum.ASLEEP);
			assertEquals(report.annotations, "Pet a dormir pacificamente.");

			assertEquals(eventPublished, true, "PeriodicReportReleasedEvent não foi publicado.");
			assert(publishedEventPayload !== null, "Payload do evento não deveria ser nulo.");
			const payload = publishedEventPayload as PeriodicReportReleasedPayload;
			assertEquals(payload.hospitalizationId, hospitalizationId.value);
			assertEquals(payload.reportId, report.id.value);
			assertEquals(payload.timestamp, reportRequest.timestamp);
			assertEquals(payload.consciousnessState, reportRequest.consciousnessStates);
			assertEquals(payload.annotations, reportRequest.annotations);
		},
	);

	await t.step("Deve ordenar relatórios por data descendente", async () => {
		const { service, hospitalizationRepository, context } = setupService();

		// Criar pessoa de contacto e hospitalização
		const whatsAppNumber = PhoneNumberValue.create("912345678", true, "351").right;
		const contactPerson = ContactPersonValue.create(
			"Teresa Silva",
			whatsAppNumber,
		).right;

		const hospitalizationId = IdValue.random();
		const hospitalization = new Hospitalization.Builder()
			.withId(hospitalizationId)
			.withAdmissionDate(DateValue.fromString("2024-01-01").right!)
			.withEstimatedDischargeDate(DateValue.fromString("2024-01-03").right!)
			.withInitialDiagnosis([DiagnosisEnum.DEHYDRATION])
			.withComplaints([ComplaintEnum.ANOREXIA])
			.withPetId(IdValue.random())
			.withPetName("Max")
			.withPetAge("2 anos")
			.withPetWeight(7.8)
			.withOwnerId(IdValue.random())
			.withOwnerName("Teresa Silva")
			.withContactPerson(contactPerson)
			.build();
		await hospitalizationRepository.save(hospitalization);

		// Criar três relatórios com datas diferentes
		await service.createPeriodicReport(context, {
			hospitalizationId: hospitalizationId.value,
			timestamp: "2024-01-01",
			consciousnessStates: ConsciousnessStateEnum.AWAKE,
			annotations: "Primeiro relatório",
		});

		await service.createPeriodicReport(context, {
			hospitalizationId: hospitalizationId.value,
			timestamp: "2024-01-02",
			consciousnessStates: ConsciousnessStateEnum.ASLEEP,
			annotations: "Segundo relatório",
		});

		await service.createPeriodicReport(context, {
			hospitalizationId: hospitalizationId.value,
			timestamp: "2024-01-03",
			consciousnessStates: ConsciousnessStateEnum.AWAKE,
			annotations: "Terceiro relatório",
		});

		const updatedHospitalizationOrErr = await hospitalizationRepository.findById(hospitalizationId);
		assertEquals(updatedHospitalizationOrErr.isRight(), true);

		const reports = updatedHospitalizationOrErr.right.periodicReports;
		assertEquals(reports.length, 3);

		// Verificar ordenação descendente por data
		assertEquals(reports[0].annotations, "Terceiro relatório");
		assertEquals(reports[1].annotations, "Segundo relatório");
		assertEquals(reports[2].annotations, "Primeiro relatório");
	});
});

function setupService(
	opts?: Partial<{
		eventBus: EventBus;
		hospitalizationRepository: InmemHospitalizationRepository;
	}>,
) {
	const eventBus = opts?.eventBus ?? new InMemEventBus();
	const hospitalizationRepository = opts?.hospitalizationRepository ??
		new InmemHospitalizationRepository();

	const service = new HospitalizationsService(
		eventBus,
		hospitalizationRepository,
	);

	return {
		service,
		eventBus,
		hospitalizationRepository,
		context: {
			principal: "user@domain.com",
			roles: [UserRoleEnum.MED_VET],
		} as Context,
	};
}
