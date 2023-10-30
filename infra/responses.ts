import { Context, ResponseBody, Status } from "../deps.ts";

export function sendResponse(ctx: Context, status: Status, body?: ResponseBody) {
	ctx.response.status = status;
	if (body) {
		ctx.response.body = body;
		ctx.response.type = "json";
	}
}

export function sendBadRequest(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.BadRequest, { message: body });
}

export function sendCreated(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.Created, body);
}

export function sendNotFound(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.NotFound, body);
}

export function sendOk(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.OK, body);
}
