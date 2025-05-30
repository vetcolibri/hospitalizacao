import { UserRole } from "@shared/user_role.ts";

export interface Context {
	principal: string;
	roles: UserRole[];
}
