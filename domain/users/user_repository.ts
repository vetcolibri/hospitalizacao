import { ID } from "../id.ts";
import { User } from "./user.ts";

export interface UserRepository {
	get(userId: ID): Promise<User>;
}
