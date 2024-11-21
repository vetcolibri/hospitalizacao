export class Username {
    #value: string;

    private constructor(value: string) {
        this.#value = value;
    }

    static fromString(value: string): Username {
        return new Username(value);
    }

    static isValid(value: string): boolean {
        const regex = /^[A-Za-z]{1}[A-Za-z0-9]{7,}$/;
        return regex.test(value);
    }

    get value(): string {
        return this.#value;
    }
}
