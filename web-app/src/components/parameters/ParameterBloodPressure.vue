<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['state', 'update:modelValue'])
const bloodPressure = ref<string>('')
const message = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', bloodPressure.value)
}

function convertToArray(): string[] {
    const pattern = /(\d+)/g
    const matches = bloodPressure.value.match(pattern)
    return matches!
}

function getDis() {
    const values = convertToArray()
    if (values) return parseFloat(values[0])
}

function getSis() {
    const values = convertToArray()
    if (values) return parseFloat(values[1])
}

function parameterState() {
    const dis = getDis()
    const sis = getSis()
    if (bloodPressure.value === '') {
        message.value = ''
    }

    if (dis && sis) {
        if (dis >= 140 && sis >= 90) {
            message.value = 'Hipertensão'
        } else if (dis < 110 && sis < 80) {
            message.value = 'Hipotensão'
        } else if (dis >= 110 && dis <= 140 && sis >= 80 && sis <= 100) {
            message.value = ''
        } else {
            message.value = ''
        }
    }
    emit('state', message.value)
}
</script>

<template>
    <BaseParameter title="Pressão Arterial - Sis/Dis (PAM)" helpText="(11/70 - 12/80) mm/Hg - (60)">
        <input
            class="form-control"
            placeholder="Valor"
            type="text"
            v-model="bloodPressure"
            required
            @input="() => updateValue()"
            @keyup="() => parameterState()"
        />
    </BaseParameter>
</template>
