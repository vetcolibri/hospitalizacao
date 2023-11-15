import { OwnerData } from "../../shared/types.ts";
import { ID } from "../id.ts";

export class Owner {
	readonly ownerId: ID;
	readonly name: string;
	readonly phoneNumber: string;

	private constructor(ownerId: ID, name: string, phoneNumber: string) {
		this.ownerId = ownerId;
		this.name = name;
		this.phoneNumber = phoneNumber;
	}

	static create(ownerData: OwnerData) {
		const { ownerId, name, phoneNumber } = ownerData;
		return new Owner(ID.New(ownerId), name, phoneNumber);
	}
}
