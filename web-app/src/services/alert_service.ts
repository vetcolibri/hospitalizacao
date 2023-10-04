import type { Alert } from '@/lib/models/alert'
import type { HttpClient } from '../lib/http_client'

export interface AlertService {
    scheduleAlert(alert: Alert): void
    disableAlert(alertId: string): void
}

export class HttpAlertService implements AlertService {
    readonly httpClient: HttpClient
    readonly baseUrl: string
    readonly resource: string

    constructor(httpClient: HttpClient, baseUrl: string) {
        this.httpClient = httpClient
        this.baseUrl = baseUrl
        this.resource = 'alerts'
    }

    scheduleAlert(alert: Alert) {
        this.httpClient.post(`${this.baseUrl}/${this.resource}/schedule`, alert)
    }

    disableAlert(alertId: string) {
        this.httpClient.post(`${this.baseUrl}/${this.resource}/disable`, {
            alertId
        })
    }
}
