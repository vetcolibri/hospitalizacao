import { IdRepository } from "../../domain/id_generator.ts";

export class InmemIdRepository implements IdRepository {
	#generatedIds: Record<string, number> = {};
	private readonly startId = 1;

	async generate(name: string, ownerName: string): Promise<string> {
		if (this.records.length === 0) {
			const formatedId = this.formatId(this.startId, name, ownerName);
			this.#generatedIds[formatedId] = this.startId;
			return Promise.resolve(formatedId);
		}
		const nextId = await this.lastId() + 1;
		const formatedId = this.formatId(nextId, name, ownerName);
		this.#generatedIds[formatedId] = nextId;
		return Promise.resolve(formatedId);
	}

	lastId(): Promise<number> {
		return Promise.resolve(this.records[this.records.length - 1]);
	}

	newId(): Promise<string> {
		const keys = Object.keys(this.#generatedIds);
		return Promise.resolve(keys[keys.length - 1]);
	}

	private formatId(id: number, name: string, ownerName: string): string {
		return `${id.toString().padStart(4, "0")}-${name.toLowerCase()}-${ownerName.toLowerCase()}`;
	}

	get records() {
		return Object.values(this.#generatedIds);
	}
}
