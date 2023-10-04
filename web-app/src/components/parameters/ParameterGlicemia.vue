<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['state', 'update:modelValue'])
const glicemia = ref<string>('')
const message = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', glicemia.value)
}

function parameterState() {
    const value = parseFloat(glicemia.value)
    if (glicemia.value === '') {
        message.value = ''
    } else if (value < 60) {
        message.value = 'Hipoglicemia'
    } else if (value >= 60 && value <= 100) {
        message.value = ''
    } else if (value > 100) {
        message.value = 'Hiperglicemia'
    }
    emit('state', message.value)
}
</script>

<template>
    <BaseParameter title="Glicemia" helpText="(60 - 100) mg/dl">
        <input
            class="form-control"
            placeholder="Valor"
            min="0"
            max="300"
            required
            type="number"
            v-model="glicemia"
            @input="() => updateValue()"
            @keyup="() => parameterState()"
        />
    </BaseParameter>
</template>
