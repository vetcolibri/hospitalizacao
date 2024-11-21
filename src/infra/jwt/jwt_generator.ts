import { TokenGenerator, VerifyToken } from "domain/auth/token_generator.ts";
import { jose } from "deps";

export class JwtTokenGenerator implements TokenGenerator {
	constructor(private secretKey: string) {}

	async generate(username: string): Promise<string> {
		const secret = this.getSecret();

		const jwt = await new jose.SignJWT({ username: username })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setIssuer("urn:hospitalizacao")
			.setExpirationTime("4h")
			.sign(secret);

		return jwt;
	}

	async verify(token: string): Promise<VerifyToken> {
		const secret = this.getSecret();
		const { payload } = await jose.jwtVerify(token, secret, { issuer: "urn:hospitalizacao" });
		return { isValid: true, username: payload.username as string };
	}

	getSecret() {
		return new TextEncoder().encode(this.secretKey);
	}
}
