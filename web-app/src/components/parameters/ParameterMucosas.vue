<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { mucosasOptions } from '@/lib/data/parameters'
</script>

<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])

const updateValue = (event: InputEvent) => {
    emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
    <BaseParameter title="Mucosas">
        <select
            class="form-control text-gray-500"
            required
            @input="(e) => updateValue(e as InputEvent)"
        >
            <option value="">Escolha um valor</option>
            <option v-for="opt in mucosasOptions" :value="opt">{{ opt }}</option>
        </select>
    </BaseParameter>
</template>
