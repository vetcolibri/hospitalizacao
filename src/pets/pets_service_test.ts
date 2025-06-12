import { EventBus, InMemEventBus } from "@shared/event_bus.ts";
import { InmemOwnerRepository } from "./inmem_owner_repository.ts";
import { Context } from "@shared/context.ts";
import { assertEquals } from "@deps/assert";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { EventHandler } from "@shared/event_handler.ts";
import { assertInstanceOf } from "@deps/assert/instance-of";
import { ValidationError } from "@shared/validation_error.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { IdValue } from "@shared/id_value.ts";
import { Owner } from "./owner.ts";
import { PetsService } from "./pets_service.ts";
import { OWNER_UPDATED_EVENT_NAME } from "./owner_updated_event.ts";
import { Event } from "@shared/event.ts";

Deno.test("PetsService.createOwner", async (t) => {
	await t.step("Deve criar um owner com sucesso se todos os dados forem válidos", async () => {
		let eventPublished = false;
		const publish = <T>(evt: Event<T>) => {
			if (evt.header("EventName") === "OwnerCreatedEvent") {
				eventPublished = true;
			}
		};

		const eventBus: EventBus = {
			publish,
			publishAll: (...evts: Event<unknown>[]) => {
				evts.forEach((e) => publish(e));
			},
			subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
		};

		const { service, ownerRepository, context } = setupService({ eventBus });

		const request = {
			name: "John Doe",
			orangestId: "21902A",
			phoneNumbers: [{ phoneNumber: "123456789", whatsapp: true, countryCode: "55" }],
		};

		const result = await service.createOwner(context, request);

		const ownerOrErr = await ownerRepository.findByOrangestId(
			OrangestIdValue.fromString(request.orangestId).right,
		);

		assertEquals(result.isRight(), true, `Expected right, got left: ${result.value}`);
		assertEquals(eventPublished, true);
		assertEquals(ownerOrErr.isRight(), true, `Expected right, got left: ${ownerOrErr.value}`);
	});

	await t.step("Deve retornar erro se o nome do owner for inválido", async () => {
		const { service, context } = setupService();
		const request = {
			name: "John",
			orangestId: "92102A",
			phoneNumbers: [{ phoneNumber: "123456789", whatsapp: true, countryCode: "55" }],
		};

		const result = await service.createOwner(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se o número de telefone for inválido", async () => {
		const { service, context } = setupService();

		const request = {
			name: "John Doe",
			orangestId: "39021A",
			phoneNumbers: [{ phoneNumber: "invalid-phone-number", whatsapp: true, countryCode: "55" }],
		};

		const result = await service.createOwner(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se não houver números de telefone", async () => {
		const { service, context } = setupService();

		const request = {
			name: "John Doe",
			orangestId: "38928A",
			phoneNumbers: [],
		};

		const result = await service.createOwner(context, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se o principal não tiver o papel de RECEPCIONISTA", async () => {
		const { service } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: ["VET_ASSISTANT"],
		};

		const request = {
			name: "John Doe",
			orangestId: "38928A",
			phoneNumbers: [{ phoneNumber: "123456789", whatsapp: true, countryCode: "55" }],
		};

		const result = await service.createOwner(ctx, request);

		assertEquals(result.isLeft(), true);
		assertInstanceOf(result.value, ForbiddenError);
	});
});

function setupService(
	opts?: Partial<{ eventBus: EventBus; ownerRepository: InmemOwnerRepository }>,
) {
	const eventBus = opts?.eventBus ?? new InMemEventBus();
	const ownerRepository = opts?.ownerRepository ?? new InmemOwnerRepository();

	const service = new PetsService(eventBus, ownerRepository);

	return {
		service,
		eventBus,
		ownerRepository,
		context: {
			principal: "user@domain.com",
			roles: ["RECEPTIONIST"],
		} as Context,
	};
}

Deno.test("PetsService.updateOwner", async (t) => {
	await t.step("Deve atualizar um owner com sucesso se todos os dados forem válidos", async () => {
		let eventPublished = false;

		const publish = <T>(evt: Event<T>) => {
			if (evt.header("EventName") == OWNER_UPDATED_EVENT_NAME) {
				eventPublished = true;
			}
		};

		const eventBus: EventBus = {
			publish,
			publishAll: (...evts: Event<unknown>[]) => {
				evts.forEach((e) => publish(e));
			},
			subscribe: function <T>(_: string, _h: EventHandler<T>): void {},
		};

		const { service, ownerRepository, context } = setupService({ eventBus });

		const owner = Owner.create(
			IdValue.random(),
			OrangestIdValue.fromString("21902A").right,
			OwnerNameValue.fromString("John Doe").right,
			[PhoneNumberValue.create("123456789", true, "55").right],
		).right;
		await ownerRepository.save(owner);

		const updateRequest = {
			id: owner.id.value,
			name: "John Smith",
			phoneNumbers: [{ phoneNumber: "987654321", whatsapp: false, countryCode: "55" }],
		};

		const updateResult = await service.updateOwner(context, updateRequest);
		const ownerOrErr = await ownerRepository.findById(owner.id);

		assertEquals(updateResult.isRight(), true, `Expected right, got left: ${updateResult.value}`);
		assertEquals(eventPublished, true);
		assertEquals(ownerOrErr.isRight(), true, `Expected right, got left: ${ownerOrErr.value}`);
		assertEquals(ownerOrErr.right.name.value, "John Smith");
		assertEquals(ownerOrErr.right.phoneNumbers[0].number, "987654321");
	});

	await t.step("Deve retornar erro se o nome do owner for inválido", async () => {
		const { service, context, ownerRepository } = setupService();

		const owner = Owner.create(
			IdValue.random(),
			OrangestIdValue.fromString("21902A").right,
			OwnerNameValue.fromString("John Doe").right,
			[PhoneNumberValue.create("123456789", true, "55").right],
		).right;
		ownerRepository.save(owner);

		const updateRequest = {
			id: owner.id.value,
			name: "John",
			phoneNumbers: [{ phoneNumber: "987654321", whatsapp: false, countryCode: "55" }],
		};

		const updateResult = await service.updateOwner(context, updateRequest);

		assertEquals(updateResult.isLeft(), true);
		assertInstanceOf(updateResult.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se o número de telefone for inválido", async () => {
		const { service, context } = setupService();
		const createRequest = {
			name: "John Doe",
			orangestId: "39021A",
			phoneNumbers: [{ phoneNumber: "123456789", whatsapp: true, countryCode: "55" }],
		};

		const createResult = await service.createOwner(context, createRequest);
		assertEquals(createResult.isRight(), true, `Expected right, got left: ${createResult.value}`);

		const updateRequest = {
			id: createResult.right.value,
			name: "John Smith",
			phoneNumbers: [{ phoneNumber: "invalid-phone-number", whatsapp: false, countryCode: "55" }],
		};

		const updateResult = await service.updateOwner(context, updateRequest);

		assertEquals(updateResult.isLeft(), true);
		assertInstanceOf(updateResult.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se não houver números de telefone", async () => {
		const { service, context } = setupService();
		const createRequest = {
			name: "John Doe",
			orangestId: "38928A",
			phoneNumbers: [{ phoneNumber: "123456789", whatsapp: true, countryCode: "55" }],
		};

		const createResult = await service.createOwner(context, createRequest);
		assertEquals(createResult.isRight(), true, `Expected right, got left: ${createResult.value}`);

		const updateRequest = {
			id: createResult.right.value,
			name: "John Smith",
			phoneNumbers: [],
		};

		const updateResult = await service.updateOwner(context, updateRequest);

		assertEquals(updateResult.isLeft(), true);
		assertInstanceOf(updateResult.value, Array<ValidationError>);
	});

	await t.step("Deve retornar erro se o principal não tiver o papel de RECEPCIONISTA", async () => {
		const { service, ownerRepository } = setupService();
		const ctx: Context = {
			principal: "user@domain.com",
			roles: ["VET_ASSISTANT"],
		};

		const owner = Owner.create(
			IdValue.random(),
			OrangestIdValue.fromString("38928A").right,
			OwnerNameValue.fromString("John Doe").right,
			[PhoneNumberValue.create("123456789", true, "55").right],
		).right;

		await ownerRepository.save(owner);

		const updateRequest = {
			id: owner.id.value,
			name: "John Smith",
			phoneNumbers: [{ phoneNumber: "987654321", whatsapp: false, countryCode: "55" }],
		};

		const updateResult = await service.updateOwner(ctx, updateRequest);

		assertEquals(updateResult.isLeft(), true);
		assertInstanceOf(updateResult.value, ForbiddenError);
	});
});
