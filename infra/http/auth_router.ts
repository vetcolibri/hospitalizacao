import { AuthService } from "application/auth_service.ts";
import { Context, Router } from "deps";
import { sendOk, sendServerError, sendUnauthorized } from "infra/http/responses.ts";
import { validate } from "shared/tools.ts";
import { loginSchema } from "infra/http/schemas/user_schema.ts";

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

    const router = new Router({ prefix: "/auth" });
    router.post("/login",  validate(loginSchema), loginHandler)
    return router
}
