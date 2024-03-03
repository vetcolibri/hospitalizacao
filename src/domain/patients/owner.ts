import { ID } from "shared/id.ts";

export class Owner {
	readonly ownerId: ID;
	readonly name: string;
	readonly phoneNumber: string;

	constructor(ownerId: string, name: string, phoneNumber: string) {
		this.ownerId = ID.fromString(ownerId);
		this.name = name;
		this.phoneNumber = phoneNumber;
	}
}
