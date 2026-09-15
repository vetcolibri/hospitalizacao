import {
	HospitalizationLinkDiagnostic,
	HospitalizationLinkStatus,
} from "domain/hospitalization/hospitalization_link_diagnostic.ts";

/**
 * Diagnóstico em memória usado nos testes e no sandbox. Por omissão assume zero
 * registos por classificar; um teste pode injectar os totais que quer observar.
 */
export class InmemHospitalizationLinkDiagnostic implements HospitalizationLinkDiagnostic {
	#status: HospitalizationLinkStatus;

	constructor(status: HospitalizationLinkStatus = {
		reportsWithoutHospitalization: 0,
		roundsWithoutHospitalization: 0,
	}) {
		this.#status = status;
	}

	status(): Promise<HospitalizationLinkStatus> {
		return Promise.resolve(this.#status);
	}
}
