import { Context } from "deps";

export type ContextWithParams = Context & { params: Record<string, string> };
