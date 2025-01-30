import { User } from "domain/auth/user.ts";
import { UserNotFound } from "domain/auth/user_not_found.ts";
import type { UserRepository } from "domain/auth/user_repository.ts";
import type { Username } from "domain/auth/username.ts";
import { type Either, left, right } from "shared/either.ts";

export class InmemUserRepository implements UserRepository {
    #users: Record<string, User> = {};

    constructor(users?: User[]) {
        if (!users) return;

        this.#populate(users);
    }

    getByUsername(
        username: Username,
    ): Promise<Either<UserNotFound, User>> {
        const user = this.#users[username.value];
        if (!user) return Promise.resolve(left(new UserNotFound()));

        return Promise.resolve(right(user));
    }

    save(user: User): Promise<void> {
        this.#users[user.username.value] = user;
        return Promise.resolve(undefined)
    }

    #populate(users: User[]) {
        users.forEach((user) => {
            this.#users[user.username.value] = user;
        });
    }

}
