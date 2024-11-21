import { AuthenticationFailed } from "domain/auth/authentication_failed_error.ts";
import { InvalidTokenError } from "domain/auth/invalid_token_error.ts";
import type {
    TokenGenerator,
    VerifyToken,
} from "domain/auth/token_generator.ts";
import { PasswordAuthenticator } from "domain/auth/password_authenticator.ts"
import type { UserRepository } from "domain/auth/user_repository.ts";
import { Username } from "domain/auth/username.ts";
import { type Either, left, right } from "shared/either.ts";


export class AuthService {
    #userRepository: UserRepository;
    #tokenGenerator: TokenGenerator;

    constructor(
        userRepository: UserRepository,
        tokenGenerator: TokenGenerator,
    ) {
        this.#userRepository = userRepository;
        this.#tokenGenerator = tokenGenerator;
    }

    async login(
        username: string,
        password: string,
    ): Promise<Either<AuthenticationFailed, UserDTO>> {
        const userOrErr = await this.#userRepository.getByUsername(
            Username.fromString(username),
        );
        if (userOrErr.isLeft()) return left(new AuthenticationFailed());

        const authenticator = new PasswordAuthenticator()

        const isValid = authenticator.authenticate(userOrErr.value, password);

        if (!isValid) return left(new AuthenticationFailed());

        const token = await this.#tokenGenerator.generate(username);

        return right({ username, token });
    }

    async verifyToken(
        token: string,
    ): Promise<Either<InvalidTokenError, VerifyToken>> {
        const result = await this.#tokenGenerator.verify(token);

        if (!result.isValid) return left(new InvalidTokenError());

        return right(result);
    }
}

export type UserDTO = {
    username: string;
    token: string;
};
