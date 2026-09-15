import {
	HospitalizationLinkDiagnostic,
	HospitalizationLinkStatus,
} from "domain/hospitalization/hospitalization_link_diagnostic.ts";
import { ID } from "shared/id.ts";

const NONE: HospitalizationLinkStatus = {
	reportsWithoutHospitalization: 0,
	roundsWithoutHospitalization: 0,
};

/**
 * Diagnóstico em memória usado nos testes e no sandbox: um mapa de pendências
 * por `system_id`. Um paciente sem entrada tem zero, o que permite provar que
 * as pendências de um paciente não aparecem no outro.
 */
export class InmemHospitalizationLinkDiagnostic implements HospitalizationLinkDiagnostic {
	#byPatient: Map<string, HospitalizationLinkStatus>;

	constructor(byPatient: Record<string, HospitalizationLinkStatus> = {}) {
		this.#byPatient = new Map(Object.entries(byPatient));
	}

	statusForPatient(patientId: ID): Promise<HospitalizationLinkStatus> {
		return Promise.resolve(this.#byPatient.get(patientId.value) ?? NONE);
	}
}
