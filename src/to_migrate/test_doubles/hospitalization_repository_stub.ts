import { InmemHospitalizationRepository } from "@infra/persistence/inmem/inmem_hospitalization_repository.ts";
import { Hospitalization } from "@domain/hospitalization/hospitalization.ts";
import { ID } from "@shared/id.ts";

export class HospitalizationRepositoryStub extends InmemHospitalizationRepository {
	constructor() {
		super(HOSPITALIZATIONS.filter((h) => h.isOpen()));
	}
}

const hospitalizationData = {
	entryDate: "2021-01-01",
	dischargeDate: new Date().toISOString(),
	weight: 16.5,
	birthDate: "2013-07-01",
	complaints: ["Queixa 1", "Queixa 2"],
	diagnostics: ["Diagnostico 1"],
};

export const HOSPITALIZATIONS = [
	new Hospitalization(
		ID.fromString("0001"),
		"1918BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0002"),
		"1919BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0003"),
		"1920BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0004"),
		"1921BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0005"),
		"1922BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0006"),
		"1924BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0007"),
		"1901BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0008"),
		"1902BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.fromString("0009"),
		"1903BA",
		hospitalizationData.weight,
		hospitalizationData.complaints,
		hospitalizationData.diagnostics,
		hospitalizationData.entryDate,
		hospitalizationData.dischargeDate,
	),
	new Hospitalization(
		ID.random(),
		"1918BA",
		45,
		["Queixa 1"],
		["Diagnostico 1"],
		"2024-04-10",
	),
];
