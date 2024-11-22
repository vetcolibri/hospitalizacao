import { Context } from "deps";
import { AuthService } from "application/auth_service.ts";
import { sendUnauthorized } from "infra/http/responses.ts";
import { VerifyToken } from "domain/auth/token_generator.ts";


export const authMiddleware = (service: AuthService) => {
    return async (ctx: Context, next: CallableFunction) => {
        if (ctx.request.url.pathname === "/auth/login") {
            await next()
            return
        }

        if (ctx.request.url.pathname === "/alerts/notifications") {
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
