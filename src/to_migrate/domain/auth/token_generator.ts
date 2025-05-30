export type VerifyToken = {
    username: string;
    isValid: boolean;
};

export interface TokenGenerator {
    generate(username: string): Promise<string>;
    verify(token: string): Promise<VerifyToken>;
}
