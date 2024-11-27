import { Password } from "domain/auth/password.ts";
import { Username } from "domain/auth/username.ts";
import { Permission, Type } from "domain/auth/permission.ts";
import { PermissionFactory } from "domain/auth/permissions_factory.ts";

export enum Role {
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
	readonly role: Role;
	readonly permissions: Permission[];

	constructor(username: string, password: string, role: string) {
		this.username = Username.fromString(username);
		this.#password = Password.fromString(password);
		this.isAdmin = true;
		this.isMedVet = false;
		this.role = Role.Admin;
		this.permissions = [];

		if (role === Role.MedVet) {
			this.role = Role.MedVet;
			this.isAdmin = false;
			this.isMedVet = true;
			return;
		}

		if (role === Role.VetAssistent) {
			this.isAdmin = false;
			this.role = Role.VetAssistent;
		}

		if (role === Role.Reception) {
			this.isAdmin = false;
			this.role = Role.Reception;
		}

		if (role === Role.Trainee) {
			this.isAdmin = false;
			this.role = Role.Trainee;
		}

		const factory = PermissionFactory.create(this.role);
		this.permissions = factory.getPermissions();
	}

	checkPassword(password: string): boolean {
		return this.#password.isValid(password);
	}

	hasHospitalizationWritePermission(): boolean {
		if (this.#isAdminOrMedVet()) return true;

		if (this.#isEmptyPermissions()) return false;

		for (const per of this.permissions) {
			if (per.hasWritePermission(Type.Hospitalization)) {
				return true;
			}
		}

		return false;
	}

	hasAlertWritePermission(): boolean {
		if (this.#isAdminOrMedVet()) return true;

		if (this.#isEmptyPermissions()) return false;

		for (const per of this.permissions) {
			if (per.hasWritePermission(Type.Alert)) {
				return true;
			}
		}

		return false;
	}

	hasBudgetWritePermission(): boolean {
		if (this.#isAdminOrMedVet()) return true;

		if (this.#isEmptyPermissions()) return false;

		for (const per of this.permissions) {
			if (per.hasWritePermission(Type.Buget)) {
				return true;
			}
		}

		return false;
	}

	hasRoundWritePermission(): boolean {
		return this.#isAdminOrMedVet();
	}

	hasReportWritePermission(): boolean {
		return this.#isAdminOrMedVet();
	}

	#isAdminOrMedVet(): boolean {
		return this.isAdmin === true || this.isMedVet === true;
	}

	#isEmptyPermissions(): boolean {
		return this.permissions.length === 0;
	}

	get password(): Password {
		return this.#password;
	}
}
