import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { ID } from "shared/id.ts";

export class Report {
	readonly reportId: ID;
	readonly patientId: ID;
	readonly food: Food;
	readonly discharges: Discharge[];
	readonly stateOfConsciousness: string[];
	readonly comments: string;
	readonly createdAt: Date;

	constructor(
		reportId: ID,
		patientId: ID,
		statusOfConsciousness: string[],
		food: Food,
		discharges: Discharge[],
		comments: string,
		createdAt?: Date,
	) {
		this.reportId = reportId;
		this.patientId = patientId;
		this.stateOfConsciousness = [...statusOfConsciousness];
		this.food = food;
		this.discharges = discharges;
		this.comments = comments;

		if (createdAt) {
			this.createdAt = createdAt;
			return;
		}

		this.createdAt = new Date();
	}
}
