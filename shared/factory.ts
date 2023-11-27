import { AlertComposeData, OwnerData, PatientComposeData } from "./types.ts";
import { Patient } from "../domain/patients/patient.ts";
import { RowObject } from "../deps.ts";

export interface Factory {
	composeOwnerData(row: RowObject): OwnerData;
	composePatientData(row: RowObject): PatientComposeData;
	composeAlertData(row: RowObject): AlertComposeData;
}

export class ComposeFactory implements Factory  {
	
	composeOwnerData(row: RowObject) {
		return {
			ownerId: String(row.owner_id),
			name: String(row.owner_name),
			phoneNumber: String(row.phone_number),
		};
	}

	composePatientData(row: RowObject) {
		return {
			patientId: String(row.patient_id),
			name: String(row.name),
			specie: String(row.specie),
			breed: String(row.breed),
			status: String(row.status),
			birthDate: String(row.birth_date),
		};
	}

	composeAlertData(row: RowObject) {
		const ownerData = this.composeOwnerData(row);
		const patientData = this.composePatientData(row);
		const patient = Patient.compose(patientData, ownerData);
		return {
			alertId: String(row.alert_id),
			parameters: String(row.parameters).split(","),
			rate: Number(row.repeat_every),
			time: String(row.time),
			comments: String(row.comments),
			status: String(row.alert_status),
			patient: patient,
		};
	}

	composeHospitalizationsData(row: RowObject) {
		return {
			hospitalizationId: String(row.hospitalization_id),
			entryDate: String(row.entry_date),
			dischargeDate: String(row.discharge_date),
			weight: Number(row.weight),
			complaints: String(row.complaints).split(","),
			diagnostics: String(row.diagnostics).split(","),
			status: String(row.h_status),
		};
	}

	composeBudgetsData(row: RowObject) {
		return {
			budgetId: String(row.budget_id),
			startOn: String(row.start_on),
			endOn: String(row.end_on),
			status: String(row.b_status),
		};
	}
}