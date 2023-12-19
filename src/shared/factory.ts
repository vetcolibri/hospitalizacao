import { Patient, PatientStatus } from "domain/patients/patient.ts";
import { Owner } from "domain/patients/owner.ts";
import { Alert, AlertStatus } from "domain/alerts/alert.ts";
import { RowObject } from "deps";
import { Hospitalization } from "domain/patients/hospitalization.ts";
import { ID } from "./id.ts";

export interface Factory {
  createOwner(row: RowObject): Owner;
  createPatient(row: RowObject): Patient;
  createAlert(row: RowObject): Alert;
  createHospitalization(row: RowObject): Hospitalization;
}

export class EntityFactory implements Factory {
  createOwner(row: RowObject): Owner {
    const ownerData = {
      ownerId: String(row.owner_id),
      name: String(row.owner_name),
      phoneNumber: String(row.phone_number),
    };
    return Owner.create(ownerData);
  }

  createPatient(row: RowObject): Patient {
    const patientData = {
      patientId: String(row.patient_id),
      name: String(row.name),
      specie: String(row.specie),
      breed: String(row.breed),
      birthDate: String(row.birth_date),
    };

    const owner = this.createOwner(row);
    const patient = Patient.create(patientData, owner);

    const status = String(row.status);
    if (PatientStatus.HOSPITALIZED === status) {
      patient.status = PatientStatus.HOSPITALIZED;
    }

    if (PatientStatus.DISCHARGED === status) {
      patient.status = PatientStatus.DISCHARGED;
    }
    return patient;
  }

  createAlert(row: RowObject): Alert {
    const patient = this.createPatient(row);
    const alertData = {
      alertId: String(row.alert_id),
      parameters: JSON.parse(String(row.parameters)).split(","),
      rate: Number(row.repeat_every),
      time: String(row.time),
      comments: String(row.comments),
      status: String(row.alert_status),
    };

    const alertOrError = Alert.create(patient, alertData);
    const alert = alertOrError.value as Alert;
    alert.alertId = ID.New(String(row.alert_id));

    if (AlertStatus.ENABLED === alertData.status) {
      alert.status = AlertStatus.ENABLED;
    }

    if (AlertStatus.DISABLED === alertData.status) {
      alert.status = AlertStatus.DISABLED;
    }

    return alert;
  }

  createHospitalization(row: RowObject): Hospitalization {
    const hospitalizationData = {
      hospitalizationId: String(row.hospitalization_id),
      entryDate: String(row.entry_date),
      dischargeDate: String(row.discharge_date),
      weight: Number(row.weight),
      complaints: JSON.parse(String(row.complaints)).split(","),
      diagnostics: JSON.parse(String(row.diagnostics)).split(","),
      status: String(row.h_status),
      budgetData: this.createBudgetData(row),
    };
    const hospitalization = Hospitalization.create(hospitalizationData);
    return hospitalization.value as Hospitalization;
  }

  createBudgetData(row: RowObject) {
    return {
      budgetId: String(row.budget_id),
      startOn: String(row.start_on),
      endOn: String(row.end_on),
      status: String(row.b_status),
    };
  }
}
