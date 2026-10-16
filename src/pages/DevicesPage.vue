<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Устройства</div>
      <q-space />
      <div class="text-caption text-grey-6 q-mr-md">автоматично на всеки 15 s</div>
      <q-btn color="primary" icon="refresh" label="Обнови" :loading="loading" @click="() => load()" />
    </div>

    <q-table
      flat
      bordered
      row-key="id"
      :rows="devices"
      :columns="columns"
      :loading="loading"
      no-data-label="Няма регистрирани модули"
    >
      <template #body-cell-priceCents="props">
        <q-td :props="props">{{ euro(props.row.priceCents) }}</q-td>
      </template>
      <template #body-cell-pulseCents="props">
        <q-td :props="props">{{ euro(props.row.pulseCents) }}</q-td>
      </template>
      <template #body-cell-lastCredit="props">
        <q-td :props="props">{{ euro(props.row.lastCredit) }}</q-td>
      </template>
      <template #body-cell-cashCents="props">
        <q-td :props="props">
          <strong>{{ euro(props.row.cashCents) }}</strong>
        </q-td>
      </template>
      <template #body-cell-passageCount="props">
        <q-td :props="props">{{ props.row.passageCount ?? 0 }}</q-td>
      </template>
      <template #body-cell-clientName="props">
        <q-td :props="props">{{ props.row.clientName || '—' }}</q-td>
      </template>
      <template #body-cell-lastSeen="props">
        <q-td :props="props">{{ formatTime(props.row.lastSeen) }}</q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn dense flat color="primary" label="Настройки" @click="openSettings(props.row)" />
          <q-btn
            v-if="canCashout"
            dense
            flat
            color="orange"
            label="Инкасо"
            :disable="!(props.row.cashCents > 0)"
            @click="cashout(props.row)"
          />
          <q-btn
            v-if="canRestart"
            dense
            flat
            color="negative"
            label="Рестарт"
            @click="restartDevice(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dlg" persistent>
      <q-card style="min-width: 520px; max-width: 96vw">
        <q-card-section>
          <div class="text-h6">Настройки · {{ form.id }}</div>
          <div class="text-caption text-grey-6">Промените се дърпат от модула на ~2 мин</div>
          <div v-if="auth.isAdmin && form.token" class="text-caption q-mt-xs">
            Device token: <code>{{ form.token }}</code>
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-sm" style="max-height: 70vh; overflow: auto">
          <q-input
            v-model="form.name"
            label="Име на устройството"
            hint="напр. Вход А / Паркинг 1 — за лесно разпознаване"
            filled
            dense
            :disable="!fieldOk('name')"
          />

          <q-select
            v-if="auth.isAdmin"
            v-model="form.clientId"
            :options="clientOptions"
            label="Клиент"
            filled
            dense
            emit-value
            map-options
            clearable
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="form.priceCents"
                type="number"
                label="Цена (центове)"
                hint="100 = 1.00 €"
                filled
                dense
                :disable="!fieldOk('priceCents')"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.pulseCents"
                type="number"
                label="1 импулс (центове)"
                hint="10 = 0.10 €"
                filled
                dense
                :disable="!fieldOk('pulseCents')"
              />
            </div>
          </div>

          <q-select
            v-model="form.overpayMode"
            :options="overpayOptions"
            label="Надвнесени пари"
            filled
            dense
            emit-value
            map-options
            :disable="!fieldOk('overpayMode')"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="form.relayMs"
                type="number"
                label="Реле ON (ms)"
                filled
                dense
                :disable="!fieldOk('relayMs')"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.coinDebounceMs"
                type="number"
                label="Монета debounce (ms)"
                hint="като паркинга: 80"
                filled
                dense
                :disable="!fieldOk('coinDebounceMs')"
              />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="form.unlockDelayMs"
                type="number"
                label="Забавяне преди отключване (ms)"
                filled
                dense
                :disable="!fieldOk('unlockDelayMs')"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.nextUnlockDelayMs"
                type="number"
                label="Пауза преди следващо (ms)"
                filled
                dense
                :disable="!fieldOk('nextUnlockDelayMs')"
              />
            </div>
          </div>

          <q-select
            v-model="form.sensorType"
            :options="sensorOptions"
            label="Датчик преминаване"
            filled
            dense
            emit-value
            map-options
            :disable="!fieldOk('sensorType')"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="form.passageMinMs"
                type="number"
                label="Датчик мин. активен (ms)"
                filled
                dense
                :disable="!fieldOk('passageMinMs')"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.passageDebounceMs"
                type="number"
                label="Датчик debounce (ms)"
                filled
                dense
                :disable="!fieldOk('passageDebounceMs')"
              />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="form.passageIgnoreMs"
                type="number"
                label="Игнор след отключване (ms)"
                filled
                dense
                :disable="!fieldOk('passageIgnoreMs')"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.passageTimeoutMs"
                type="number"
                label="Чакане / таймер (ms)"
                hint="при Изключен датчик = авто освобождаване · 0 = веднага"
                filled
                dense
                :disable="!fieldOk('passageTimeoutMs')"
              />
            </div>
          </div>

          <q-input
            v-model.number="form.creditClearMin"
            type="number"
            label="Нулиране на кредит (минути)"
            hint="0 = изключено · неизползван кредит се чисти след N мин"
            filled
            dense
            :disable="!fieldOk('creditClearMin')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Отказ" v-close-popup />
          <q-btn color="primary" label="Запази" :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'

const REFRESH_MS = 15000

const $q = useQuasar()
const auth = useAuthStore()
auth.hydrate()

const loading = ref(false)
let refreshTimer = null
const saving = ref(false)
const devices = ref([])
const clients = ref([])
const dlg = ref(false)
const form = ref({})
const allowedFields = ref([])

