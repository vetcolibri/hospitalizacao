import { Context, Router } from "deps";
import { sendOk } from "infra/http/responses.ts";
import { BudgetService } from "application/budget_service.ts";
import { Budget } from "domain/patients/hospitalizations/budget.ts";

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
		budgetId: budget.budgetId,
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

	const router = new Router({ prefix: "/budgets" });
	router.get("/", listBudgetHandler);
	return router;
}
