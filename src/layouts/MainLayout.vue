<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-secondary text-white">
      <q-toolbar>
        <q-toolbar-title>BiPOS Coin</q-toolbar-title>
        <q-btn flat label="Устройства" :to="{ name: 'devices' }" />
        <q-btn
          v-if="auth.can('canViewStats')"
          flat
          label="Статистики"
          :to="{ name: 'stats' }"
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
  </q-layout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const auth = useAuthStore()
auth.hydrate()

onMounted(async () => {
  const ok = await auth.refreshSession()
  if (!ok) router.push({ name: 'login' })
})

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
