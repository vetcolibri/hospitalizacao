import { createRouter, createWebHistory } from 'vue-router'

import ExamGeneralCondition from '@/views/ExamGeneralCondition.vue'

const routes = [
    {
        path: '/',
        name: 'ExamGeneralCondition',
        component: ExamGeneralCondition
    },
    {
        path: '/choose-patient/:examFormat',
        name: 'ChoosePatient',
        component: () => import('@/views/ChoosePatient.vue')
    },
    {
        path: '/daily-round/:patientId',
        name: 'DailyRound',
        component: () => import('@/views/DailyRound.vue')
    },
    {
        path: '/continuous-monitoring/:patientId/',
        name: 'ContinuousMonitoring',
        component: () => import('@/views/ContinuousMonitoring.vue')
    },
    {
        path: '/schedule-alert/:patientId/',
        name: 'ScheduleAlert',
        component: () => import('@/views/ScheduleAlert.vue')
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
