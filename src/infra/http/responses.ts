import { Context, ResponseBody, Status } from "deps";

export function sendResponse(
	ctx: Context,
	status: Status,
	body?: ResponseBody,
) {
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
	sendResponse(ctx, Status.NotFound, { message: body });
}

export function sendServerError(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.InternalServerError, { message: body });
}

export function sendOk(ctx: Context, body?: ResponseBody) {
	sendResponse(ctx, Status.OK, body);
}
