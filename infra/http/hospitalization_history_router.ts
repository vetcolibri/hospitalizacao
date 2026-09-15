import { HospitalizationHistoryService } from "application/hospitalization_history_service.ts";
import { Context, Router } from "deps";
import { Budget } from "domain/budget/budget.ts";
import { Report } from "domain/crm/report/report.ts";
import { Hospitalization } from "domain/hospitalization/hospitalization.ts";
import { Round } from "domain/hospitalization/rounds/round.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import { sendNotFound, sendOk, sendServerError } from "infra/http/responses.ts";

interface HospitalizationHistorySummaryDTO {
	hospitalizationId: string;
	entryDate: string;
	dischargeDate?: string;
	status: string;
}

interface BudgetDTO {
	budgetId: string;
	hospitalizationId: string;
	startOn: string;
	endOn: string;
	status: string;
}

interface MeasurementDTO {
	name: string;
	value: unknown;
	issuedAt: string;
}

interface RoundDTO {
	roundId: string;
	issuedAt?: string;
	measurements: MeasurementDTO[];
}

interface ReportDTO {
	reportId: string;
	createdAt: string;
	stateOfConsciousness: string[];
	food: {
		types: string[];
		level: string;
		datetime: string;
	};
	discharges: { type: string; aspects: string[] }[];
	comments: string;
}

interface HospitalizationDTO {
	hospitalizationId: string;
	patientId: string;
	weight: number;
	complaints: string[];
	diagnostics: string[];
	status: string;
	entryDate: string;
	dischargeDate?: string;
	contact?: { name: string; phoneNumber: string; whatsapp: boolean };
}

interface HospitalizationHistoryDetailDTO {
	hospitalization: HospitalizationDTO;
	budget: BudgetDTO | null;
	rounds: RoundDTO[];
	reports: ReportDTO[];
	contact: { name: string; phoneNumber: string; whatsapp: boolean } | null;
	contactIsSpecific: boolean;
}

function toSummaryDTO(
	summary: {
		hospitalizationId: string;
		entryDate: Date;
		dischargeDate?: Date;
		status: string;
	},
): HospitalizationHistorySummaryDTO {
	return {
		hospitalizationId: summary.hospitalizationId,
		entryDate: summary.entryDate.toISOString(),
		dischargeDate: summary.dischargeDate?.toISOString(),
		status: summary.status,
	};
}

function toHospitalizationDTO(hospitalization: Hospitalization): HospitalizationDTO {
	return {
		hospitalizationId: hospitalization.hospitalizationId.value,
		patientId: hospitalization.patientId.value,
		weight: hospitalization.weight,
		complaints: hospitalization.complaints,
		diagnostics: hospitalization.diagnostics,
		status: hospitalization.status,
		entryDate: hospitalization.entryDate.toISOString(),
		dischargeDate: hospitalization.dischargeDate?.toISOString(),
		contact: hospitalization.contact
			? {
				name: hospitalization.contact.name,
				phoneNumber: hospitalization.contact.phoneNumber,
				whatsapp: hospitalization.contact.whatsapp,
			}
			: undefined,
	};
}

function toBudgetDTO(budget?: Budget): BudgetDTO | null {
	if (!budget) return null;

	return {
		budgetId: budget.budgetId.value,
		hospitalizationId: budget.hospitalizationId.value,
		startOn: budget.startOn.toISOString(),
		endOn: budget.endOn.toISOString(),
		status: budget.status,
	};
}

function roundIssuedAt(round: Round): Date | undefined {
	let latest: Date | undefined;

	for (const parameter of round.parameters) {
		if (!latest || parameter.issuedAt > latest) latest = parameter.issuedAt;
	}

	return latest;
}

function toRoundDTO(round: Round): RoundDTO {
	return {
		roundId: round.roundId.value,
		issuedAt: roundIssuedAt(round)?.toISOString(),
		measurements: round.parameters.map((parameter) => ({
			name: parameter.name,
			value: parameter.value,
			issuedAt: parameter.issuedAt.toISOString(),
		})),
	};
}

function toReportDTO(report: Report): ReportDTO {
	return {
		reportId: report.reportId.value,
		createdAt: report.createdAt.toISOString(),
		stateOfConsciousness: report.stateOfConsciousness,
		food: {
			types: report.food.types,
			level: report.food.level,
			datetime: report.food.datetime.toISOString(),
		},
		discharges: report.discharges.map((discharge) => ({
			type: discharge.type,
			aspects: discharge.aspects,
		})),
		comments: report.comments,
	};
}

export default function (service: HospitalizationHistoryService) {
	const listHistoryHandler = async (ctx: ContextWithParams) => {
		try {
			const summaries = await service.listByPatient(ctx.params.patientId);
			sendOk(ctx, summaries.map(toSummaryDTO));
		} catch (error) {
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const detailHistoryHandler = async (ctx: ContextWithParams) => {
		try {
			const result = await service.detail(
				ctx.params.patientId,
				ctx.params.hospitalizationId,
			);

			if (result.isLeft()) {
				sendNotFound(ctx, result.value.message);
				return;
			}

			const detail = result.value;
			const dto: HospitalizationHistoryDetailDTO = {
				hospitalization: toHospitalizationDTO(detail.hospitalization),
				budget: toBudgetDTO(detail.budget),
				rounds: detail.rounds.map(toRoundDTO),
				reports: detail.reports.map(toReportDTO),
				contact: detail.contact ?? null,
				contactIsSpecific: detail.contactIsSpecific,
			};

			sendOk(ctx, dto);
		} catch (error) {
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const legacyLinkStatusHandler = async (ctx: Context) => {
		try {
			sendOk(ctx, await service.linkStatus());
		} catch (error) {
			sendServerError(ctx, error instanceof Error ? error : new Error(String(error)));
		}
	};

	const router = new Router();
	router.get("/patients/:patientId/hospitalizations", listHistoryHandler);
	router.get(
		"/patients/:patientId/hospitalizations/:hospitalizationId",
		detailHistoryHandler,
	);
	router.get("/hospitalizations/legacy-link-status", legacyLinkStatusHandler);
	return router;
}
