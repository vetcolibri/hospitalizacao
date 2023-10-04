<script setup lang="ts">
import AlertIcon from '@/components/icons/AlertIcon.vue'
import CheckCircle from '@/components/icons/CheckCircle.vue'
import type { Parameter } from '@/models/parameter'

import { ref } from 'vue'

const sunmaryElement = ref<HTMLDialogElement>()
const summaryParameters = ref<Partial<Parameter>[]>([])

function addParameters(parameters: Partial<Parameter>[]) {
    parameters.forEach((parameter) => add(parameter))
}

function add(parameter: Partial<Parameter>) {
    summaryParameters.value.push(parameter)
}

function show() {
    sunmaryElement.value?.showModal()
}

function close() {
    summaryParameters.value = []
    sunmaryElement.value?.close()
}

defineExpose({ addParameters, add, show, close })
</script>
<template>
    <dialog ref="sunmaryElement" class="sm:w-96 mx-auto bg-white rounded-sm p-8">
        <h1 class="font-medium uppercase text-center">Resumo</h1>
        <div class="my-8">
            <ul class="space-y-2">
                <li v-for="parameter in summaryParameters" class="flex items-center w-full gap-2">
                    <alert-icon class="text-yellow-600" v-show="parameter.measurement?.message" />
                    <check-circle class="text-green-600" v-show="!parameter.measurement?.message" />
                    <span>{{ parameter?.title }}:</span>
                    <span
                        :class="parameter?.measurement?.message ? 'text-red-500' : 'text-gray-500'"
                        >{{
                            parameter?.measurement?.message
                                ? parameter?.measurement!.message
                                : 'Normal'
                        }}</span
                    >
                </li>
            </ul>
        </div>
        <div class="text-right space-x-3">
            <button class="btn-secondary" @click="close()">Fechar</button>
            <slot></slot>
        </div>
    </dialog>
</template>
@/lib/models/parameter
