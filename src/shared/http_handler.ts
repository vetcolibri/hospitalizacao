import { Context } from "@shared/context.ts";
import { ValidationError } from "@shared/validation_error.ts";

export type HttpHandler = (req: Request) => Promise<Response>;

export const getRequestContext = async (_req: Request): Promise<Context> => {
	return {} as unknown as Context;
};

export const processApplicationErrors = (errs: Error | Error[]): Response => {
	if (errs instanceof ValidationError) {
		return new Response(JSON.stringify(errs), { status: 400 });
	}

	if (Array.isArray(errs) && errs[0] instanceof ValidationError) {
		return new Response(JSON.stringify(errs), { status: 400 });
	}

	return new Response(JSON.stringify(errs), { status: 500 });
};
