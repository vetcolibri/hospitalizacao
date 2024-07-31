export class Discharge {
    readonly types: string[];
    readonly aspects: string[];

    constructor(types: string[], aspects: string[]) {
        this.types = types;
        this.aspects = aspects;
    }
}
