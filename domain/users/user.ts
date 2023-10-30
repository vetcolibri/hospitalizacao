import { ID } from "../id.ts";

export class User {
	readonly userId: ID;

	constructor(id: string) {
		this.userId = ID.New(id);
	}
}
