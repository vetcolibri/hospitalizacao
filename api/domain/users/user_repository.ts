import { User } from "./user.ts";

export interface UserRepository {
	get(userId: string): Promise<User>;
}
