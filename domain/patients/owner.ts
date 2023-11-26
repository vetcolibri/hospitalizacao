import { OwnerData } from "../../shared/types.ts";
import { ID } from "../id.ts";

export class Owner {
	readonly ownerId: ID;
	readonly name: string;
	readonly phoneNumber: string;

	private constructor(ownerId: string, name: string, phoneNumber: string) {
		this.ownerId = ID.New(ownerId);
		this.name = name;
		this.phoneNumber = phoneNumber;
	}

	static create(ownerData: OwnerData) {
		const { ownerId, name, phoneNumber } = ownerData;
		return new Owner(ownerId, name, phoneNumber);
	}
}
