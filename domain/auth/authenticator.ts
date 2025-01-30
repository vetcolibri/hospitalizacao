import type { User } from "./user.ts";

export interface Authenticator {
    authenticate(user: User, password: string): boolean;
}
