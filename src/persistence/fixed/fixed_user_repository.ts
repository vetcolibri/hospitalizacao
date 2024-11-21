import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import _userData from "persistence/fixed/fixed_users.json" with { type: 'json'}
import { User } from "domain/auth/user.ts";

export class FixedUserRepository extends InmemUserRepository {
    constructor() {
        super(_userData.map((d) => new User(d.username, d.password)))
    }
}
