export interface AlertNotifier {
	schedule(payload: AlertPayload): void;
	cancel(alertId: string): void;
	onMessage(cb: (event: MessageEvent) => void): void;
}

export interface AlertPayload {
	alertId: string;
	patient: {
		name: string;
		patientId: string;
	};
	comments: string;
	time: Date;
	rate: number;
	parameters: string[];
}
