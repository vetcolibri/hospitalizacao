import crypto from "node:crypto";

export class Password {
    readonly #value: string;
    readonly #salt: string;

    private constructor(value: string, salt: string) {
        this.#value = value;
        this.#salt = salt;
    }

    static fromString(value: string): Password {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.pbkdf2Sync(value, salt, 1000, 64, "sha512")
            .toString("hex");
        return new Password(hash, salt);
    }

    isValid(rawPassword: string): boolean {
        const hash = crypto.pbkdf2Sync(
            rawPassword,
            this.#salt,
            1000,
            64,
            "sha512",
        ).toString("hex");
        return this.#value === hash;
    }

    get value(): string {
        return this.#value;
    }

    get salt(): string {
        return this.#salt;
    }
}
