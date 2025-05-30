import { Event } from "@shared/event.ts";

/**
 * Interface que define um manipulador de eventos.
 */
export interface EventHandler<T> {
	/**
	 * Método chamado para processar o evento.
	 */
	handle(event: Event<T>): void;
}

/**
 * Função auxiliar para transformar uma função em um Handler.
 */
export function wrapEventHandler<T>(fn: (event: Event<T>) => void): EventHandler<T> {
	return {
		handle: fn,
	};
}

/**
 * Tipo para um Middleware: uma função que recebe um Handler e retorna um novo Handler.
 */
export type EventMiddleware<T> = (handler: EventHandler<T>) => EventHandler<T>;

/**
 * Aplica uma cadeia de middlewares ao handler `s`, retornando o Handler final.
 * Os middlewares são aplicados na ordem inversa, de forma que o primeiro
 * middleware passado seja o primeiro a processar o evento.
 *
 * @param s - Handler base.
 * @param middlewares - Lista de middlewares a serem aplicados.
 * @returns Handler decorado com os middlewares.
 */
export function chain<T>(
	s: EventHandler<T>,
	...middlewares: EventMiddleware<T>[]
): EventHandler<T> {
	for (let i = middlewares.length - 1; i >= 0; i--) {
		s = middlewares[i](s);
	}
	return s;
}
