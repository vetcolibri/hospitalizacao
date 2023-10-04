<script lang="ts">
import BaseParameter from './BaseParameter.vue'
import { ref } from 'vue'
</script>

<script setup lang="ts">
const emit = defineEmits(['update:modelValue'])
const hct = ref<string>('')

const updateValue = () => {
    emit('update:modelValue', hct.value)
}
</script>

<template>
    <BaseParameter title="HCT" helpText="Canino (37 - 55)% e Felino (24 - 45)%">
        <input
            class="form-control"
            placeholder="Valor"
            min="0"
            max="10"
            required
            type="number"
            v-model="hct"
            @input="() => updateValue()"
        />
    </BaseParameter>
</template>
