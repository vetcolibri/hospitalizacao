// Supondo que a classe Event já esteja definida em outro módulo.
// import { Event } from "./event";
import { Event } from "@shared/event.ts";
import { EventHandler } from "@shared/event_handler.ts";

export const WILDCARD_EVENT_NAME = "*";

/**
 * Interface do barramento de eventos (Event Bus).
 */
export interface EventBus {
	publish<T>(event: Event<T>): void;
	publishAll(...events: Event<unknown>[]): void;
	subscribe<T>(eventName: string, subscriber: EventHandler<T>): void;
}

/**
 * Implementação em memória do barramento de eventos.
 */
export class InMemEventBus implements EventBus {
	// Mapeia o nome do evento para uma lista de assinantes.
	private subscribers: Record<string, EventHandler<unknown>[]> = {};
	// Fila de eventos a serem processados.
	private queue: Event<unknown>[] = [];
	// Flag para indicar se o processamento da fila está ocorrendo.
	private processing: boolean = false;

	/**
	 * Publica um único evento.
	 * Se nenhum evento estiver sendo processado, inicia o processamento da fila.
	 */
	publish<T>(event: Event<T>): void {
		this.queue.push(event);
		if (!this.processing) {
			this.start();
		}
	}

	/**
	 * Publica vários eventos.
	 */
	publishAll(...events: Event<unknown>[]): void {
		events.forEach((e) => this.publish(e));
	}

	/**
	 * Inicia o processamento dos eventos na fila.
	 * Cada evento é removido da fila e processado até que a fila esteja vazia.
	 */
	private async start(): Promise<void> {
		this.processing = true;
		while (this.queue.length > 0) {
			const event = this.queue.shift();
			if (event) {
				await this.handle(event);
			}
		}
		this.processing = false;
	}

	/**
	 * Processa o evento, chamando os assinantes registrados para o nome do evento e para o curinga.
	 * Aguardamos que todas as chamadas (que podem ser assíncronas) sejam concluídas antes de prosseguir.
	 */
	private async handle<T>(event: Event<T>): Promise<void> {
		const promises: Promise<void>[] = [];

		const callEventHandler = (EventHandler: EventHandler<T>) => {
			// Caso o método handle retorne void, encapsulamos em Promise.resolve().
			promises.push(Promise.resolve(EventHandler.handle(event)));
		};

		// Processa os assinantes específicos para o nome do evento.
		const eventSubscribers = this.subscribers[event.name()] || [];
		eventSubscribers.forEach(callEventHandler);

		// Processa os assinantes registrados para o nome curinga.
		const wildcardSubscribers = this.subscribers[WILDCARD_EVENT_NAME] || [];
		wildcardSubscribers.forEach(callEventHandler);

		await Promise.all(promises);
	}

	/**
	 * Registra um assinante para um determinado nome de evento.
	 */
	subscribe<T>(eventName: string, subscriber: EventHandler<T>): void {
		if (!this.subscribers[eventName]) {
			this.subscribers[eventName] = [subscriber];
		} else {
			this.subscribers[eventName].push(subscriber);
		}
	}
}
