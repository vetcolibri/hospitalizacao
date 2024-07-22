export class Food {
    readonly type: string[];
    readonly level: string;
    readonly date: Date;

    constructor(type: string[], level: string, date: string) {
        this.type = [...type];
        this.level = level;
        this.date = new Date(date);
    }
}
