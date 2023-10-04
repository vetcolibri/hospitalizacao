<script setup lang="ts">
import ArrowLeft from '@/components/icons/ArrowLeft.vue'
</script>
<template>
    <arrow-left @click="$router.back()" class="cursor-pointer" />
</template>
