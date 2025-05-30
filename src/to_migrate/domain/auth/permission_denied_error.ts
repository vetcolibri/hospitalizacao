export class PermissionDenied extends Error {
    constructor(message?: string) {
        super(message ? message : "Permission denied");
    }
}
