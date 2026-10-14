import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory
} from 'vue-router'
import routes from './routes'

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  Router.beforeEach(async (to, _from, next) => {
    const raw = localStorage.getItem('bipos-auth')
    let authed = false
    try {
      if (raw) {
        const j = JSON.parse(raw)
        authed = !!(j.user && j.pass)
      }
    } catch {
      authed = false
    }
    if (to.meta.requiresAuth && !authed) {
      next({ name: 'login' })
      return
    }
    if (to.name === 'login' && authed) {
      next({ name: 'devices' })
      return
    }
    // adminOnly checked after session refresh in layout; soft check from storage
    if (to.meta.adminOnly) {
      try {
        const j = raw ? JSON.parse(raw) : {}
        if (j.role && j.role !== 'admin') {
          next({ name: 'devices' })
          return
        }
      } catch {
        /* allow; layout refresh will correct */
      }
    }
    next()
  })

  return Router
})
