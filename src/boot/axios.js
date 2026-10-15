import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Dev:  http://127.0.0.1:3080  (local API)
// Prod: '' → same-origin /api/... (nginx)
const api = axios.create({
  baseURL: process.env.API_URL || '',
  timeout: 15000
})

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
