export class ValidationError extends Error {
	constructor(cause: string, message: string[]) {
		super(message.join("\n"));
		this.name = "ValidationError";
		this.cause = cause;
	}
}
