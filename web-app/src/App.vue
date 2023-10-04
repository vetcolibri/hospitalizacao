<script setup lang="ts">
import Alert from './components/Alert.vue'
import ParameterAlerts from './components/ParameterAlerts.vue'

import { inject, ref } from 'vue'

const alertElement = ref<typeof Alert>()
const alertId = ref<string>('')
const patientId = ref<string>('')
const parameters = ref<string[]>([])
const repeatEvery = ref<number>(0)
const comments = ref<string>('')
const webSocket = inject('webSocket') as WebSocket

webSocket.onopen = () => {
    console.log('Websocket Connected.')
}

webSocket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    patientId.value = data.patient.patientId
    alertId.value = data.alertId
    parameters.value = data.parameters
    repeatEvery.value = data.repeatEvery
    comments.value = data.comments
    alertElement.value?.show()
}
</script>
<template>
    <div class="bg-gray-300 relative">
        <router-view></router-view>
        <Alert ref="alertElement">
            <ParameterAlerts
                :alert-id="alertId"
                :patient-id="patientId"
                :parameters="parameters"
                :repeat-every="repeatEvery"
                :comments="comments"
                @close="() => alertElement?.close()"
            />
        </Alert>
    </div>
</template>
