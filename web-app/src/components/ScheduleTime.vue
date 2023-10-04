<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';

const date = new Date()
const hour = ref(new Intl.DateTimeFormat("pt-PT", {timeStyle: "short"}).format(date))
const emit = defineEmits()

const updateValue = () => {
    emit('update:modelValue', hour.value)
}

onBeforeMount(() => {
    updateValue()
})
</script>
<template>
    <div class="space-y-1">
        <label for="time" class="block">Hora do alerta</label>
        <div class="w-32">
            <input 
                class="form-control text-center w-24" 
                type="time" 
                name="hour" 
                @input="() => updateValue()"
                v-model="hour" 
            >
        </div>
    </div>
</template>