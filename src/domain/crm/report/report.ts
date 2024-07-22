import { Food } from "domain/crm/report/food.ts";
import { ID } from "shared/id.ts";

export class Report {
	readonly patientId: ID;
	readonly food: Food;
	readonly stateOfConsciousness: string[];

	constructor(patientId: ID, statusOfConsciousness: string[], food: Food) {
		this.patientId = patientId;
		this.stateOfConsciousness = [...statusOfConsciousness];
		this.food = food;
	}
}
