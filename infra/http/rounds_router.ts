import { RoundService } from "application/round_service.ts";
import { Context, Router } from "deps";
import { Parameter } from "domain/hospitalization/parameters/parameter.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import { sendBadRequest, sendNotFound, sendOk, sendServerError } from "infra/http/responses.ts";
import { roundSchema } from "infra/http/schemas/round_schema.ts";
import { TransactionController } from "shared/transaction_controller.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts"

interface ParameterDTO {
	name: string;
	value: unknown;
	issuedAt: string;
}

function toParameterDTO(measurement: Parameter): ParameterDTO {
	return {
		name: measurement.name,
		value: measurement.value,
		issuedAt: measurement.issuedAt.toISOString(),
	};
}

export default function (service: RoundService, transation: TransactionController) {
	const newRoundHandler = async (ctx: Context) => {
		const { patientId, parameters } = ctx.state.validatedData;
		const username = ctx.state.username;

		try {
			await transation.begin();

			const voidOrErr = await service.new(patientId, parameters, username);

			if (voidOrErr.value instanceof PermissionDenied) {
			    sendBadRequest(ctx, voidOrErr.value.message);
				return
			}

			if (voidOrErr.value instanceof PatientAlreadyDischarged) {
				sendBadRequest(ctx, voidOrErr.value.message);
				return;
			}

			if (voidOrErr.value instanceof PatientNotFound) {
				sendNotFound(ctx, voidOrErr.value.message);
				return;
			}

			await transation.commit();

			sendOk(ctx);
		} catch (error) {
			sendServerError(ctx, error);
		}
	};

	const latestMeasurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const parametersOrErr = await service.latestMeasurements(patientId);

		if (parametersOrErr.isLeft()) {
			sendBadRequest(ctx, parametersOrErr.value.message);
			return;
		}

		const parameters = parametersOrErr.value;
		const parameterDTO = parameters.map(toParameterDTO);

		sendOk(ctx, parameterDTO);
	};

	const measurementsHandler = async (ctx: ContextWithParams) => {
		const patientId = ctx.params.patientId;
		const resultOrErr = await service.measurements(patientId);
		if (resultOrErr.isLeft()) {
			sendBadRequest(ctx, resultOrErr.value.message);
			return;
		}

		const parameterDTO = resultOrErr.value.map(toParameterDTO);

		sendOk(ctx, parameterDTO);
	};

	const router = new Router({ prefix: "/rounds" });
	router.post("/new", validate(roundSchema), newRoundHandler);
	router.get("/measurements/latest/:patientId", latestMeasurementsHandler);
	router.get("/measurements/:patientId", measurementsHandler);
	return router;
}