const overpayOptions = [
  { label: 'Кредит за следващ', value: 0 },
  { label: 'Множество входове', value: 1 },
  { label: 'Изчистване', value: 2 }
]
const sensorOptions = [
  { label: 'NO (контакт)', value: 0 },
  { label: 'NC (контакт)', value: 1 },
  { label: 'Изключен (само таймер)', value: 2 }
]

const columns = computed(() => {
  const cols = [
    { name: 'id', label: 'ID', field: 'id', align: 'left' },
    { name: 'name', label: 'Име', field: 'name', align: 'left' }
  ]
  if (auth.isAdmin) {
    cols.push({ name: 'clientName', label: 'Клиент', field: 'clientName', align: 'left' })
  }
  cols.push(
    { name: 'priceCents', label: 'Цена', field: 'priceCents', align: 'right' },
    { name: 'pulseCents', label: '1 импулс', field: 'pulseCents', align: 'right' },
    { name: 'cashCents', label: 'Натрупано', field: 'cashCents', align: 'right' },
    { name: 'passageCount', label: 'Преминавания', field: 'passageCount', align: 'right' },
    { name: 'lastCredit', label: 'Кредит', field: 'lastCredit', align: 'right' },
    { name: 'lastSeen', label: 'Последно', field: 'lastSeen', align: 'left' },
    { name: 'actions', label: '', field: 'actions', align: 'right' }
  )
  return cols
})

const canCashout = computed(() => auth.isAdmin || auth.can('canCashout'))
const canRestart = computed(() => auth.isAdmin || auth.can('canRestart'))

const clientOptions = computed(() =>
  clients.value.map((c) => ({ label: `${c.name || c.username} (${c.username})`, value: c.id }))
)

function euro(cents) {
  return `${((Number(cents) || 0) / 100).toFixed(2)} €`
}
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}
function fieldOk(key) {
  if (auth.isAdmin) return true
  return allowedFields.value.includes(key)
}

async function load({ quiet = false } = {}) {
  if (!quiet) loading.value = true
  try {
    const { data } = await api.get('/api/admin/devices', { headers: auth.headers })
    devices.value = data.devices || []
    if (data.permissions) auth.permissions = data.permissions
    if (auth.isAdmin && !quiet) {
      const c = await api.get('/api/admin/clients', { headers: auth.headers })
      clients.value = c.data.clients || []
    }
  } catch {
    if (!quiet) $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    if (!quiet) loading.value = false
  }
}

async function openSettings(row) {
  try {
    const { data } = await api.get(`/api/admin/devices/${row.id}`, { headers: auth.headers })
    const d = data.device
    allowedFields.value = data.allowedFields || []
    form.value = {
      id: d.id,
      token: d.token || '',
      name: d.name || '',
      clientId: d.clientId,
      priceCents: d.priceCents,
      pulseCents: d.pulseCents,
      overpayMode: d.overpayMode,
      relayMs: d.relayMs,
      unlockDelayMs: d.unlockDelayMs,
      nextUnlockDelayMs: d.nextUnlockDelayMs,
      passageMinMs: d.passageMinMs,
      passageDebounceMs: d.passageDebounceMs,
      passageIgnoreMs: d.passageIgnoreMs,
      passageTimeoutMs: d.passageTimeoutMs,
      coinDebounceMs: d.coinDebounceMs,
      sensorType: d.sensorType,
      creditClearMin: d.creditClearMin ?? 0
    }
    dlg.value = true
  } catch {
    $q.notify({ type: 'negative', message: 'Не мога да отворя настройките' })
  }
}

async function save() {
  saving.value = true
  try {
    const body = { ...form.value }
    delete body.id
    delete body.token
    if (!auth.isAdmin) delete body.clientId
    await api.patch(`/api/admin/devices/${form.value.id}`, body, { headers: auth.headers })
    $q.notify({ type: 'positive', message: 'Запазено — модулът ще ги вземе при следващ config pull' })
    dlg.value = false
    load()
  } catch (e) {
    const msg = e?.response?.data?.error === 'pulse_min' ? 'Импулс ≥ 1 цент' : 'Неуспешен запис'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    saving.value = false
  }
}

async function cashout(row) {
  $q.dialog({
    title: 'Инкасо',
    message: `Нулиране на натрупаната сума за „${row.name || row.id}“?\nТекущо: ${euro(row.cashCents)}`,
    cancel: true,
    persistent: true,
    ok: { label: 'Инкасо', color: 'orange' }
  }).onOk(async () => {
    try {
      const { data } = await api.post(
        `/api/admin/devices/${row.id}/cashout`,
        {},
        { headers: auth.headers }
      )
      $q.notify({
        type: 'positive',
        message: `Инкасирано ${euro(data.cashoutCents)}`
      })
      load()
    } catch {
      $q.notify({ type: 'negative', message: 'Инкасо неуспешно' })
    }
  })
}

async function restartDevice(row) {
  $q.dialog({
    title: 'Рестарт',
    message: `Рестарт на „${row.name || row.id}“?\nМодулът ще рестартира при следващ heartbeat (~30 s), ако sync е включен.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Рестарт', color: 'negative' }
  }).onOk(async () => {
    try {
      await api.post(`/api/admin/devices/${row.id}/restart`, {}, { headers: auth.headers })
      $q.notify({ type: 'positive', message: 'Рестартът е заявен — изчакай ~30 s' })
    } catch {
      $q.notify({ type: 'negative', message: 'Неуспешна заявка' })
    }
  })
}

onMounted(() => {
  load()
  refreshTimer = setInterval(() => {
    if (!dlg.value) load({ quiet: true })
  }, REFRESH_MS)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
