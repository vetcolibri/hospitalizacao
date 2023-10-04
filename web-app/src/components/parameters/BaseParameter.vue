<script lang="ts" setup>
import { vFormatDate } from '@/lib/directives'

interface Props {
    title: string
    helpText?: string
    measurement?: { value: string; date: string }
}
defineProps<Props>()
</script>

<template>
    <section class="flex flex-col gap-2">
        <p>{{ title }}</p>
        <div class="flex gap-4">
            <div class="flex flex-col flex-1 gap-1">
                <slot />
                <span class="text-sm text-gray-600">{{ helpText }}</span>
            </div>
            <div class="flex flex-col flex-1 gap-1">
                <input
                    class="form-control disabled"
                    disabled
                    type="text"
                    :placeholder="measurement?.value ? measurement.value : 'N/D'"
                />
                <span
                    v-if="measurement?.value"
                    v-format-date="measurement?.date"
                    class="text-sm text-gray-600"
                >
                </span>
            </div>
        </div>
    </section>
</template>
