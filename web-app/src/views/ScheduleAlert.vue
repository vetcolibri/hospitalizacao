<script setup lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import ScheduleTime from '@/components/ScheduleTime.vue'
import ScheduleRate from '@/components/ScheduleRepeatEvery.vue'

import { inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { parameters } from '@/lib/data/parameters'
import { timeFromString } from '@/lib/shared/utils'
import { HttpAlertService } from '@/services/alert_service'
import type { RepeatEvery } from '@/models/repeat_every'
import { Provided } from '@/lib/provided'

let selectedParameters = ref<string[]>([])
const scheduleTime = ref<string>('')
const repeatEvery = ref<RepeatEvery>({ rate: 0, unity: '' })
const comments = ref<string>('')
const textareaElement = ref<HTMLTextAreaElement>()
const scheduleButton = ref<boolean>(false)
const router = useRouter()
const route = useRoute()
const patientId = `${route.params.patientId}`
const alertClient = inject<HttpAlertService>(Provided.ALERT_SERVICE)!

function wasSelected(name: string) {
    const selected = selectedParameters.value.find((element) => element === name)
    if (selected) return true
    return false
}

function selectParameter(name: string) {
    if (!wasSelected(name)) return selectedParameters.value.push(name)
    selectedParameters.value = selectedParameters.value.filter((element) => element !== name)
    return selectedParameters.value
}

function repeatEveryToSeconds() {
    const { rate, unity } = repeatEvery.value
    if (unity === 'minutes') {
        return rate * 60
    }
    return rate * 60 * 60
}

function schedule() {
    const date = timeFromString(scheduleTime.value)
    const rate = repeatEveryToSeconds()
    const alertData = {
        patientId: patientId,
        parameters: selectedParameters.value,
        date: date.toISOString(),
        repeatEvery: rate,
        comments: comments.value
    }

    alertClient.scheduleAlert(alertData)
    alert('Alerta agendado com sucesso')
    return router.push({ name: 'ExamGeneralCondition' })
}

onMounted(() => {
    textareaElement.value?.addEventListener('input', (event) => {
        const textarea = (event.target as HTMLTextAreaElement).value
        if (textarea.length > 0 && selectedParameters.value.length > 0) {
            return (scheduleButton.value = true)
        }
        return (scheduleButton.value = false)
    })
})
</script>
<template>
    <div>
        <Header title="Alerta na monitorização" />
        <main class="main-content py-8">
            <section class="parameters-container">
                <form class="space-y-3">
                    <ScheduleTime v-model="scheduleTime" />
                    <ScheduleRate v-model="repeatEvery" />
                    <div class="overflow-y-auto border rounded space-y-2 p-3">
                        <div v-for="parameter in parameters" class="flex items-center">
                            <input
                                type="checkbox"
                                class="rounded focus:ring-0"
                                :name="parameter.name"
                                :checked="wasSelected(parameter.name)"
                                @click="selectParameter(parameter.name)"
                            />
                            <label
                                class="ml-2 block text-gray-900"
                                @click="selectParameter(parameter.name)"
                            >
                                {{ parameter.title }}
                            </label>
                        </div>
                    </div>
                    <textarea
                        ref="textareaElement"
                        name="comments"
                        class="form-control resize-none focus:ring-0 overflow-hidden"
                        placeholder="Observações"
                        rows="4"
                        v-model="comments"
                    >
                    </textarea>
                </form>
            </section>
        </main>
        <Footer>
            <div class="space-x-3">
                <router-link :to="{ name: 'ExamGeneralCondition' }">
                    <button class="btn-secondary">Cancelar</button>
                </router-link>
                <button v-if="!scheduleButton" class="btn-light disabled">Agendar</button>
                <button v-if="scheduleButton" type="button" class="btn-success" @click="schedule()">
                    Agendar
                </button>
            </div>
        </Footer>
    </div>
</template>
@/lib/models/repeat_every
