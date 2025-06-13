import { IdValue } from "@shared/id_value.ts";
import { DateValue } from "@shared/date_value.ts";
import { ConsciousnessStateEnum } from "./consciousness_state_enum.ts";

export const PERIODIC_REPORT_RELEASED_EVENT_NAME = "PeriodicReportReleasedEvent";

export interface PeriodicReportReleasedPayload {
	hospitalizationId: string; // IdValue.value
	reportId: string; // IdValue.value
	timestamp: string; // DateValue.value (or ISO string if DateValue stores time)
	consciousnessState: ConsciousnessStateEnum;
	annotations: string;
}
