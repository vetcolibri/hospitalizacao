export enum Type {
    Alert = "Alert",
    Buget = "Budget",
    Round = "Round",
    Report = "Report",
    Hospitalization = "Hospitalization",
}

export enum Mode {
    Write = "Write",
    Read = "Read",
}

export class Permission {
    readonly type: Type
    readonly mode: Mode

    constructor(type: Type, mode: Mode) {
        this.type = type
        this.mode = mode
    }

    hasWritePermission(type: Type): boolean {
        return this.hasPermission(type, Mode.Write)
    }

    hasPermission(type: Type, mode: Mode): boolean {
        return this.type === type && this.mode === mode
    }
}
