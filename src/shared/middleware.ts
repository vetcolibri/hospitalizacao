import { Context } from "@deps/oak";
import { ValidationError } from "@shared/validation_error.ts";

export interface HealthCheckResult {
	status: "healthy" | "unhealthy";
	checks: Record<string, { status: "ok" | "error"; message?: string }>;
	timestamp: string;
}

export function healthCheckHandler() {
	return async (ctx: Context) => {
		const checks: Record<string, { status: "ok" | "error"; message?: string }> = {};
		let overallStatus: "healthy" | "unhealthy" = "healthy";

		// Database check (placeholder)
		try {
			// TODO: Add actual database connection check
			checks.database = { status: "ok" };
		} catch (error) {
			checks.database = { status: "error", message: "Database connection failed" };
			overallStatus = "unhealthy";
		}

		// Memory check
		try {
			const memoryUsage = Deno.memoryUsage();
			const memoryUsageMB = memoryUsage.rss / 1024 / 1024;

			if (memoryUsageMB > 512) { // 512MB threshold
				checks.memory = { status: "error", message: `High memory usage: ${memoryUsageMB.toFixed(2)}MB` };
				overallStatus = "unhealthy";
			} else {
				checks.memory = { status: "ok", message: `Memory usage: ${memoryUsageMB.toFixed(2)}MB` };
			}
		} catch (error) {
			checks.memory = { status: "error", message: "Memory check failed" };
			overallStatus = "unhealthy";
		}

		const result: HealthCheckResult = {
			status: overallStatus,
			checks,
			timestamp: new Date().toISOString(),
		};

		ctx.response.status = overallStatus === "healthy" ? 200 : 503;
		ctx.response.headers.set("Content-Type", "application/json");
		ctx.response.body = result;
	};
}

export function corsMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		// Set CORS headers
		ctx.response.headers.set("Access-Control-Allow-Origin", "*");
		ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
		ctx.response.headers.set("Access-Control-Max-Age", "86400");

		// Handle preflight requests
		if (ctx.request.method === "OPTIONS") {
			ctx.response.status = 204;
			return;
		}

		await next();
	};
}

export function securityHeadersMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		// Add security headers
		ctx.response.headers.set("X-Content-Type-Options", "nosniff");
		ctx.response.headers.set("X-Frame-Options", "DENY");
		ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
		ctx.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		ctx.response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
		ctx.response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

		await next();
	};
}

export function requestLoggingMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		const start = Date.now();
		const requestId = crypto.randomUUID();

		console.log(`[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname} - Started`);

		ctx.state.requestId = requestId;

		try {
			await next();
		} catch (error) {
			console.error(`[${requestId}] Error:`, error);
			throw error;
		} finally {
			const duration = Date.now() - start;
			console.log(`[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} (${duration}ms)`);
		}
	};
}

export function errorHandlingMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		try {
			await next();
		} catch (error) {
			console.error("Unhandled error:", error);

			if (error instanceof ValidationError) {
				ctx.response.status = 400;
				ctx.response.body = {
					success: false,
					error: "Validation Error",
					details: error.message,
					fields: error.errors || []
				};
			} else if (error.name === "ForbiddenError") {
				ctx.response.status = 403;
				ctx.response.body = {
					success: false,
					error: "Forbidden",
					message: error.message || "Access denied"
				};
			} else if (error.name === "IOError") {
				ctx.response.status = 500;
				ctx.response.body = {
					success: false,
					error: "Internal Server Error",
					message: "A database or I/O error occurred"
				};
			} else {
				ctx.response.status = 500;
				ctx.response.body = {
					success: false,
					error: "Internal Server Error",
					message: "An unexpected error occurred"
				};
			}

			ctx.response.headers.set("Content-Type", "application/json");
		}
	};
}

export function requestSizeLimitMiddleware(maxSizeBytes: number = 1024 * 1024) { // 1MB default
	return async (ctx: Context, next: () => Promise<unknown>) => {
		const contentLength = ctx.request.headers.get("content-length");

		if (contentLength && parseInt(contentLength) > maxSizeBytes) {
			ctx.response.status = 413;
			ctx.response.headers.set("Content-Type", "application/json");
			ctx.response.body = {
				success: false,
				error: "Payload Too Large",
				message: `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`
			};
			return;
		}

		await next();
	};
}

export function rateLimitMiddleware(requestsPerMinute: number = 100) {
	const requestCounts = new Map<string, { count: number; resetTime: number }>();

	return async (ctx: Context, next: () => Promise<unknown>) => {
		const clientId = ctx.request.ip || "unknown";
		const now = Date.now();
		const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window

		const clientData = requestCounts.get(clientId);

		if (!clientData || clientData.resetTime !== windowStart) {
			requestCounts.set(clientId, { count: 1, resetTime: windowStart });
		} else {
			clientData.count++;

			if (clientData.count > requestsPerMinute) {
				ctx.response.status = 429;
				ctx.response.headers.set("Content-Type", "application/json");
				ctx.response.headers.set("Retry-After", "60");
				ctx.response.body = {
					success: false,
					error: "Too Many Requests",
					message: `Rate limit exceeded. Maximum ${requestsPerMinute} requests per minute allowed.`
				};
				return;
			}
		}

		// Clean up old entries
		if (Math.random() < 0.01) { // 1% chance to clean up
			for (const [key, value] of requestCounts.entries()) {
				if (value.resetTime < windowStart - 60000) {
					requestCounts.delete(key);
				}
			}
		}

		await next();
	};
}

export function validateJsonMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		if (ctx.request.hasBody &&
			(ctx.request.method === "POST" || ctx.request.method === "PUT") &&
			ctx.request.headers.get("content-type")?.includes("application/json")) {

			try {
				// Pre-validate JSON format
				const body = await ctx.request.body.text();
				JSON.parse(body);

				// Re-create the body for the next middleware
				ctx.request.body = () => ({
					json: async () => JSON.parse(body),
					text: async () => body
				});
			} catch (error) {
				ctx.response.status = 400;
				ctx.response.headers.set("Content-Type", "application/json");
				ctx.response.body = {
					success: false,
					error: "Invalid JSON",
					message: "Request body contains invalid JSON"
				};
				return;
			}
		}

		await next();
	};
}

export function notFoundMiddleware() {
	return async (ctx: Context) => {
		ctx.response.status = 404;
		ctx.response.headers.set("Content-Type", "application/json");
		ctx.response.body = {
			success: false,
			error: "Not Found",
			message: `Route ${ctx.request.method} ${ctx.request.url.pathname} not found`
		};
	};
}
