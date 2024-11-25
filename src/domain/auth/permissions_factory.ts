import { Level } from "domain/auth/user.ts";
import { Permission, Mode, Type } from "domain/auth/permission.ts";

interface PermissionCreator {
	getPermissions(): Permission[];
}

export class VetAssistentPermission implements PermissionCreator {
	getPermissions(): Permission[] {
		return [
			new Permission(Type.Alert, Mode.Read),
			new Permission(Type.Alert, Mode.Write),
			new Permission(Type.Hospitalization, Mode.Read),
			new Permission(Type.Hospitalization, Mode.Write),
			new Permission(Type.Buget, Mode.Read),
			new Permission(Type.Report, Mode.Read),
			new Permission(Type.Round, Mode.Read),
		];
	}
}

export class ReceptionPermission implements PermissionCreator {
	getPermissions(): Permission[] {
		return [
			new Permission(Type.Alert, Mode.Read),
			new Permission(Type.Report, Mode.Read),
			new Permission(Type.Round, Mode.Read),
			new Permission(Type.Hospitalization, Mode.Read),
			new Permission(Type.Hospitalization, Mode.Write),
			new Permission(Type.Buget, Mode.Read),
			new Permission(Type.Buget, Mode.Write),
		];
	}
}

export class PermissionFactory {
	private constructor() {}

	static create(level: Level): PermissionCreator {
		if (level === Level.VetAssistent) {
			return new VetAssistentPermission();
		}

		if (level === Level.Reception) {
		    return new ReceptionPermission();
		}

		return { getPermissions: () => [] }
	}
}
