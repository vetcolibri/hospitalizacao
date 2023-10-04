import { makeDateFormat, makeHourFormat } from './shared/utils'

export const vFormatDate = {
    mounted: formatDate
}

function formatDate(el: HTMLSpanElement, binding: { value: string }) {
    const date = new Date(binding.value)
    const day = makeDateFormat(date)
    const hour = makeHourFormat(date)
    el.innerHTML = `Ultimas medições: ${day}, ${hour}`
}
