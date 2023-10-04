<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['state', 'update:modelValue'])
const respiratoryRate = ref<string>('')
const message = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', respiratoryRate.value)
}

function parameterState() {
    const value = parseInt(respiratoryRate.value)
    if (respiratoryRate.value === '') {
        message.value = ''
    } else if (value >= 0 && value <= 9) {
        message.value = 'Bradipnéia'
    } else if (value >= 10 && value <= 30) {
        message.value = ''
    } else if (value > 30 && value <= 100) {
        message.value = 'Taquipnéia'
    }
    emit('state', message.value)
}
</script>

<template>
    <BaseParameter title="Frequência Respiratória" helpText="(10 - 30) RPM">
        <input
            class="form-control"
            placeholder="Valor"
            min="0"
            max="100"
            required
            type="number"
            v-model="respiratoryRate"
            @input="() => updateValue()"
            @keyup="() => parameterState()"
        />
    </BaseParameter>
</template>
