import { AuthService } from "application/auth_service.ts";
import { Context, Router } from "deps";
import { sendOk, sendServerError, sendUnauthorized } from "infra/http/responses.ts";
import { validate } from "shared/tools.ts";
import { loginSchema, validateTokenSchema } from "infra/http/schemas/user_schema.ts";

export default function(service: AuthService) {
    const loginHandler = async (ctx: Context) => {
        const { username, password } = ctx.state.validatedData;

        try {

            const userOrErr = await service.login(username, password)

            if (userOrErr.isLeft()) {
                sendUnauthorized(ctx)
                return
            }

            sendOk(ctx, userOrErr.value)

        } catch(error) {
            sendServerError(ctx, error);
        }
    }

    const verifyTokenHandler = async (ctx: Context) => {
        const { token } = ctx.state.validatedData;

        try {
            const userOrErr = await service.verifyToken(token)

            if (userOrErr.isLeft()) {
                sendUnauthorized(ctx)
                return
            }

            sendOk(ctx, userOrErr.value)

        } catch (error) {
            sendServerError(ctx, error)
        }
    }

    const router = new Router({ prefix: "/auth" });
    router.post("/login",  validate(loginSchema), loginHandler)
    router.post("/verify-token",  validate(validateTokenSchema), verifyTokenHandler)
    return router
}
