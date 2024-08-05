export class Discharge {
    readonly type: string;
    readonly aspects: string[];

    constructor(type: string, aspects: string[]) {
        this.type = type;
        this.aspects = aspects;
    }
}
