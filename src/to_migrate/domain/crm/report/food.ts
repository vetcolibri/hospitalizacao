export class Food {
    readonly types: string[];
    readonly level: string;
    readonly datetime: Date;

    constructor(types: string[], level: string, date: string) {
        this.types = [...types];
        this.level = level;
        this.datetime = new Date(date);
    }
}
