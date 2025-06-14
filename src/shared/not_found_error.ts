export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}
