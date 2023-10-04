<script lang="ts" setup>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
</script>
<template>
    <Header title="Exame Estado Geral" />
    <main class="main-content">
        <nav class="flex items-center justify-center h-full">
            <ul class="flex flex-col gap-4 w-full lg:max-w-lg xl:max-w-xl">
                <router-link :to="{ name: 'ChoosePatient', params: { examFormat: 'daily-round' } }">
                    <li class="border rounded shadow text-center bg-white p-4">Ronda diária</li>
                </router-link>
                <router-link
                    :to="{ name: 'ChoosePatient', params: { examFormat: 'choose-parameters' } }"
                >
                    <li class="border rounded shadow text-center bg-white p-4">
                        Monitorização continuada
                    </li>
                </router-link>
            </ul>
        </nav>
    </main>
    <Footer />
</template>
