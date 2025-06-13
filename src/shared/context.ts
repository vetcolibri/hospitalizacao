import { UserRoleEnum } from "./user_role_enum.ts";

export interface Context {
	principal: string;
	roles: UserRoleEnum[];
}
