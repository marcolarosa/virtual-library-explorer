import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Lara from '@primevue/themes/lara'
import 'primeicons/primeicons.css'
import App from './App.vue'
import './main.css'

const app = createApp(App)
app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: {
      darkModeSelector: 'light',
    }
  }
})
app.mount('#app' as const)
