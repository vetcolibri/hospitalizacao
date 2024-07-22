import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { ID } from "shared/id.ts";

export class Report {
	readonly reportId: ID;
	readonly patientId: ID;
	readonly food: Food;
	readonly discharge: Discharge;
	readonly stateOfConsciousness: string[];
	readonly comments: string;

	constructor(
		reportId: ID,
		patientId: ID,
		statusOfConsciousness: string[],
		food: Food,
		discharge: Discharge,
		comments: string,
	) {
		this.reportId = reportId;
		this.patientId = patientId;
		this.stateOfConsciousness = [...statusOfConsciousness];
		this.food = food;
		this.discharge = discharge;
		this.comments = comments;
	}
}
