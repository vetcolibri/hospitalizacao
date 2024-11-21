import { AuthService } from "application/auth_service.ts";
import { AuthenticationFailed } from "domain/auth/authentication_failed_error.ts";
import { InvalidTokenError } from "domain/auth/invalid_token_error.ts";
import type {
    TokenGenerator,
} from "domain/auth/token_generator.ts";
import { User } from "domain/auth/user.ts";
import type { UserRepository } from "domain/auth/user_repository.ts";
import { InmemUserRepository } from "persistence/inmem/inmem_user_repository.ts";
import { TokenGeneratorStub } from "../stubs/token_generator_stub.ts";
import { assertInstanceOf, assertEquals, assertObjectMatch, spy, assertSpyCalls, assertSpyCall, assertSpyCallArg } from "dev_deps";

Deno.test("Auth Service - Login", async (t) => {
    await t.step("Deve efectuar o login do utilizador", async () => {
        const { service } = makeService();

        const output = await service.login("johndoe123", "123@Password");

        assertEquals(output.isRight(), true)
        assertObjectMatch(output.value, {
            token: "token",
            username: "johndoe123",
        });
    });

    await t.step("Deve retornar **AuthenticationFailed** quando o utilizador não for encontrado", async () => {
        const { service } = makeService();

        const err = await service.login("username", "");

        assertEquals(err.isLeft(), true)
        assertInstanceOf(err.value, AuthenticationFailed);
    });

    await t.step("Deve retornar **AuthenticationFailed** quanto a senha for inválida", async () => {
        const { service } = makeService();

        const err = await service.login("john.doe", "Password");

        assertEquals(err.isLeft(), true)
        assertInstanceOf(err.value, AuthenticationFailed);
    });

    await t.step("Deve criar o token de autênticação", async () => {
        const tokenGenerator = new TokenGeneratorStub();
        const { service } = makeService(tokenGenerator);

        const tokenSpy = spy(tokenGenerator, "generate");

        await service.login("johndoe123", "123@Password");

        assertSpyCalls(tokenSpy, 1)
        assertSpyCallArg(tokenSpy, 0, 0, "johndoe123")
    });

    await t.step("Deve retornar os dados do utilizador quando o login foi bem sucedido", async () => {
        const { service } = makeService();

        const output = await service.login("johndoe123", "123@Password");

        assertEquals(output.isRight(), true)
        assertObjectMatch(output.value, {
            username: "johndoe123",
            token: "token",
        });
    });
});

Deno.test("Auth Service - VerifyToken", async (t) => {
    await t.step("Deve verificar se o token é válido", async () => {
        const tokenGenerator = new TokenGeneratorStub();
        const tokenSpy = spy(tokenGenerator, "verify");
        const { service } = makeService(tokenGenerator);

        await service.verifyToken("token");

        assertSpyCall(tokenSpy, 0);
        assertSpyCalls(tokenSpy, 1);
        assertSpyCallArg(tokenSpy, 0, 0, "token");
    });

    await t.step("Deve retornar **InvalidToken** quando o token não for válido", async () => {
        const tokenGenerator: TokenGenerator = {
            generate: (_username: string) => Promise.resolve("token"),
            verify: (_token: string) => Promise.resolve({ username: "--empty--", isValid: false })
        }

        const { service } = makeService(tokenGenerator);

        const err = await service.verifyToken("invalid_token");

        assertEquals(err.isLeft(), true)
        assertInstanceOf(err.value, InvalidTokenError)
    });

    await t.step("Deve retornar o username com base no token a ser verificado", async () => {
        const tokenGenerator: TokenGenerator = {
            generate: (_username: string) => Promise.resolve("token"),
            verify: (_token: string) => Promise.resolve({ username: "john.doe", isValid: true }),
        }

        const { service } = makeService(tokenGenerator);

        const output = await service.verifyToken("token");

        assertEquals(output.isRight(), true)
        assertObjectMatch(output.value, {
            username: "john.doe",
            isValid: true,
        });
    });
});


function makeService(tokenGenerator?: TokenGenerator) {
    const user = new User("johndoe123", "123@Password");
    const userRepository: UserRepository = new InmemUserRepository();
    userRepository.save(user);

    const service = new AuthService(
        userRepository,
        tokenGenerator ?? new TokenGeneratorStub(),
    );

    return {
        service,
        userRepository,
    };
}
