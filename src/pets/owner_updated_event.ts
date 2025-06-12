import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { withHeader, withPayload } from "@shared/event.ts";
import { Event } from "@shared/event.ts";
import { IdValue } from "@shared/id_value.ts";

export const OWNER_UPDATED_EVENT_NAME = "OwnerUpdatedEvent";

export interface OwnerUpdatedPayload {
	name?: string;
	orangestId?: string;
	phoneNumbers?: string[];
}
