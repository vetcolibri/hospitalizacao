<script lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import GoBack from '@/components/GoBack.vue'
import RoundTime from '@/components/RoundTime.vue'
import HeartRate from '@/components/parameters/ParameterHeartRate.vue'
import RespiratoryRate from '@/components/parameters/ParameterRespiratoryRate.vue'
import Trc from '@/components/parameters/ParameterTrc.vue'
import Avdn from '@/components/parameters/ParameterAvdn.vue'
import Mucosas from '@/components/parameters/ParameterMucosas.vue'
import Temperature from '@/components/parameters/ParameterTemperature.vue'
import Glicemia from '@/components/parameters/ParameterGlicemia.vue'
import Hct from '@/components/parameters/ParameterHct.vue'
import BloodPressure from '@/components/parameters/ParameterBloodPressure.vue'
import { inject, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { parameters } from '@/lib/data/parameters'
import { Provided } from '@/lib/provided'
import { HttpMeasurementService } from '@/services/measurement_service'
</script>
<script setup lang="ts">
import HandIndex from '@/components/icons/HandIndex.vue'

const continuousMonitoring = ref(parameters)
const showParameterList = ref(false)
const form = ref<HTMLFormElement>()
const alertCheckbox = ref<boolean>(false)
const showAlertCheckbox = ref<boolean>(false)
const parameterListElement = ref()

const router = useRouter()
const route = useRoute()
const patientId = `${route.params.patientId}`

const measurmentClient = inject<HttpMeasurementService>(Provided.MEASUREMENT_SERVICE)!

const parametersState = ref({
    heartRate: {
        id: '1',
        name: 'Frequência Cardiaca',
        visibility: false
    },
    respiratoryRate: {
        id: '2',
        name: 'Frequência Respiratória',
        visibility: false
    },
    trc: {
        id: '3',
        name: 'TRC',
        visibility: false
    },
    avdn: {
        id: '4',
        name: 'AVDN',
        visibility: false
    },
    mucosas: {
        id: '5',
        name: 'Mucosas',
        visibility: false
    },
    temperature: {
        id: '6',
        name: 'Temperatura',
        visibility: false
    },
    glicemia: {
        id: '7',
        name: 'Glicemia',
        visibility: false
    },
    hct: {
        id: '8',
        name: 'HCT',
        visibility: false
    },
    bloodPressure: {
        id: '9',
        name: 'Pressão Arterial',
        visibility: false
    }
})

function toogleParameterList() {
    showParameterList.value = !showParameterList.value
}

function changeVisibility(id: string) {
    for (const parameter of Object.values(parametersState.value)) {
        if (parameter.id === id) {
            parameter.visibility = !parameter.visibility
            changeAlertCheckboxVisibility()
            return
        }
    }
}

function changeAlertCheckboxVisibility() {
    const parameters = Object.values(parametersState.value)
    const visibleParameter = parameters.some((parameter) => parameter.visibility)
    if (visibleParameter && showAlertCheckbox.value === false) {
        showAlertCheckbox.value = true
        return
    }
    if (!visibleParameter && showAlertCheckbox.value === true) {
        showAlertCheckbox.value = false
        return
    }
}

function clearVisibility() {
    const parameters = Object.values(parametersState.value)
    const visibleParameters = parameters.filter((parameter) => parameter.visibility === true)
    visibleParameters.forEach((parameter) => {
        parameter.visibility = false
    })
}

// function showSelectedParameters() {
//     const parameters = localStorage.getItem('selectedParameters')
//     if (parameters) {
//         for (let name of JSON.parse(parameters)) {
//             changeParameterVisibility(name)
//         }
//     }
// }

const clickOutsideHandler = (event: Event) => {
    if (parameterListElement.value && !parameterListElement.value.contains(event.target)) {
        showParameterList.value = false
    }
}

function confirm() {}

// onBeforeMount(() => {
//     changeAlertCheckboxVisibility()
// })

onMounted(async () => {
    // showSelectedParameters()
    // localStorage.clear()
    document.addEventListener('click', clickOutsideHandler)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', clickOutsideHandler)
    // clearVisibility()
})
</script>
<template>
    <Header title="Escolha os parâmetros">
        <GoBack />
    </Header>
    <main class="main-content py-8">
        <section class="parameters-container">
            <RoundTime />
            <div class="relative space-y-2">
                <div
                    ref="parameterListElement"
                    @click="toogleParameterList"
                    class="flex items-center gap-2 border rounded ps-2 text-gray-500"
                >
                    <hand-index></hand-index>
                    <div class="form-contral flex-1 border-0 py-2 focus:ring-0">
                        Escolher parâmetros
                    </div>
                </div>
                <div
                    v-if="showParameterList"
                    @click.stop
                    class="h-48 absolute w-full bg-white overflow-y-auto border rounded space-y-2 p-3"
                >
                    <div v-for="parameter in parametersState" :key="parameter.id">
                        <label
                            class="flex items-center gap-2 ml-2 text-gray-900"
                            @change="changeVisibility(parameter.id)"
                        >
                            <input
                                type="checkbox"
                                class="rounded focus:ring-0"
                                :checked="parameter.visibility"
                            />
                            {{ parameter.name }}
                        </label>
                    </div>
                </div>
                <hr />
                <form ref="form">
                    <div class="space-y-4">
                        <HeartRate
                            v-if="parametersState.heartRate.visibility"
                            v-model="continuousMonitoring.heartRate.value"
                            @state="continuousMonitoring.heartRate.state = $event"
                        />
                        <RespiratoryRate
                            v-if="parametersState.respiratoryRate.visibility"
                            v-model="continuousMonitoring.resporatoryRate.value"
                            @state="continuousMonitoring.resporatoryRate.state = $event"
                        />
                        <Trc
                            v-if="parametersState.trc.visibility"
                            v-model="continuousMonitoring.trc.value"
                            @state="continuousMonitoring.trc.state = $event"
                        />
                        <Avdn
                            v-if="parametersState.avdn.visibility"
                            v-model="continuousMonitoring.avdn.value"
                            @state="continuousMonitoring.avdn.state = $event"
                        />
                        <Mucosas
                            v-if="parametersState.mucosas.visibility"
                            v-model="continuousMonitoring.mucosas.value"
                            @state="continuousMonitoring.mucosas.state = $event"
                        />
                        <Temperature
                            v-if="parametersState.temperature.visibility"
                            v-model="continuousMonitoring.temperature.value"
                            @state="continuousMonitoring.temperature.state = $event"
                        />
                        <Glicemia
                            v-if="parametersState.glicemia.visibility"
                            v-model="continuousMonitoring.glicemia.value"
                            @state="continuousMonitoring.glicemia.state = $event"
                        />
                        <Hct
                            v-if="parametersState.hct.visibility"
                            v-model="continuousMonitoring.hct.value"
                            @state="continuousMonitoring.hct.state = $event"
                        />
                        <BloodPressure
                            v-if="parametersState.bloodPressure.visibility"
                            v-model="continuousMonitoring.bloodPressure.value"
                            @state="continuousMonitoring.bloodPressure.state = $event"
                        />
                        <div v-if="showAlertCheckbox" class="flex items-center">
                            <input
                                type="checkbox"
                                class="focus:ring-0 rounded"
                                v-model="alertCheckbox"
                            />
                            <label
                                class="ml-2 block text-gray-900"
                                @click="() => (alertCheckbox = !alertCheckbox)"
                            >
                                Criar alerta de monitorização
                            </label>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    </main>
    <Footer>
        <button type="button" class="btn-success">Salvar</button>
    </Footer>
    <!-- <Summary ref="summaryOfMeasurements" title="Detalhes">
        <button class="btn-success" @click="confirm()">Confirmar</button>
    </Summary> -->
</template>
