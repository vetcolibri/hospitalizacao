import { Either, left, right } from "@shared/either.ts";
import { IdValue } from "@shared/id_value.ts";
import { Context } from "@shared/context.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { Owner } from "./owner.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { OwnerRepository } from "./owner_repository.ts";
import { DuplicatedOwnerIdError } from "./duplicated_owner_id_error.ts";
import { DuplicatedOrangestIdError } from "./duplicated_orangest_id_error.ts";
import { EventBus } from "@shared/event_bus.ts";
import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { IOError } from "@shared/io_error.ts";
import { decorate, withHeader } from "@shared/event.ts";

const CREATE_OWNER_CAUSE = "Pets.PetsService:createOwner";
const UPDATE_OWNER_CAUSE = "Pets.PetsService:updateOwner";

export class PetsService {
	#ownerRepository: OwnerRepository;
	#eventBus: EventBus;

	constructor(eventBus: EventBus, ownerRepository: OwnerRepository) {
		this.#ownerRepository = ownerRepository;
		this.#eventBus = eventBus;
	}

	async createOwner(
		ctx: Context,
		request: CreateOwnerRequest,
	): Promise<Either<ValidationError[] | ForbiddenError | IOError, IdValue>> {
		if (ctx.roles.some((v) => !["RECEPTIONIST"].includes(v))) {
			return left(new ForbiddenError(CREATE_OWNER_CAUSE));
		}

		const id = IdValue.random();
		const orangestIdOrErr = OrangestIdValue.fromString(request.orangestId);
		const nameOrErr = OwnerNameValue.fromString(request.name);
		const phoneNumbers = request.phoneNumbers.map((n) =>
			PhoneNumberValue.create(n.phoneNumber, n.whatsapp, n.countryCode)
		);

		const errs = [];
		if (orangestIdOrErr.isLeft()) {
			errs.push(orangestIdOrErr.value);
		}

		if (nameOrErr.isLeft()) {
			errs.push(nameOrErr.value);
		}

		for (const phoneNumberOrErr of phoneNumbers) {
			if (phoneNumberOrErr.isLeft()) {
				errs.push(phoneNumberOrErr.value);
			}
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const ownerOrErr = Owner.create(
			id,
			orangestIdOrErr.right,
			nameOrErr.right,
			phoneNumbers.map((n) => n.right),
		);

		if (ownerOrErr.isLeft()) {
			return left([ownerOrErr.value]);
		}

		const exists = await this.#ownerRepository.exists(id);
		if (exists) {
			return left(new DuplicatedOwnerIdError(CREATE_OWNER_CAUSE, id));
		}

		const existsWithOrangestId = await this.#ownerRepository.existsWithOrangestId(
			orangestIdOrErr.right,
		);
		if (existsWithOrangestId) {
			return left(new DuplicatedOrangestIdError(CREATE_OWNER_CAUSE, ownerOrErr.right.orangestId));
		}

		const voidOrErr = await this.#tryIO(
			() => this.#ownerRepository.save(ownerOrErr.value),
			CREATE_OWNER_CAUSE,
			"Erro ao gravar o owner no repositorio",
		);

		if (voidOrErr.isLeft()) {
			return left([voidOrErr.value]);
		}

		const events = ownerOrErr.value.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(ownerOrErr.value.id);
	}

	async #tryIO(
		task: () => Promise<void>,
		cause: string,
		msg: string,
	): Promise<Either<IOError, void>> {
		try {
			await task();
			return right(undefined);
		} catch (error) {
			return left(new IOError(cause, msg, error as Error));
		}
	}

	async updateOwner(
		ctx: Context,
		request: UpdateOwnerRequest,
	): Promise<Either<ValidationError[] | ForbiddenError, void>> {
		if (ctx.roles.some((v) => !["RECEPTIONIST"].includes(v))) {
			return left(new ForbiddenError(UPDATE_OWNER_CAUSE));
		}

		const idOrErr = IdValue.fromString(request.id);
		if (idOrErr.isLeft()) {
			return left([idOrErr.value]);
		}

		const ownerOrErr = await this.#ownerRepository.findById(idOrErr.value);
		if (ownerOrErr.isLeft()) {
			return left([ownerOrErr.value]);
		}

		const errs: ValidationError[] = [];
		const owner = ownerOrErr.value;

		if (request.name) {
			const nameOrErr = OwnerNameValue.fromString(request.name);
			if (nameOrErr.isLeft()) {
				errs.push(nameOrErr.value);
			} else {
				owner.changeName(nameOrErr.right);
			}
		}

		if (request.orangestId) {
			const orangestIdOrErr = OrangestIdValue.fromString(request.orangestId);
			if (orangestIdOrErr.isLeft()) {
				errs.push(orangestIdOrErr.value);
			} else {
				owner.changeOrangestId(orangestIdOrErr.right);
			}
		}

		if (request.phoneNumbers) {
			const phoneNumbersOrErrs = request.phoneNumbers.map((n) =>
				PhoneNumberValue.create(n.phoneNumber, n.whatsapp, n.countryCode)
			);

			for (const phoneNumberOrErr of phoneNumbersOrErrs) {
				if (phoneNumberOrErr.isLeft()) {
					errs.push(phoneNumberOrErr.value as ValidationError);
				}
			}

			if (errs.length === 0) {
				const voidOrErr = owner.updatePhoneNumbers(phoneNumbersOrErrs.map((n) => n.right));
				if (voidOrErr.isLeft()) {
					errs.push(voidOrErr.value);
				}
			}
		}

		if (request.orangestId && request.orangestId !== owner.orangestId.value) {
			const orangeId = OrangestIdValue.fromString(request.orangestId);

			let err: ValidationError | undefined;

			if (orangeId.isLeft()) {
				err = orangeId.value;
			}

			if (orangeId.isRight()) {
				const exists = await this.#ownerRepository.existsWithOrangestId(orangeId.right);
				err = exists
					? new DuplicatedOrangestIdError(UPDATE_OWNER_CAUSE, owner.orangestId)
					: undefined;
			}

			if (err) {
				errs.push(err);
			} else {
				owner.changeOrangestId(orangeId.right);
			}
		}

		if (errs.length > 0) {
			return left(errs);
		}

		const saveOrErr = await this.#tryIO(
			() => this.#ownerRepository.save(owner),
			UPDATE_OWNER_CAUSE,
			"Erro ao gravar as alterações do owner no repositorio",
		);

		if (saveOrErr.isLeft()) {
			return left([saveOrErr.value]);
		}

		const events = owner.clearUncommitedEvents()
			.map((evt) => decorate(evt, withHeader("Principal", ctx.principal)));

		this.#eventBus.publishAll(...events);

		return right(undefined);
	}
}

export interface CreateOwnerRequest {
	name: string;
	orangestId: string;
	phoneNumbers: { phoneNumber: string; whatsapp: boolean; countryCode?: string }[];
}

export interface UpdateOwnerRequest {
	id: string;
	name?: string;
	orangestId?: string;
	phoneNumbers?: { phoneNumber: string; whatsapp: boolean; countryCode?: string }[];
}
