import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { AlertAlreadyDisabled } from "domain/hospitalization/alerts/alert_already_disabled_error.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { InvalidRepeatEvery } from "domain/hospitalization/alerts/repeat_every_error.ts";
import { HospitalizationAlreadyClosed } from "domain/hospitalization/hospitalization_already_closed_error.ts";
import { InvalidDate } from "domain/hospitalization/invalid_date_error.ts";
import { InvalidNumber } from "domain/hospitalization/invalid_number_error.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PatientIdAlreadyExists } from "domain/patient/patient_id_already_exists_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";

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
export type ReportError = PatientNotHospitalized | PatientNotFound | OwnerNotFound;
export type RoundError = PatientNotFound | PatientAlreadyDischarged;
