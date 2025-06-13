import { HttpHandler } from "@shared/http_handler.ts";
import { Context } from "@deps/oak";

export function adaptOakRequest(handler: HttpHandler): (ctx: Context) => Promise<void> {
	return async (ctx: Context) => {
		try {
			// Add CORS headers
			ctx.response.headers.set("Access-Control-Allow-Origin", "*");
			ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
			ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

			// Add security headers
			ctx.response.headers.set("X-Content-Type-Options", "nosniff");
			ctx.response.headers.set("X-Frame-Options", "DENY");
			ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
			ctx.response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

			// Handle preflight requests
			if (ctx.request.method === "OPTIONS") {
				ctx.response.status = 204;
				return;
			}

			const init: RequestInit = {
				headers: ctx.request.headers,
				method: ctx.request.method,
			};

			// Add body for POST/PUT requests
			if (ctx.request.method === "POST" || ctx.request.method === "PUT") {
				if (ctx.request.hasBody) {
					init.body = await ctx.request.body.text();
				}
			}

			const req = new Request(ctx.request.url, init);
			const res = await handler(req);

			ctx.response.status = res.status;

			// Copy all headers from response
			for (const [key, value] of res.headers.entries()) {
				ctx.response.headers.set(key, value);
			}

			// Set response body
			if (res.body) {
				ctx.response.body = await res.text();
			}

			// Ensure JSON content type is set
			if (!ctx.response.headers.get("Content-Type")) {
				ctx.response.headers.set("Content-Type", "application/json");
			}
		} catch (error) {
			console.error("Error in adaptOakRequest:", error);
			ctx.response.status = 500;
			ctx.response.headers.set("Content-Type", "application/json");
			ctx.response.body = JSON.stringify({
				error: "Internal Server Error",
				message: "An unexpected error occurred",
			});
		}
	};
}

export function corsMiddleware() {
	return async (ctx: Context, next: () => Promise<unknown>) => {
		// Set CORS headers
		ctx.response.headers.set("Access-Control-Allow-Origin", "*");
		ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
		ctx.response.headers.set("Content-Security-Policy", "default-src 'self'");

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
			console.log(
				`[${requestId}] ${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} (${duration}ms)`,
			);
		}
	};
}
