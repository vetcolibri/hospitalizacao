import type { Authenticator } from "./authenticator.ts";
import type { User } from "./user.ts";


export class PasswordAuthenticator implements Authenticator {
    authenticate(user: User, password: string): boolean {
        return user.checkPassword(password);
    }
}
