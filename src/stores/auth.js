import { defineStore, acceptHMRUpdate } from 'pinia'
import { api } from 'boot/axios'

function persist(state) {
  localStorage.setItem(
    'bipos-auth',
    JSON.stringify({
      user: state.user,
      pass: state.pass,
      role: state.role,
      name: state.name,
      userId: state.userId,
      permissions: state.permissions
    })
  )
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: '',
    pass: '',
    role: '',
    name: '',
    userId: null,
    permissions: null
  }),
  getters: {
    isLoggedIn: (s) => !!(s.user && s.pass),
    isAdmin: (s) => s.role === 'admin',
    headers: (s) => ({
      'x-admin-user': s.user,
      'x-admin-pass': s.pass
    }),
    can: (s) => (key) => {
      if (s.role === 'admin') return true
      return !!(s.permissions && s.permissions[key])
    }
  },
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem('bipos-auth')
        if (!raw) return
        const j = JSON.parse(raw)
        this.user = j.user || ''
        this.pass = j.pass || ''
        this.role = j.role || ''
        this.name = j.name || ''
        this.userId = j.userId ?? null
        this.permissions = j.permissions ?? null
      } catch {
        /* ignore */
      }
    },
    async refreshSession() {
      if (!this.user || !this.pass) return false
      try {
        const { data } = await api.get('/api/admin/me', { headers: this.headers })
        this.role = data.user?.role || ''
        this.name = data.user?.name || this.user
        this.userId = data.user?.id ?? null
        this.permissions = data.user?.permissions ?? null
        persist(this)
        return true
      } catch {
        this.logout()
        return false
      }
    },
    async setup(user, pass, name = '') {
      const { data } = await api.post('/api/admin/setup', { user, pass, name })
      this.user = user
      this.pass = pass
      this.role = data.user?.role || 'admin'
      this.name = data.user?.name || name || user
      this.userId = data.user?.id ?? null
      this.permissions = null
      persist(this)
    },
    async login(user, pass) {
      const { data } = await api.post('/api/admin/login', { user, pass })
      this.user = user
      this.pass = pass
      this.role = data.user?.role || ''
      this.name = data.user?.name || user
      this.userId = data.user?.id ?? null
      this.permissions = data.user?.permissions ?? null
      persist(this)
    },
    logout() {
      this.user = ''
      this.pass = ''
      this.role = ''
      this.name = ''
      this.userId = null
      this.permissions = null
      localStorage.removeItem('bipos-auth')
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
