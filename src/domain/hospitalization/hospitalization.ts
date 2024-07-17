import { ID } from "shared/id.ts";

export enum HospitalizationStatus {
	Open = "Aberta",
	Close = "Fechada",
}

type Options = {
	hospitalizationId: string;
	patientId: string;
	weight: number;
	complaints: string[];
	diagnostics: string[];
	entryDate: string;
	status: string;
	dischargeDate?: string;
};

export class Hospitalization {
	readonly patientId: ID;
	readonly hospitalizationId: ID;
	readonly complaints: string[];
	readonly diagnostics: string[];
	readonly entryDate: Date;
	readonly weight: number;
	dischargeDate?: Date;
	status: HospitalizationStatus;

	constructor(
		hospitalizationId: ID,
		patientId: string,
		weight: number,
		complaints: string[],
		diagnostics: string[],
		entryDate: string,
		dischargeDate?: string,
	) {
		this.hospitalizationId = hospitalizationId;
		this.patientId = ID.fromString(patientId);
		this.complaints = complaints;
		this.diagnostics = diagnostics;
		this.entryDate = new Date(entryDate);
		this.weight = weight;
		this.status = HospitalizationStatus.Open;

		if (dischargeDate) this.dischargeDate = new Date(dischargeDate);
	}

	static restore(data: Options) {
		const hospitalization = new Hospitalization(
			ID.fromString(data.hospitalizationId),
			data.patientId,
			data.weight,
			data.complaints,
			data.diagnostics,
			data.entryDate,
		);

		if (data.status === HospitalizationStatus.Open) {
			hospitalization.status = HospitalizationStatus.Open;
		}

		if (data.status === HospitalizationStatus.Close) {
			hospitalization.status = HospitalizationStatus.Close;
		}

		if (data.dischargeDate) {
			hospitalization.dischargeDate = new Date(data.dischargeDate);
		}

		return hospitalization;
	}

	isOpen() {
		return this.status === HospitalizationStatus.Open;
	}

	close() {
		this.status = HospitalizationStatus.Close;
	}
}
