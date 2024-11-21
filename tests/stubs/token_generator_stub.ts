import type { TokenGenerator, VerifyToken } from "domain/auth/token_generator.ts";

export class TokenGeneratorStub implements TokenGenerator {
    generate(_username: string): Promise<string> {
        return Promise.resolve("token");
    }

    verify(_token: string): Promise<VerifyToken> {
        return Promise.resolve({ username: "john.doe", isValid: true });
    }
}
