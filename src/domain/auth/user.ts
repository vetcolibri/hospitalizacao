import { Password } from "domain/auth/password.ts";
import { Username } from "domain/auth/username.ts";

export class User {
    readonly username: Username;
    readonly #password: Password;

    constructor(username: string, password: string) {
        this.username = Username.fromString(username);
        this.#password = Password.fromString(password);
    }


    checkPassword(password: string): boolean {
        return this.#password.isValid(password);
    }

    get password(): Password {
        return this.#password;
    }
}
