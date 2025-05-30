import { Role, User } from "@domain/auth/user.ts";

export const ADMIN_USERS = [
	new User("user_1", "user_1_password", Role.Admin),
	new User("user_2", "user_2_password", Role.Admin),
];

export const RECEPCIONIST_USERS = [
	new User("user_3", "user_3_password", Role.Reception),
	new User("user_4", "user_4_password", Role.Reception),
];

export const VET_USERS = [
	new User("user_5", "user_5_password", Role.MedVet),
	new User("user_6", "user_6_password", Role.MedVet),
];

export const USERS = [
	...ADMIN_USERS,
	...RECEPCIONIST_USERS,
	...VET_USERS,
];
