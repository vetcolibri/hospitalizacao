import { OrangestIdValue } from "@shared/orangest_id_value.ts";
import { OwnerNameValue } from "./owner_name_value.ts";
import { PhoneNumberValue } from "@shared/phone_number_value.ts";
import { withHeader, withPayload } from "@shared/event.ts";
import { Event } from "@shared/event.ts";
import { IdValue } from "@shared/id_value.ts";

export const OWNER_UPDATED_EVENT_NAME = "OwnerUpdatedEvent";

export function createOwnerUpdatedEvent(
	principal: string,
	data: {
		id: IdValue;
		name?: OwnerNameValue;
		orangestId?: OrangestIdValue;
		phoneNumbers?: PhoneNumberValue[];
	},
): Event<OwnerUpdatedPayload> {
	return Event.create<OwnerUpdatedPayload>(
		OWNER_UPDATED_EVENT_NAME,
		withHeader("AggregateType", "pets.Owner"),
		withHeader("AggregateId", data.id.value),
		withHeader("Principal", principal),
		withPayload({
			name: data.name?.value,
			orangestId: data.orangestId?.value,
			phoneNumbers: data.phoneNumbers?.map((n) => n.formattedNumber),
		} as OwnerUpdatedPayload),
	);
}

export interface OwnerUpdatedPayload {
	name?: string;
	orangestId?: string;
	phoneNumbers?: string[];
}
