import { Password } from "domain/auth/password.ts";
import { Username } from "domain/auth/username.ts";
import { Mode, Permission, Type } from "domain/auth/permission.ts";
import { PermissionFactory } from "domain/auth/permissions_factory.ts";

export enum Level {
	Admin = "Admin",
	MedVet = "Médico Veterinário",
	VetAssistent = "Médico Auxiliar",
	Reception = "Recepção",
	Trainee = "Estagiário",
}

export class User {
	readonly username: Username;
	readonly #password: Password;
	readonly isAdmin: boolean;
	readonly isMedVet: boolean;
	readonly level: Level;
	readonly permissions: Permission[];

	constructor(username: string, password: string, level: string) {
		this.username = Username.fromString(username);
		this.#password = Password.fromString(password);
		this.isAdmin = true;
		this.isMedVet = false;
		this.level = Level.Admin;
		this.permissions = [];

		if (level === Level.MedVet) {
			this.level = Level.MedVet;
			this.isAdmin = false;
			this.isMedVet = true;
			return;
		}

		if (level === Level.VetAssistent) {
			this.isAdmin = false;
			this.level = Level.VetAssistent;
		}

		if (level === Level.Reception) {
			this.isAdmin = false;
			this.level = Level.Reception;
		}

		if (level === Level.Trainee) {
			this.isAdmin = false;
			this.level = Level.Trainee;
		}

		const factory = PermissionFactory.create(this.level);
		this.permissions = factory.getPermissions();
	}

	checkPassword(password: string): boolean {
		return this.#password.isValid(password);
	}

	hasAlertWritePermission(): boolean {
	    if (this.isAdmin) return true

		if (this.isMedVet) return true

		for (const per of this.permissions) {
		    if (per.hasPermission(Type.Alert, Mode.Write)) {
				return true
			}
		}

		return false
	}

	get password(): Password {
		return this.#password;
	}
}
