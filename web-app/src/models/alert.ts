export interface Alert {
    alertId?: string
    patientId: string
    parameters: string[]
    repeatEvery: number
    comments: string
    date?: string
}
