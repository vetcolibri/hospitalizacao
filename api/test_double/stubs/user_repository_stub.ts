import { User } from "../../domain/users/user.ts";

export class UserRepositoryStub {
	get(id: string): Promise<User> {
		return Promise.resolve(new User(id));
	}
}
