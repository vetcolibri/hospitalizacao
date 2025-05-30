import { Event, withHeader, withPayload } from "@shared/event.ts";
import { Owner } from "./owner.ts";

export const OWNER_CREATED_EVENT_NAME = "OwnerCreatedEvent";

export interface OwnerCreatedPayload {
	orangestId: string;
	name: string;
	phoneNumbers: string[];
}

export function createOwnerCreatedEvent(
	principal: string,
	owner: Owner,
) {
	return Event.create<OwnerCreatedPayload>(
		OWNER_CREATED_EVENT_NAME,
		withHeader("AggregateType", "pets.Owner"),
		withHeader("AggregateId", owner.id.value),
		withHeader("Principal", principal),
		withPayload({
			orangestId: owner.orangestId.value,
			name: owner.name.value,
			phoneNumbers: owner.phoneNumbers.map((n) => n.formattedNumber),
		}),
	);
}
