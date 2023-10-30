export class Owner {
	readonly ownerId: string;
	readonly name: string;
	readonly phoneNumber: string;

	constructor(ownerId: string, name: string, phoneNumber: string) {
		this.ownerId = ownerId;
		this.name = name;
		this.phoneNumber = phoneNumber;
	}
}
