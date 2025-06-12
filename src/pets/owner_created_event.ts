import { Event, withHeader, withPayload } from "@shared/event.ts";
import { Owner } from "./owner.ts";

export const OWNER_CREATED_EVENT_NAME = "OwnerCreatedEvent";

export interface OwnerCreatedPayload {
	orangestId: string;
	name: string;
	phoneNumbers: string[];
}
