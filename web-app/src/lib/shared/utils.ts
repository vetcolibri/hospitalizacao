// export function openSummary(form: HTMLFormElement, summary: any, parameters: any) {
//     if (!form.checkValidity()) {
//         return form.reportValidity()
//     }
//     if (parameters.length > 0) {
//         summary.addParameters(parameters)
//         summary.show()
//     }
// }

// export function getAllMeasurements(parameters: Object) {
//     const measurements: Measurement[] = []
//     for (let parameter of Object.values(parameters)) {
//         measurements.push({
//             parameter: parameter.name,
//             value: parameter.measurement!.value
//         })
//     }
//     return measurements
// }

// export function lastMeasurement(parameter: string, measurements: Measurement[]) {
//     const measurement = measurements.find((measurement: any) => measurement.parameter === parameter)
//     if (measurement) return measurement
// }

export function timeFromString(time: string) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()

    const parts = time.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    return new Date(year, month, day, hours, minutes)
}

export function makeDateFormat(date: Date) {
    let month = makeMonthFormat(date)
    const firstCharacter = month.charAt(0).toUpperCase()
    month = firstCharacter + month.slice(1)
    return `${makeDayFormat(date)} ${month} ${makeYearFormat(date)}`
}

export function makeHourFormat(date: Date) {
    return makeDateTimeFormat('pt-PT', { timeStyle: 'short' }).format(date)
}

export function makeDayFormat(date: Date) {
    return makeDateTimeFormat('pt-PT', { day: '2-digit' }).format(date)
}

export function makeMonthFormat(date: Date) {
    return makeDateTimeFormat('pt-PT', { month: 'short' }).format(date)
}

export function makeYearFormat(date: Date) {
    return makeDateTimeFormat('pt-PT', { year: 'numeric' }).format(date)
}

export function makeDateTimeFormat(locals: string, options: Object) {
    return new Intl.DateTimeFormat(locals, options)
}
