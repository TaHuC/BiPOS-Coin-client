<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-secondary text-white">
      <q-toolbar>
        <q-toolbar-title>
          BiPOS Coin
          <span class="text-caption text-grey-4 q-ml-sm">UI {{ uiVersion }}</span>
        </q-toolbar-title>
        <q-btn flat label="Устройства" :to="{ name: 'devices' }" />
        <q-btn
          v-if="auth.can('canViewStats')"
          flat
          label="Статистики"
          :to="{ name: 'stats' }"
        />
        <q-btn
          v-if="auth.can('canViewStats')"
          flat
          label="Транзакции"
          :to="{ name: 'transactions' }"
        />
        <q-btn
          v-if="auth.isAdmin"
          flat
          label="Клиенти"
          :to="{ name: 'clients' }"
        />
        <q-space />
        <div class="q-mr-md text-caption">
          {{ auth.name || auth.user }}
          <span class="text-grey-4">({{ auth.isAdmin ? 'админ' : 'клиент' }})</span>
        </div>
        <q-btn flat icon="logout" label="Изход" @click="onLogout" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-dark text-grey-5" bordered>
      <q-toolbar dense class="text-caption">
        <span>UI {{ uiVersion }}</span>
        <span class="q-mx-sm">·</span>
        <span>API {{ apiVersion || '…' }}</span>
        <span class="q-mx-sm">·</span>
        <span>FW очаквана {{ latestFw || '…' }}</span>
        <q-space />
        <span v-if="apiOk === false" class="text-negative">API недостъпен</span>
        <span v-else-if="apiOk" class="text-positive">API OK</span>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { api } from 'boot/axios'

const router = useRouter()
const auth = useAuthStore()
auth.hydrate()

const uiVersion = process.env.APP_VERSION || '—'
const apiVersion = ref('')
const latestFw = ref('')
const apiOk = ref(null)

provide('latestFw', latestFw)
provide('apiVersion', apiVersion)
provide('uiVersion', uiVersion)

onMounted(async () => {
  const ok = await auth.refreshSession()
  if (!ok) {
    router.push({ name: 'login' })
    return
  }
  try {
    const { data } = await api.get('/api/health')
    apiVersion.value = data.version || '—'
    latestFw.value = data.latestFw || ''
    apiOk.value = true
  } catch {
    apiOk.value = false
  }
})

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
