import { AlertAlreadyDisabled } from "domain/alerts/alert_already_disabled_error.ts";
import { PatientIdAlreadyExists } from "../domain/patients/patient_id_already_exists_error.ts";
import { PatientNotFound } from "domain/patients/patient_not_found_error.ts";
import { InvalidRepeatEvery } from "domain/alerts/repeat_every_error.ts";
import { AlertNotFound } from "domain/alerts/alert_not_found_error.ts";
import { InvalidNumber } from "../domain/patients/hospitalizations/invalid_number_error.ts";
import { InvalidDate } from "../domain/patients/hospitalizations/invalid_date_error.ts";
import { PatientAlreadyHospitalized } from "domain/patients/patient_already_hospitalized_error.ts";
import { HospitalizationAlreadyClosed } from "domain/patients/hospitalizations/hospitalization_already_closed_error.ts";
import { PatientAlreadyDischarged } from "domain/patients/patient_already_discharged_error.ts";

export type ScheduleError = PatientNotFound | InvalidRepeatEvery | Error;
export type NewPatientError = PatientIdAlreadyExists | InvalidNumber | Error;
export type CancelError = AlertNotFound | AlertAlreadyDisabled;
export type NewHospitalizationError =
	| PatientNotFound
	| PatientAlreadyHospitalized
	| InvalidNumber
	| InvalidDate;

export type EndHospitalizationError = PatientNotFound | HospitalizationAlreadyClosed;
export type EndBudgetError = PatientNotFound | PatientAlreadyDischarged;
