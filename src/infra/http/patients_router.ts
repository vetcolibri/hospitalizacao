import { PatientService } from "application/patient_service.ts";
import { Context, Router } from "deps";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { Patient } from "domain/patient/patient.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { validate } from "shared/tools.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import {
    sendBadRequest,
    sendCreated,
    sendNotFound,
    sendOk,
    sendServerError,
} from "infra/http/responses.ts";
import {
    endBudgetSchema,
    endhospitalizationSchema,
    newHospitalizationSchema,
    newPatientSchema,
} from "infra/http/schemas/patient_schema.ts";
import { PatientIdAlreadyExists } from "domain/patient/patient_id_already_exists_error.ts";
import { InvalidNumber } from "domain/hospitalization/invalid_number_error.ts";
import { InvalidDate } from "domain/hospitalization/invalid_date_error.ts";
import { TransactionController } from "shared/transaction_controller.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";

interface PatientDTO {
    systemId: string;
    patientId: string;
    name: string;
    specie: string;
    breed: string;
    status: string;
    birthDate: string;
    ownerId: string;
}

function toPatientDTO(patient: Patient): PatientDTO {
    return {
        systemId: patient.systemId.value,
        patientId: patient.patientId.value,
        name: patient.name,
        specie: patient.specie.toString(),
        breed: patient.breed,
        status: patient.status.toString(),
        birthDate: patient.birthDate.age,
        ownerId: patient.ownerId.value,
    };
}

export default function (service: PatientService, transaction: TransactionController) {
    const hospitalizedHandler = async (ctx: Context) => {
        const patients = await service.listHospitalizad();
        const patientDTO: PatientDTO[] = patients.map(toPatientDTO);
        sendOk(ctx, patientDTO);
    };

    const nonHospitalizedHandler = async (ctx: ContextWithParams) => {
        const patients = await service.listNonHospitalized();
        const patientDTO: PatientDTO[] = patients.map(toPatientDTO);
        sendOk(ctx, patientDTO);
    };

    const hospitalizeHandler = async (ctx: Context) => {
        const { patientId, hospitalizationData } = ctx.state.validatedData;
        const resultOrErr = await service.newHospitalization(
            patientId,
            hospitalizationData,
        );

        if (resultOrErr.value instanceof PatientNotFound) {
            sendNotFound(ctx, resultOrErr.value.message);
            return;
        }

        if (resultOrErr.isLeft()) {
            sendBadRequest(ctx, resultOrErr.value.message);
            return;
        }
        sendCreated(ctx);
    };

    const newPatientHandler = async (ctx: Context) => {
        const newPatientData = ctx.state.validatedData;
        const username = ctx.state.username;
        try {
            await transaction.begin();

            const voidOrErr = await service.newPatient({...newPatientData, username: username});

            if (voidOrErr.value instanceof PatientIdAlreadyExists) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof InvalidNumber) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof InvalidDate) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof Error) {
                sendServerError(ctx);
                return;
            }

            await transaction.commit();

            sendCreated(ctx);
        } catch (error) {
            await transaction.rollback();
            sendServerError(ctx, error);
        }
    };

    const endHospitalizationHandler = async (ctx: Context) => {
        const { patientId } = ctx.state.validatedData;
        const username = ctx.state.username;
        try {
            await transaction.begin();

            const voidOrErr = await service.endHospitalization(patientId, username);

            if (voidOrErr.value instanceof PatientNotFound) {
                sendNotFound(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof HospitalizationNotFound) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof BudgetNotFound) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            await transaction.commit();

            sendOk(ctx);
        } catch (error) {
            await transaction.rollback();
            sendServerError(ctx, error);
        }
    };

    const endBudgetHandler = async (ctx: Context) => {
        const { patientId, hospitalizationId, status } = ctx.state.validatedData;
        const username = ctx.state.username;

        try {
            await transaction.begin();
            const voidOrErr = await service.endBudget(
                patientId,
                hospitalizationId,
                status,
                username
            );

            if (voidOrErr.value instanceof PatientNotFound) {
                sendNotFound(ctx, voidOrErr.value.message);
                return;
            }

            if (voidOrErr.value instanceof BudgetNotFound) {
                sendBadRequest(ctx, voidOrErr.value.message);
                return;
            }

            await transaction.commit();

            sendOk(ctx);
        } catch (error) {
            await transaction.rollback();
            sendServerError(ctx, error);
        }
    };

    const router = new Router({ prefix: "/patients" });
    router.get("/hospitalized", hospitalizedHandler);
    router.get("/", nonHospitalizedHandler);
    router.post("/new-patient", validate(newPatientSchema), newPatientHandler);
    router.post(
        "/hospitalize",
        validate(newHospitalizationSchema),
        hospitalizeHandler,
    );
    router.post(
        "/end-hospitalization",
        validate(endhospitalizationSchema),
        endHospitalizationHandler,
    );
    router.post("/end-budget", validate(endBudgetSchema), endBudgetHandler);
    return router;
}
