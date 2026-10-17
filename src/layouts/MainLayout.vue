<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-secondary text-white">
      <q-toolbar class="main-toolbar">
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="lt-md"
          aria-label="Меню"
          @click="leftDrawer = !leftDrawer"
        />
        <q-toolbar-title shrink class="ellipsis">
          BiPOS Coin
          <span class="text-caption text-grey-4 q-ml-sm gt-xs">UI {{ uiVersion }}</span>
        </q-toolbar-title>

        <nav class="gt-sm row items-center no-wrap q-gutter-xs">
          <q-btn flat no-caps label="Устройства" :to="{ name: 'devices' }" />
          <q-btn
            v-if="auth.can('canViewStats')"
            flat
            no-caps
            label="Статистики"
            :to="{ name: 'stats' }"
          />
          <q-btn
            v-if="auth.can('canViewStats')"
            flat
            no-caps
            label="Транзакции"
            :to="{ name: 'transactions' }"
          />
          <q-btn
            v-if="auth.isAdmin"
            flat
            no-caps
            label="Firmware"
            :to="{ name: 'firmware' }"
          />
          <q-btn
            v-if="auth.isAdmin"
            flat
            no-caps
            label="Клиенти"
            :to="{ name: 'clients' }"
          />
        </nav>

        <q-space />
        <div class="q-mr-sm text-caption ellipsis gt-xs user-chip">
          {{ auth.name || auth.user }}
          <span class="text-grey-4">({{ auth.isAdmin ? 'админ' : 'клиент' }})</span>
        </div>
        <q-btn flat dense icon="logout" :label="$q.screen.gt.xs ? 'Изход' : undefined" @click="onLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawer"
      bordered
      overlay
      :width="280"
      class="bg-dark text-white"
      :breakpoint="1023"
    >
      <q-list padding>
        <q-item-label header class="text-grey-5">Навигация</q-item-label>
        <q-item
          v-for="item in navItems"
          :key="item.name"
          clickable
          v-ripple
          :to="{ name: item.name }"
          active-class="bg-primary text-white"
          @click="leftDrawer = false"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
        <q-separator dark class="q-my-sm" />
        <q-item>
          <q-item-section>
            <q-item-label>{{ auth.name || auth.user }}</q-item-label>
            <q-item-label caption class="text-grey-5">
              {{ auth.isAdmin ? 'админ' : 'клиент' }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="onLogout">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>Изход</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-dark text-grey-5" bordered>
      <q-toolbar dense class="text-caption footer-bar">
        <span>UI {{ uiVersion }}</span>
        <span class="q-mx-xs">·</span>
        <span>API {{ apiVersion || '…' }}</span>
        <span class="q-mx-xs">·</span>
        <span>FW {{ latestFw || '…' }}</span>
        <q-space />
        <span v-if="apiOk === false" class="text-negative">API недостъпен</span>
        <span v-else-if="apiOk" class="text-positive">API OK</span>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import { api } from 'boot/axios'

const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
auth.hydrate()

const leftDrawer = ref(false)
const uiVersion = process.env.APP_VERSION || '—'
const apiVersion = ref('')
const latestFw = ref('')
const apiOk = ref(null)

const navItems = computed(() => {
  const items = [{ name: 'devices', label: 'Устройства', icon: 'devices' }]
  if (auth.can('canViewStats')) {
    items.push(
      { name: 'stats', label: 'Статистики', icon: 'bar_chart' },
      { name: 'transactions', label: 'Транзакции', icon: 'receipt_long' }
    )
  }
  if (auth.isAdmin) {
    items.push(
      { name: 'firmware', label: 'Firmware', icon: 'system_update' },
      { name: 'clients', label: 'Клиенти', icon: 'people' }
    )
  }
  return items
})

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
  leftDrawer.value = false
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.user-chip {
  max-width: 160px;
}
.footer-bar {
  flex-wrap: wrap;
  min-height: auto;
  row-gap: 2px;
}
.main-toolbar {
  min-height: 48px;
}
</style>
