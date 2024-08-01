import { BudgetService } from "application/budget_service.ts";
import { Context, Router } from "deps";
import { Budget } from "domain/budget/budget.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { ContextWithParams } from "infra/http/context_with_params.ts";
import { sendNotFound, sendOk } from "infra/http/responses.ts";
import { budgetUpdateSchema } from "infra/http/schemas/patient_schema.ts";
import { validate } from "shared/tools.ts";

interface BudgetDTO {
	hospitalizationId: string;
	budgetId: string;
	startOn: string;
	endOn: string;
	status: string;
}

function toHospitalizationDTO(budget: Budget): BudgetDTO {
	return {
		hospitalizationId: budget.hospitalizationId.value,
		budgetId: budget.budgetId.value,
		startOn: budget.startOn.toISOString(),
		endOn: budget.endOn.toISOString(),
		status: budget.status,
	};
}

export default function (service: BudgetService) {
	const listBudgetHandler = async (context: Context) => {
		const budgets = await service.getAll();
		const budgetDTO: BudgetDTO[] = budgets.map(toHospitalizationDTO);
		sendOk(context, budgetDTO);
	};

	const updateBudgetHandler = async (ctx: ContextWithParams) => {
		const data = ctx.state.validatedData;
		const budgetId = ctx.params.budgetId;

		const voidOrErr = await service.update(budgetId, data);
		if (voidOrErr.value instanceof BudgetNotFound) {
			sendNotFound(ctx, voidOrErr.value.message);
			return;
		}

		sendOk(ctx);
	};

	const router = new Router({ prefix: "/budgets" });
	router.post("/:budgetId", validate(budgetUpdateSchema), updateBudgetHandler);
	router.get("/", listBudgetHandler);
	return router;
}
