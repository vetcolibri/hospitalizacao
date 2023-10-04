import type { Measurement } from './measurement'

export interface Parameter {
    title: string
    name: string
    type?: string
    helpText?: string
    options?: string[]
    measurement?: Measurement
    lastMeasurement?: Measurement
    chooseVisibility?: boolean
}
