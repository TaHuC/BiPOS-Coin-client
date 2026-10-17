<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Firmware (OTA)</div>
      <q-space />
      <q-btn color="primary" icon="refresh" label="Обнови" :loading="loading" @click="load" />
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Качен образ на сървъра</div>
        <div v-if="firmware" class="q-gutter-xs">
          <div>
            Версия: <strong>{{ firmware.version }}</strong>
          </div>
          <div class="text-caption text-grey-6">
            {{ formatBytes(firmware.size) }} · SHA256 {{ shortSha(firmware.sha256) }} ·
            {{ formatTime(firmware.uploadedAt) }}
          </div>
          <div class="text-caption text-grey-6">файл: {{ firmware.originalName }}</div>
        </div>
        <div v-else class="text-grey-6">Няма качен .bin — първо качи firmware.</div>
      </q-card-section>
      <q-card-actions align="left" class="q-gutter-sm">
        <q-btn
          v-if="firmware"
          color="positive"
          outline
          label="Обнови всички остарели"
          :loading="queuingAll"
          @click="queueOutdated"
        />
        <q-btn
          v-if="firmware"
          color="negative"
          flat
          label="Изтрий образа"
          @click="removeFirmware"
        />
      </q-card-actions>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Качване на нов .bin</div>
        <div class="text-caption text-grey-6 q-mb-md">
          Билд от PlatformIO (`firmware.bin`, ~1–1.5 MB). Версията = <code>BIPOS_FW_VERSION</code>.
          Ако качването даде 413 — в nginx: <code>client_max_body_size 8m;</code> и
          <code>nginx -s reload</code>. Устройствата дърпат през HTTPS при idle (~30 s).
        </div>
        <q-input
          v-model="version"
          label="Версия (напр. 1.2.0)"
          filled
          dense
          class="q-mb-sm"
          style="max-width: 280px"
        />
        <q-file
          v-model="file"
          label="firmware.bin"
          filled
          dense
          accept=".bin,application/octet-stream"
          style="max-width: 420px"
          class="q-mb-md"
        />
        <q-btn
          color="primary"
          label="Качи"
          :loading="uploading"
          :disable="!file || !version.trim()"
          @click="upload"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'

const $q = useQuasar()
const auth = useAuthStore()
auth.hydrate()

const loading = ref(false)
const uploading = ref(false)
const queuingAll = ref(false)
const firmware = ref(null)
const file = ref(null)
const version = ref('')

function formatBytes(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  return `${(b / 1024).toFixed(1)} KB`
}
function shortSha(s) {
  if (!s) return '—'
  return `${s.slice(0, 12)}…`
}
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/api/admin/firmware', { headers: auth.headers })
    firmware.value = data.firmware || null
    if (firmware.value?.version && !version.value) {
      version.value = firmware.value.version
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    loading.value = false
  }
}

async function upload() {
  if (!file.value || !version.value.trim()) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file.value)
    fd.append('version', version.value.trim())
    const { data } = await api.post('/api/admin/firmware', fd, {
      headers: auth.headers
    })
    firmware.value = data.firmware
    file.value = null
    $q.notify({ type: 'positive', message: `Качено ${data.firmware.version}` })
  } catch (e) {
    const status = e?.response?.status
    const err = e?.response?.data?.error
    let message = 'Качването неуспешно'
    if (status === 413) {
      message =
        'Файлът е твърде голям (413). В nginx сложи: client_max_body_size 8m; и reload.'
    } else if (err === 'only_bin') {
      message = 'Само .bin файлове'
    } else if (err === 'too_large') {
      message = 'Файлът надвишава 4 MB лимита на API'
    }
    $q.notify({ type: 'negative', message })
  } finally {
    uploading.value = false
  }
}

function removeFirmware() {
  $q.dialog({
    title: 'Изтрий firmware',
    message: 'Премахва образа и отменя чакащи OTA заявки.',
    cancel: true,
    ok: { label: 'Изтрий', color: 'negative' }
  }).onOk(async () => {
    try {
      await api.delete('/api/admin/firmware', { headers: auth.headers })
      firmware.value = null
      $q.notify({ type: 'positive', message: 'Изтрито' })
    } catch {
      $q.notify({ type: 'negative', message: 'Неуспешно' })
    }
  })
}

function queueOutdated() {
  $q.dialog({
    title: 'OTA за остарели',
    message: `Пускане на OTA към ${firmware.value?.version} за всички устройства с различна FW?`,
    cancel: true,
    ok: { label: 'Пусни', color: 'positive' }
  }).onOk(async () => {
    queuingAll.value = true
    try {
      const { data } = await api.post(
        '/api/admin/devices/ota-outdated',
        {},
        { headers: auth.headers }
      )
      $q.notify({
        type: 'positive',
        message: `Опашка: ${data.queued} устройства → ${data.targetVersion}`
      })
    } catch {
      $q.notify({ type: 'negative', message: 'Неуспешно' })
    } finally {
      queuingAll.value = false
    }
  })
}

onMounted(load)
</script>
