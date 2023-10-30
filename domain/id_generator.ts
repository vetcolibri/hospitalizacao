export interface IdRepository {
	generate(name: string, ownerName: string): Promise<string>;
	lastId(): Promise<number>;
	newId(): Promise<string>;
}
