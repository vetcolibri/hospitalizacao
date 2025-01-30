import { OwnerNotFound } from "domain/crm/owner/owner_not_found_error.ts";
import { AlertAlreadyCanceled } from "domain/hospitalization/alerts/alert_already_canceled_error.ts";
import { AlertNotFound } from "domain/hospitalization/alerts/alert_not_found_error.ts";
import { InvalidRepeatEvery } from "domain/hospitalization/alerts/repeat_every_error.ts";
import { HospitalizationNotFound } from "domain/hospitalization/hospitalization_not_found_error.ts";
import { InvalidDate } from "domain/hospitalization/invalid_date_error.ts";
import { InvalidNumber } from "domain/hospitalization/invalid_number_error.ts";
import { PatientAlreadyDischarged } from "domain/patient/patient_already_discharged_error.ts";
import { PatientAlreadyHospitalized } from "domain/patient/patient_already_hospitalized_error.ts";
import { PatientIdAlreadyExists } from "domain/patient/patient_id_already_exists_error.ts";
import { PatientNotFound } from "domain/patient/patient_not_found_error.ts";
import { PatientNotHospitalized } from "domain/patient/patient_not_hospitalized_error.ts";
import { BudgetNotFound } from "domain/budget/budget_not_found_error.ts";
import { PermissionDenied } from "domain/auth/permission_denied_error.ts";

export type ScheduleError = PatientNotFound | InvalidRepeatEvery | PermissionDenied | Error;
export type NewPatientError =
	| PatientIdAlreadyExists
	| InvalidNumber
	| InvalidDate
	| PermissionDenied
	| Error;
export type CancelError = AlertNotFound | AlertAlreadyCanceled | PermissionDenied | Error;
export type NewHospitalizationError =
	| PatientNotFound
	| PatientAlreadyHospitalized
	| InvalidNumber
	| InvalidDate
	| PermissionDenied
	| Error;

export type EndHospitalizationError =
	| PatientNotFound
	| HospitalizationNotFound
	| BudgetNotFound
	| PermissionDenied
	| Error;

export type EndBudgetError = PatientNotFound | BudgetNotFound | PermissionDenied | Error;
export type ReportError =
	| PatientNotHospitalized
	| PatientNotFound
	| OwnerNotFound
	| PermissionDenied
	| Error;
export type RoundError = PatientNotFound | PatientAlreadyDischarged | PermissionDenied | Error;
