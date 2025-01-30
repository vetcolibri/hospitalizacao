import { Context } from "deps";

export const logger = async (ctx: Context, next: CallableFunction) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.request.method} - ${ctx.request.url} - ${ms}ms`);
};
