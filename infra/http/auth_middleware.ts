import { Context } from "deps";
import { AuthService } from "application/auth_service.ts";
import { sendUnauthorized } from "infra/http/responses.ts";
import { VerifyToken } from "domain/auth/token_generator.ts";


const EXEMPT_URLS = [
    "/auth/login",
    "/alerts/notifications",
    "/owners/reports",
]


export const authMiddleware = (service: AuthService) => {
    return async (ctx: Context, next: CallableFunction) => {
        if (EXEMPT_URLS.includes(ctx.request.url.pathname)) {
            await next()
            return
        }

        const token = ctx.request.headers.get("X-Access-Token")

        if (!token) {
            sendUnauthorized(ctx)
            return
        }

        try {
            const userOrErr = await service.verifyToken(token)
            const user = <VerifyToken>userOrErr.value
            ctx.state.username = user.username
            await next()
        } catch (error) {
            console.error(error)
            sendUnauthorized(ctx)
        }
    }
}
