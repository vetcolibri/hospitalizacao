<script lang="ts" setup>
import { ref } from 'vue'

const alertElement = ref<HTMLDialogElement>()

function show() {
    alertElement.value?.showModal()
}

function close() {
    alertElement.value?.close()
}

defineProps(['title'])
defineExpose({ show, close })
</script>
<template>
    <dialog ref="alertElement" class="sm:w-96 mx-auto bg-white rounded-sm p-8">
        <h1 class="font-medium text-center uppercase">{{ title }}</h1>
        <slot></slot>
    </dialog>
</template>
