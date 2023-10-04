<script setup lang="ts">
defineProps(["title"])
</script>
<template>
    <header class="flex items-center h-16 shadow-md bg-white">
        <div class="main-content flex flex-1 items-center gap-2">
            <slot></slot>
            <h1 class="text-lg">{{ title }}</h1>
        </div>
    </header>
</template>