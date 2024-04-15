import { RepeatEvery } from "./repeat_every.ts";
import { ID } from "shared/id.ts";

type Options = {
	alertId: string;
	patientId: string;
	parameters: string[];
	rate: number;
	comments: string;
	time: string;
	status: string;
};

export enum AlertStatus {
	Enabled = "enabled",
	Disabled = "disabled",
}

export class Alert {
	alertId: ID;
	patientId: ID;
	#parameters: string[];
	#time: Date;
	#repeatEvery: RepeatEvery;
	#comments: string;
	#status: AlertStatus;

	constructor(
		alertId: ID,
		patientId: ID,
		parameters: string[],
		time: Date,
		repeatEvery: RepeatEvery,
		comments: string,
	) {
		this.alertId = alertId;
		this.patientId = patientId;
		this.#parameters = [...parameters];
		this.#repeatEvery = repeatEvery;
		this.#comments = comments;
		this.#time = time;
		this.#status = AlertStatus.Enabled;
	}

	static restore(data: Options): Alert {
		const alert = new Alert(
			ID.fromString(data.alertId),
			ID.fromString(data.patientId),
			data.parameters,
			new Date(data.time),
			new RepeatEvery(data.rate),
			data.comments,
		);

		alert.updateStatus(data.status);

		return alert;
	}

	cancel(): void {
		this.#status = AlertStatus.Disabled;
	}

	isDisabled(): boolean {
		return this.#status === AlertStatus.Disabled;
	}

	updateStatus(status: string) {
		if (AlertStatus.Enabled === status) {
			this.#status = AlertStatus.Enabled;
			return;
		}

		this.#status = AlertStatus.Disabled;
	}

	get status(): string {
		return this.#status;
	}

	get parameters(): string[] {
		return this.#parameters;
	}

	get repeatEvery(): number {
		return this.#repeatEvery.value;
	}

	get time(): string {
		return this.#time.toISOString();
	}

	get comments(): string {
		return this.#comments;
	}
}
