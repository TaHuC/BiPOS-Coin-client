import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Same-origin /api/ (nginx proxy) — like other BiPOS systems.
// Optional override: API_URL=https://host when UI and API are on different origins.
const api = axios.create({
  baseURL: process.env.API_URL || '',
  timeout: 15000
})

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
