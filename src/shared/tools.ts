import { Context, Next, z } from "deps";
import { sendBadRequest } from "infra/http/responses.ts";

export function makeTodayFormat() {
  const date = new Date();
  const yearFormat = new Intl.DateTimeFormat("pt-PT", {
    year: "numeric",
  }).format(date);
  const monthFormat = new Intl.DateTimeFormat("pt-PT", {
    month: "long",
  }).format(date);
  const dayFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit" }).format(
    date
  );
  const hour = new Intl.DateTimeFormat("pt-PT", { timeStyle: "medium" }).format(
    date
  );
  return `${
    monthFormat.charAt(0).toUpperCase() + monthFormat.slice(1)
  } ${dayFormat}, ${yearFormat} - ${hour}`;
}

export function validate(schema: z.ZodTypeAny) {
  return async (ctx: Context, next: Next) => {
    try {
      const requestBody = await ctx.request.body().value;
      const validatedData = schema.parse(requestBody);
      ctx.state.validatedData = validatedData;
      await next();
    } catch (error) {
      sendBadRequest(ctx, error.message);
    }
  };
}
