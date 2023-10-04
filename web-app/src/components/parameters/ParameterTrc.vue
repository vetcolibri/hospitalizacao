<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['state', 'update:modelValue'])
const trc = ref<string>('')
const message = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', trc.value)
}

function parameterState() {
    const value = parseInt(trc.value)
    if (trc.value === '') {
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
    <BaseParameter title="TRC" helpText="(> 2')">
        <input
            class="form-control"
            placeholder="Valor"
            min="0"
            max="10"
            required
            type="number"
            v-model="trc"
            @input="() => updateValue()"
            @keyup="() => parameterState()"
        />
    </BaseParameter>
</template>
