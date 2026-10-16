<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-dark">
        <q-card class="q-pa-md" style="width: 360px; max-width: 92vw">
          <q-card-section>
            <div class="text-h5">BiPOS Coin</div>
            <div class="text-caption text-grey-5">
              {{ needsSetup ? 'Първоначална настройка — създай администратор' : 'Вход (админ / клиент)' }}
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">
              UI {{ uiVersion }}
              <span v-if="apiVersion"> · API {{ apiVersion }}</span>
              <span v-if="latestFw"> · FW {{ latestFw }}</span>
            </div>
          </q-card-section>
          <q-card-section v-if="statusLoaded">
            <!-- decoy fields: browsers autofill these instead of the real inputs -->
            <div aria-hidden="true" style="position: absolute; left: -9999px; height: 0; overflow: hidden">
              <input type="text" tabindex="-1" autocomplete="username" />
              <input type="password" tabindex="-1" autocomplete="current-password" />
            </div>
            <q-input
              v-if="needsSetup"
              v-model="name"
              label="Име (по избор)"
              filled
              dense
              class="q-mb-sm"
              autocomplete="off"
              name="bipos-display-name"
            />
            <q-input
              v-model="user"
              label="Потребител"
              filled
              dense
              class="q-mb-sm"
              autocomplete="off"
              name="bipos-login-user"
              :readonly="lockAutofill"
              @focus="lockAutofill = false"
            />
            <q-input
              v-model="pass"
              label="Парола"
              type="password"
              filled
              dense
              class="q-mb-sm"
              autocomplete="off"
              name="bipos-login-pass"
              :readonly="lockAutofill"
              @focus="lockAutofill = false"
              @keyup.enter="needsSetup ? setup() : submit()"
            />
            <q-input
              v-if="needsSetup"
              v-model="pass2"
              label="Повтори парола"
              type="password"
              filled
              dense
              autocomplete="off"
              name="bipos-login-pass2"
              @keyup.enter="setup"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              v-if="needsSetup"
              color="primary"
              label="Създай админ"
              :loading="loading"
              :disable="!statusLoaded"
              @click="setup"
            />
            <q-btn
              v-else
              color="primary"
              label="Вход"
              :loading="loading"
              :disable="!statusLoaded"
              @click="submit"
            />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import { api } from 'boot/axios'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const user = ref('')
const pass = ref('')
const pass2 = ref('')
const name = ref('')
const loading = ref(false)
const needsSetup = ref(false)
const statusLoaded = ref(false)
const lockAutofill = ref(true)
const uiVersion = process.env.APP_VERSION || '—'
const apiVersion = ref('')
const latestFw = ref('')

onMounted(async () => {
  auth.hydrate()
  user.value = ''
  pass.value = ''
  pass2.value = ''
  name.value = ''
  try {
    const health = await api.get('/api/health')
    apiVersion.value = health.data.version || ''
    latestFw.value = health.data.latestFw || ''
  } catch {
    /* ignore */
  }
  try {
    const { data } = await api.get('/api/admin/setup-status')
    needsSetup.value = !!data.needsSetup
  } catch {
    needsSetup.value = false
  }
  statusLoaded.value = true
  // unlock after paint so Chrome doesn't paste saved admin/pass
  setTimeout(() => {
    lockAutofill.value = false
  }, 400)
  if (!needsSetup.value && auth.isLoggedIn) {
    router.replace({ name: 'devices' })
  }
})

async function setup() {
  if (user.value.trim().length < 3) {
    $q.notify({ type: 'negative', message: 'Потребител мин. 3 символа' })
    return
  }
  if (pass.value.length < 6) {
    $q.notify({ type: 'negative', message: 'Парола мин. 6 символа' })
    return
  }
  if (pass.value !== pass2.value) {
    $q.notify({ type: 'negative', message: 'Паролите не съвпадат' })
    return
  }
  loading.value = true
  try {
    await auth.setup(user.value.trim(), pass.value, name.value.trim())
    $q.notify({ type: 'positive', message: 'Администраторът е създаден' })
    router.push({ name: 'devices' })
  } catch (e) {
    const err = e?.response?.data?.error
    const msg =
      err === 'already_initialized'
        ? 'Системата вече е инициализирана'
        : err === 'username_taken'
          ? 'Потребителят е зает'
          : 'Неуспешна настройка'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}

async function submit() {
  loading.value = true
  try {
    await auth.login(user.value, pass.value)
    router.push({ name: 'devices' })
  } catch {
    $q.notify({ type: 'negative', message: 'Грешни данни' })
  } finally {
    loading.value = false
  }
}
</script>
