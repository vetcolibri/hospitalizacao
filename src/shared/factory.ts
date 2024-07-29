import { RowObject } from "deps";
import { Budget } from "domain/budget/budget.ts";
import { Discharge } from "domain/crm/report/discharge.ts";
import { Food } from "domain/crm/report/food.ts";
import { Report } from "domain/crm/report/report.ts";
import { Alert } from "domain/hospitalization/alerts/alert.ts";
import { Patient } from "domain/patient/patient.ts";
import { ID } from "shared/id.ts";
import { Owner } from "../domain/crm/owner/owner.ts";
import { Hospitalization } from "../domain/hospitalization/hospitalization.ts";

export class EntityFactory {
	createOwner(row: RowObject): Owner {
		const ownerData = {
			ownerId: String(row.owner_id),
			name: String(row.owner_name),
			phoneNumber: String(row.phone_number),
			whatsapp: Boolean(row.whatsapp),
		};

		return new Owner(
			ownerData.ownerId,
			ownerData.name,
			ownerData.phoneNumber,
			ownerData.whatsapp,
		);
	}

	createPatient(row: RowObject): Patient {
		const patientData = {
			systemId: String(row.system_id),
			patientId: String(row.patient_id),
			name: String(row.name),
			specie: String(row.specie),
			breed: String(row.breed),
			birthDate: String(row.birth_date),
			ownerId: String(row.owner_id),
			status: String(row.status),
		};

		const patient = Patient.restore({
			...patientData,
		});

		return patient;
	}

	createAlert(row: RowObject): Alert {
		const alertData = {
			alertId: String(row.alert_id),
			patientId: String(row.system_id),
			parameters: JSON.parse(String(row.parameters)).split(","),
			rate: Number(row.repeat_every),
			time: String(row.time),
			comments: String(row.comments),
			status: String(row.status),
		};

		const alert = Alert.restore({
			...alertData,
		});

		return alert;
	}

	createHospitalization(row: RowObject): Hospitalization {
		const hospitalizationData = {
			patientId: String(row.system_id),
			hospitalizationId: String(row.hospitalization_id),
			entryDate: String(row.entry_date),
			dischargeDate: row.discharge_date as string ?? "",
			weight: Number(row.weight),
			complaints: JSON.parse(String(row.complaints)).split(","),
			diagnostics: JSON.parse(String(row.diagnostics)).split(","),
			status: String(row.status),
		};

		return Hospitalization.restore(hospitalizationData);
	}

	createBudget(row: RowObject): Budget {
		const data = {
			hospitalizationId: String(row.hospitalization_id),
			budgetId: String(row.budget_id),
			startOn: String(row.start_on),
			endOn: String(row.end_on),
			status: String(row.status),
		};

		return Budget.restore(data);
	}

	createReport(row: RowObject): Report {
		const food = new Food(
			JSON.parse(String(row.food_type)).split(","),
			String(row.food_level),
			String(row.food_date),
		);

		const discharge = new Discharge(String(row.discharge_type), String(row.discharge_aspect));

		return new Report(
			ID.fromString(String(row.report_id)),
			ID.fromString(String(row.system_id)),
			JSON.parse(String(row.state_of_consciousness)).split(","),
			food,
			discharge,
			String(row.comments),
		);
	}
}
