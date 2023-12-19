import { AlertNotifier } from "application/alert_notifier.ts";
import { Alert } from "domain/alerts/alert.ts";

export class AlertNotifierDummy implements AlertNotifier {
  constructor() {}

  schedule(_alert: Alert): void {}

  cancel(_alert: Alert): void {}

  onMessage(_cb: (event: MessageEvent) => void): void {
    return;
  }
}
