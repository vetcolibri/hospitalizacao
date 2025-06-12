export class IOError extends Error {
	root: Error | undefined;

	constructor(cause: string, message: string, root?: Error) {
		super(message);
		this.name = "IOError";
		this.cause = cause;
		this.root = root;
	}
}
