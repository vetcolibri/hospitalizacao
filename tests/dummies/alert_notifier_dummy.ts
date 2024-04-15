import { AlertNotifier, AlertPayload } from "application/alert_notifier.ts";

export class AlertNotifierDummy implements AlertNotifier {
	constructor() {}

	schedule(_payload: AlertPayload): void {}

	cancel(_alertId: string): void {}

	onMessage(_cb: (event: MessageEvent) => void): void {
		return;
	}
}
