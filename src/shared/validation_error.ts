export class ValidationError extends Error {
	public field: string;
	public errors: string[];

	constructor(fieldName: string, errorMessages: string[]) {
		// Set a general message; specific messages are in the 'errors' array.
		super(`Validation failed for field: ${fieldName}.`);
		this.name = "ValidationError";
		this.field = fieldName;
		this.errors = errorMessages;

		// Ensure the prototype chain is correctly set for instanceof checks
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}
