import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { ID } from "shared/id.ts";

export class Report {
	readonly patientId: ID;
	readonly food: Food;
	readonly discharge: Discharge;
	readonly stateOfConsciousness: string[];

	constructor(patientId: ID, statusOfConsciousness: string[], food: Food, discharge: Discharge) {
		this.patientId = patientId;
		this.stateOfConsciousness = [...statusOfConsciousness];
		this.food = food;
		this.discharge = discharge;
	}
}
