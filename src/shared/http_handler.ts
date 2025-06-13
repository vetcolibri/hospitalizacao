import { Context } from "@shared/context.ts";
import { ValidationError } from "@shared/validation_error.ts";
import { ForbiddenError } from "@shared/forbidden_error.ts";
import { IOError } from "@shared/io_error.ts";

export type HttpHandler = (req: Request) => Promise<Response>;

export const getRequestContext = async (req: Request): Promise<Context> => {
	// TODO: Implement proper authentication and context extraction
	// For now, return a basic context with admin role for development
	const authHeader = req.headers.get("Authorization");

	// Extract principal from Authorization header (Bearer token, etc.)
	// This is a placeholder implementation
	const principal = authHeader ? "authenticated-user" : "anonymous";

	return {
		principal,
		roles: ["ADMIN"], // TODO: Extract roles from token or session
	};
};

export const processApplicationErrors = (errs: Error | Error[]): Response => {
	const headers = { "Content-Type": "application/json" };

	if (errs instanceof ValidationError) {
		return new Response(
			JSON.stringify({
				error: "Validation Error",
				details: errs.message,
				fields: errs.errors || [],
			}),
			{
				status: 400,
				headers,
			},
		);
	}

	if (Array.isArray(errs) && errs.length > 0 && errs[0] instanceof ValidationError) {
		return new Response(
			JSON.stringify({
				error: "Validation Errors",
				details: errs.map((err) => ({
					field: err.field || "unknown",
					message: err.message,
					errors: err.errors || [],
				})),
			}),
			{
				status: 400,
				headers,
			},
		);
	}

	if (errs instanceof ForbiddenError) {
		return new Response(
			JSON.stringify({
				error: "Forbidden",
				message: errs.message || "Access denied",
			}),
			{
				status: 403,
				headers,
			},
		);
	}

	if (errs instanceof IOError) {
		return new Response(
			JSON.stringify({
				error: "Internal Server Error",
				message: "A database or I/O error occurred",
			}),
			{
				status: 500,
				headers,
			},
		);
	}

	// Handle generic errors
	const errorMessage = errs instanceof Error ? errs.message : "Unknown error occurred";
	return new Response(
		JSON.stringify({
			error: "Internal Server Error",
			message: errorMessage,
		}),
		{
			status: 500,
			headers,
		},
	);
};

export const createStandardResponse = (
	data: any,
	status: number = 200,
	message?: string,
): Response => {
	const body = {
		success: status < 400,
		...(message && { message }),
		...(data && { data }),
	};

	return new Response(
		JSON.stringify(body),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);
};

export const createErrorResponse = (
	error: string,
	status: number = 400,
	details?: any,
): Response => {
	const body = {
		success: false,
		error,
		...(details && { details }),
	};

	return new Response(
		JSON.stringify(body),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);
};
