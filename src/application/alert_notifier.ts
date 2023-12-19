import { Alert } from "domain/alerts/alert.ts";

export interface AlertNotifier {
  schedule(alert: Alert): void;
  cancel(alert: Alert): void;
  onMessage(cb: (event: MessageEvent) => void): void;
}
