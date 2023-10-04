<script setup lang="ts">
import AlertIcon from '@/components/icons/AlertIcon.vue'

import { inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { HttpAlertService } from '@/services/alert_service'
import { parameters } from '@/lib/data/parameters'
import { Provided } from '@/lib/provided'
import type { Alert } from '@/models/alert'

const router = useRouter()
const props = defineProps<Alert>()
const emit = defineEmits(['close'])
const notShowAgain = ref<boolean>(false)
const alertClient = inject<HttpAlertService>(Provided.ALERT_SERVICE)!

function convert(seconds: number) {
    let unity = 'minuto'
    const minutes = seconds / 60
    if (minutes > 1) {
        unity = 'minutos'
    }
    return `${minutes} ${unity}`
}

function redirectToChooseParameters() {
    localStorage.setItem('selectedParameters', JSON.stringify(props.parameters))
    router.push({
        name: 'ChooseParameters',
        params: { patientId: props.patientId }
    })
}

function confirm() {
    emit('close')
    if (notShowAgain.value === true) {
        alertClient.disableAlert(props.alertId!)
    }
    return redirectToChooseParameters()
}

function findParameterName(name: string) {
    return Object.values(parameters).find((parameter) => parameter.name === name)
}
</script>
<template>
    <div class="my-4 space-y-4">
        <div class="flex gap-4 items-center">
            <p>Parâmetro:</p>
            <span class="text-sm text-red-500">A cada {{ convert(repeatEvery) }}</span>
        </div>
        <ul class="space-y-4">
            <li v-for="parameter in props.parameters" class="flex items-center w-full gap-2">
                <alert-icon class="text-yellow-600" />
                {{ findParameterName(parameter)?.title }}
            </li>
        </ul>
        <p class="text-sm text-justify my-4">{{ comments }}</p>
    </div>
    <div class="space-y-4">
        <div class="flex items-center">
            <input
                id="notShowAgain"
                type="checkbox"
                class="rounded focus:ring-0"
                v-model="notShowAgain"
            />
            <label for="notShowAgain" class="block ml-2 text-sm text-gray-900">
                Não mostrar novamente
            </label>
        </div>
        <div class="text-right space-x-3">
            <button class="btn-secondary" @click="emit('close')">Fechar</button>
            <button class="btn-success" @click="confirm()">Confirmar</button>
        </div>
    </div>
</template>
@/lib/models/alert
