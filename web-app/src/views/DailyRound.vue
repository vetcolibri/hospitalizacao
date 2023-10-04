<script lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import GoBack from '@/components/GoBack.vue'
import RoundTime from '@/components/RoundTime.vue'
import Summary from '@/components/ParametersSummary.vue'
import HeartRate from '@/components/parameters/ParameterHeartRate.vue'
import RespiratoryRate from '@/components/parameters/ParameterRespiratoryRate.vue'
import Trc from '@/components/parameters/ParameterTrc.vue'
import Avdn from '@/components/parameters/ParameterAvdn.vue'
import Mucosas from '@/components/parameters/ParameterMucosas.vue'
import Temperature from '@/components/parameters/ParameterTemperature.vue'
import Glicemia from '@/components/parameters/ParameterGlicemia.vue'
import Hct from '@/components/parameters/ParameterHct.vue'
import BloodPressure from '@/components/parameters/ParameterBloodPressure.vue'

import { useRoute, useRouter } from 'vue-router'
import { inject, ref } from 'vue'
import { HttpMeasurementService } from '@/services/measurement_service'
import { Provided } from '@/lib/provided'
import { parameters } from '@/lib/data/parameters'
</script>

<script setup lang="ts">
const alertCheckbox = ref<boolean>(false)
const dailyRound = ref(parameters)
const form = ref<HTMLFormElement>()

const route = useRoute()
const router = useRouter()
const patientId = `${route.params.patientId}`
const measurmentClient = inject<HttpMeasurementService>(Provided.MEASUREMENT_SERVICE)!

function openSummary() {
    if (!form.value?.checkValidity()) {
        return form.value?.reportValidity()
    }
}

function confirm() {}
</script>
<template>
    <Header title="Ronda diária">
        <GoBack />
    </Header>
    <main class="main-content py-8">
        <section class="parameters-container">
            <RoundTime />
            <form ref="form" class="grid grid-row-1 space-y-4">
                <HeartRate
                    v-model="dailyRound.heartRate.value"
                    @state="dailyRound.heartRate.state = $event"
                />
                <RespiratoryRate
                    v-model="dailyRound.resporatoryRate.value"
                    @state="dailyRound.resporatoryRate.state = $event"
                />
                <Trc v-model="dailyRound.trc.value" @state="dailyRound.trc.state = $event" />
                <Avdn v-model="dailyRound.avdn.value" @state="dailyRound.avdn.state = $event" />
                <Mucosas
                    v-model="dailyRound.mucosas.value"
                    @state="dailyRound.mucosas.state = $event"
                />
                <Temperature
                    v-model="dailyRound.temperature.value"
                    @state="dailyRound.temperature.state = $event"
                />
                <Glicemia
                    v-model="dailyRound.glicemia.value"
                    @state="dailyRound.glicemia.state = $event"
                />
                <Hct v-model="dailyRound.hct.value" @state="dailyRound.hct.state = $event" />
                <BloodPressure
                    v-model="dailyRound.bloodPressure.value"
                    @state="dailyRound.bloodPressure.state = $event"
                />
                <div class="flex items-center">
                    <input type="checkbox" class="focus:ring-0 rounded" v-model="alertCheckbox" />
                    <label
                        class="ml-2 block text-gray-900"
                        @click="() => (alertCheckbox = !alertCheckbox)"
                    >
                        Criar alerta de monitorização
                    </label>
                </div>
            </form>
        </section>
    </main>
    <Footer>
        <button type="button" class="btn-success" @click="openSummary()">Salvar</button>
    </Footer>
    <Summary ref="summaryOfMeasurements" title="Detalhes">
        <button type="button" class="btn-secondary" @click="confirm()">Confirmar</button>
    </Summary>
</template>
