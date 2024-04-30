import { ID } from "shared/id.ts";
import { Budget } from "./budget.ts";

export interface BudgetRepository {
	getAll(): Promise<Budget[]>;
	getByHospitalizationId(hospitalizationId: ID): Promise<Budget>;
	save(budget: Budget): Promise<void>;
	update(budget: Budget): Promise<void>;
	last(): Promise<Budget>;
}
