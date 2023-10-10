<script setup lang="ts">
import AlertIcon from '@/components/icons/AlertIcon.vue'
import { iconUrl } from '@/lib/data/patients'
import type { Patient } from '@/models/patient'

import { makeDateFormat } from '@/lib/shared/utils'

defineProps<Patient>()
</script>
<template>
    <section class="shadow-md rounded bg-white relative">
        <router-link :to="`/${$route.params.examFormat}/${patientId}`">
            <div class="flex p-8 gap-8 items-center">
                <div class="w-[9rem]">
                    <img :src="iconUrl" alt="pet-foot-image" />
                    <i class="bi bi-pet"></i>
                </div>
                <ul class="flex-1 space-y-2">
                    <li class="patient-info">
                        <label class="text-xs md:text-sm">ID Paciente:</label>
                        <span class="mt-1">
                            {{ patientId }}
                        </span>
                    </li>
                    <li class="patient-info">
                        <label class="text-xs md:text-sm">Nome:</label>
                        <span class="mt-1">
                            {{ name }}
                        </span>
                    </li>
                    <li class="patient-info">
                        <label class="text-xs md:text-sm">Espécie:</label>
                        <span class="mt-1">
                            {{ specie }}
                        </span>
                    </li>
                    <li class="patient-info">
                        <label class="text-xs md:text-sm">Entrada em:</label>
                        <span class="mt-1">
                            {{ makeDateFormat(new Date(issuedAt)) }}
                        </span>
                    </li>
                </ul>
            </div>
            <div v-if="hasAlert" class="absolute left-3 bottom-3 text-end text-yellow-600">
                <alert-icon class="inline-block" />
            </div>
        </router-link>
    </section>
</template>
