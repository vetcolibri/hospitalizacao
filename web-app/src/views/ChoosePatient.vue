<script setup lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import GoBack from '@/components/GoBack.vue'
import PatientHospitalized from '@/components/Patient.vue'

import { inject, onMounted, ref } from 'vue'
import { Provided } from '@/lib/provided'
import type { Patient } from '@/models/patient'
import type { PatientService } from '@/services/patient_service'

const patients = ref<Patient[]>([])

onMounted(async () => {
    const patientClient = inject<PatientService>(Provided.PATIENT_SERVICE)!
    const data = await patientClient.getAllHospitalized()
    patients.value = data
})
</script>
<template>
    <div>
        <Header title="Escolha o paciente">
            <GoBack />
        </Header>
        <main class="main-content py-8">
            <section class="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:mx-auto xl:max-w-7xl">
                <PatientHospitalized
                    v-for="patient in patients"
                    :patientId="patient.patientId"
                    :name="patient.name"
                    :specie="patient.specie"
                    :hasAlert="patient.hasAlert"
                />
            </section>
        </main>
        <Footer />
    </div>
</template>
@/lib/models/patient
