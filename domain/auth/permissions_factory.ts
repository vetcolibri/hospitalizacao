import { Role } from "domain/auth/user.ts";
import { Permission, Mode, Type } from "domain/auth/permission.ts";

interface PermissionCreator {
	getPermissions(): Permission[];
}

export class VetAssistentPermission implements PermissionCreator {
	getPermissions(): Permission[] {
		return [
			new Permission(Type.Alert, Mode.Write),
			new Permission(Type.Hospitalization, Mode.Write),
		];
	}
}

export class ReceptionPermission implements PermissionCreator {
	getPermissions(): Permission[] {
		return [
			new Permission(Type.Hospitalization, Mode.Write),
			new Permission(Type.Buget, Mode.Write),
		];
	}
}

export class PermissionFactory {

	static create(role: Role): PermissionCreator {
		if (role === Role.VetAssistent) {
			return new VetAssistentPermission();
		}

		if (role === Role.Reception) {
		    return new ReceptionPermission();
		}

		return { getPermissions: () => [] }
	}
}
