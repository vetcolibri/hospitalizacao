<script setup lang="ts">
import AlertIcon from '@/components/icons/AlertIcon.vue'
import { iconUrl } from '@/lib/data/patients'
import type { Patient } from '@/models/patient'

defineProps<Patient>()
</script>
<template>
    <section class="shadow-md rounded bg-white relative">
        <router-link :to="`/${$route.params.examFormat}/${patientId}`">
            <div class="flex p-8 gap-8 items-center">
                <div class="w-[8rem]">
                    <img :src="iconUrl" alt="pet-foot-image" />
                </div>
                <ul class="flex-1 space-y-2">
                    <li class="w-full border-2 rounded text-gray-500 bg-gray-100 px-3 py-2">
                        {{ patientId }}
                    </li>
                    <li class="w-full border-2 rounded text-gray-500 bg-gray-100 px-3 py-2">
                        {{ name }}
                    </li>
                    <li class="w-full border-2 rounded text-gray-500 bg-gray-100 px-3 py-2">
                        {{ specie }}
                    </li>
                </ul>
            </div>
            <div v-if="hasAlert" class="absolute left-3 bottom-3 text-end text-yellow-600">
                <alert-icon class="inline-block" />
            </div>
        </router-link>
    </section>
</template>
