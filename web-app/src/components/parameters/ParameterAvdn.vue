<script lang="ts">
import BaseParameter from './BaseParameter.vue'
</script>

<script setup lang="ts">
import { avdnOptions } from '@/lib/data/parameters'
const emit = defineEmits(['update:modelValue'])

const updateValue = (event: InputEvent) => {
    emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
    <BaseParameter title="AVDN">
        <select
            class="form-control text-gray-500"
            required
            @input="(e) => updateValue(e as InputEvent)"
        >
            <option value="">Escolha um valor</option>
            <option v-for="opt in avdnOptions" :value="opt">{{ opt }}</option>
        </select>
    </BaseParameter>
</template>
