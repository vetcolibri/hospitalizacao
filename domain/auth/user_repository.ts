import type { Either } from "shared/either.ts";
import type { User } from "./user.ts";
import type { UserNotFound } from "./user_not_found.ts";
import type { Username } from "./username.ts";

export interface UserRepository {
    getByUsername(username: Username): Promise<Either<UserNotFound, User>>;
    save(user: User): Promise<void>;
}
