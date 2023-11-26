import { ID } from "../../../domain/id.ts";
import { User } from "../../../domain/users/user.ts";
import { UserRepository } from "../../../domain/users/user_repository.ts";

export class UserRepositoryStub implements UserRepository {
	get(userId: ID): Promise<User> {
		return Promise.resolve(new User("some-user-id"));
	}
}
