import { CrmService } from "application/crm_service.ts";
import { Context, Router } from "deps";
import { Owner } from "domain/crm/owner/owner.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import { sendBadRequest, sendNotFound, sendOk, sendServerError } from "infra/http/responses.ts";
import { reportSchema } from "infra/http/schemas/report_schema.ts";
import { validate } from "shared/tools.ts";
import { TransactionController } from "shared/transaction_controller.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

interface OwnerDTO {
	ownerId: string;
	name: string;
	phoneNumber: string;
	whatsapp: boolean;
}

function toOwnerDTO(owner: Owner): OwnerDTO {
	return {
		ownerId: owner.ownerId.value,
		name: owner.name,
		phoneNumber: owner.phoneNumber,
		whatsapp: owner.whatsapp,
	};
}

export default function (service: CrmService, transaction: TransactionController) {
	const listOwnerHandler = async (ctx: Context) => {
		const owners = await service.getAll();
		sendOk(ctx, owners.map(toOwnerDTO));
	};

	const findOwnerHandler = async (ctx: ContextWithParams) => {
		const ownerId = ctx.params.ownerId;
		const ownerOrErr = await service.findOwner(ownerId);

		if (ownerOrErr.isLeft()) {
			sendNotFound(ctx, ownerOrErr.value.message);
			return;
		}

		sendOk(ctx, toOwnerDTO(ownerOrErr.value));
	};

	const registerReportHandler = async (ctx: Context) => {
		const data = ctx.state.validatedData;
		const username = ctx.state.username;

		try {
			await transaction.begin();

			const voidOrErr = await service.registerReport(data, username);

			if (voidOrErr.value instanceof PatientNotFound) {
				sendNotFound(ctx, voidOrErr.value.message);
				return;
			}

			if (voidOrErr.value instanceof PermissionDenied) {
				sendBadRequest(ctx, voidOrErr.value.message);
				return;
			}

			if (voidOrErr.value instanceof PatientNotHospitalized) {
				sendBadRequest(ctx, voidOrErr.value.message);
				return;
			}

			sendOk(ctx);

			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			sendServerError(ctx, error);
		}
	};

	const findReportsHandler = async (ctx: Context) => {
		const patientId = ctx.request.url.searchParams.get("patientId");

		if (!patientId) {
			sendBadRequest(ctx, "Link inválido");
			return;
		}

		const reportsOrErr = await service.findReports(patientId);

		if (reportsOrErr.isLeft()) {
			sendNotFound(ctx, reportsOrErr.value.message);
			return;
		}

		sendOk(ctx, reportsOrErr.value);
	};

	const router = new Router({ prefix: "/owners" });
	router.get("/reports", findReportsHandler);
	router.get("/:ownerId", findOwnerHandler);
	router.post("/register-report", validate(reportSchema), registerReportHandler);
	router.get("/", listOwnerHandler);
	return router;
}
