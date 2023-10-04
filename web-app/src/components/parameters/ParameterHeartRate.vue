<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['state', 'update:modelValue'])
const heartRate = ref<string>('')
const message = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', heartRate.value)
}

function parameterState() {
    const value = parseInt(heartRate.value)
    if (heartRate.value === '') {
        message.value = ''
    } else if (value >= 0 && value <= 69) {
        message.value = 'Bradicardia'
    } else if (value >= 70 && value <= 120) {
        message.value = ''
    } else if (value > 120) {
        message.value = 'Taquicardia'
    }
    emit('state', message.value)
}
</script>

<template>
    <BaseParameter title="Frequência Cardiaca" helpText="(70 - 120) BPM">
        <input
            class="form-control"
            placeholder="Valor"
            min="0"
            max="300"
            required
            type="number"
            v-model="heartRate"
            @input="() => updateValue()"
            @keyup="() => parameterState()"
        />
    </BaseParameter>
</template>
