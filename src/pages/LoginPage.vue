<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-dark">
        <q-card class="q-pa-md" style="width: 360px; max-width: 92vw">
          <q-card-section>
            <div class="text-h5">BiPOS Coin</div>
            <div class="text-caption text-grey-5">Вход (админ / клиент)</div>
          </q-card-section>
          <q-card-section>
            <q-input v-model="user" label="Потребител" filled dense class="q-mb-sm" />
            <q-input
              v-model="pass"
              label="Парола"
              type="password"
              filled
              dense
              @keyup.enter="submit"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn color="primary" label="Вход" :loading="loading" @click="submit" />
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

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const user = ref('admin')
const pass = ref('SisCom2011')
const loading = ref(false)

onMounted(() => {
  auth.hydrate()
  if (auth.isLoggedIn) router.replace({ name: 'devices' })
})

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
