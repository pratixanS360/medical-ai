import { createRouter, createWebHistory } from 'vue-router'

import AiPrompt from '@/components/AiPrompt.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AiPrompt
    }
  ]
})

export default router
