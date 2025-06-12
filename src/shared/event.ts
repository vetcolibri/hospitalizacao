import { IdValue } from "@shared/id_value.ts";

export type EventHeader =
	| "EventId"
	| "EventName"
	| "IssuedAt"
	| "AggregateType"
	| "AggregateId"
	| "CommandId"
	| string;

export class EventNotFoundError extends Error {
	constructor() {
		super("event not found");
	}
}

type EventOption<T> = (e: Event<T>) => Event<T>;
type EventHeaderEntry = [string, string];

/**
 * Classe que representa um Event.
 */
export class Event<T> {
	readonly headers: Record<EventHeader, string>;
	readonly payload: T;

	constructor(headers: Record<EventHeader, string>, payload: T) {
		this.headers = headers;
		this.payload = payload;
	}

	/**
	 * Cria um novo Event com o nome especificado e aplica as opções passadas.
	 */
	static create<T>(name: string, ...opts: EventOption<T>[]): Event<T> {
		const id = IdValue.random().value;
		const headers: Record<EventHeader, string> = {};
		headers["EventName"] = name;
		headers["EventId"] = id;
		headers["Issued"] = new Date().toISOString();

		let event = new Event(headers, undefined as T);
		opts.forEach((opt) => {
			event = opt(event);
		});
		return event;
	}

	/**
	 * Retorna o ID do evento.
	 */
	id(): string {
		return this.headers["EventId"];
	}

	/**
	 * Retorna o nome do evento.
	 */
	name(): string {
		return this.headers["EventName"];
	}

	/**
	 * Retorna a data/hora de emissão do evento.
	 */
	issuedAt(): string {
		return this.headers["IssuedAt"];
	}

	/**
	 * Retorna o valor de um cabeçalho específico.
	 */
	header(key: string): string | undefined {
		return this.headers[key];
	}

	/**
	 * Retorna o payload do evento.
	 */
	getPayload(): T {
		return this.payload;
	}
}

/**
 * Retorna uma Option que define o payload do evento.
 */
export function withPayload<T>(payload: T): EventOption<T> {
	return (e: Event<T>): Event<T> => {
		return new Event(e.headers, payload);
	};
}

/**
 * Retorna uma Option que adiciona ou sobrescreve um cabeçalho.
 */
export function withHeader<T>(key: string, value: string): EventOption<T> {
	return (e: Event<T>): Event<T> => {
		e.headers[key] = value;
		return e;
	};
}

/**
 * Retorna uma Option que adiciona vários cabeçalhos.
 */
export function withHeaders<T>(...headers: EventHeaderEntry[]): EventOption<T> {
	return (e: Event<T>): Event<T> => {
		headers.forEach(([k, v]) => {
			e.headers[k] = v;
		});
		return e;
	};
}

/**
 * Retorna uma Option que aplica diversas outras opções.
 */
export function withOptions<T>(...opts: EventOption<T>[]): EventOption<T> {
	return (e: Event<T>): Event<T> => {
		opts.forEach((opt) => {
			e = opt(e);
		});
		return e;
	};
}

/**
 * Cria uma cópia (clone) de um evento existente.
 * Note que o novo evento terá um novo ID e IssuedAt, mas os demais
 * cabeçalhos e o payload são preservados.
 */
export function clone<T>(e: Event<T>): Event<T> {
	const entries: EventHeaderEntry[] = Object.entries(e.headers) as EventHeaderEntry[];
	return Event.create(
		e.name(),
		withHeaders(...entries),
		withPayload(e.getPayload()),
	);
}

/**
 * Aplica opções adicionais a um evento existente, retornando um novo evento "decorado".
 * O evento decorado terá os cabeçalhos básicos (nome, id e issuedAt) reinicializados.
 */
export function decorate<T>(e: Event<T>, ...opts: EventOption<T>[]): Event<T> {
	const empty = Event.create<T>(e.name());
	let cloned = clone(e);

	// Copia os cabeçalhos padrão do evento "vazio" para o clonado
	Object.entries(empty.headers).forEach(([key, value]) => {
		cloned.headers[key as EventHeader] = value;
	});

	// Aplica as opções adicionais
	opts.forEach((opt) => {
		cloned = opt(cloned);
	});

	return cloned;
}
