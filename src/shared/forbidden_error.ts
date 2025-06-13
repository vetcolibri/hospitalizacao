export class ForbiddenError extends Error {
	constructor(cause: string) {
		super(`Forbidden: ${cause}`);
		this.name = "ForbiddenError";
		this.cause = cause;
	}
}
