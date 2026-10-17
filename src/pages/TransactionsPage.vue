<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-col-gutter-sm">
      <div class="col-auto text-h6">Транзакции</div>
      <q-space />
      <div class="col-12 col-sm-3">
        <q-select
          v-model="deviceFilter"
          :options="deviceOptions"
          label="Устройство"
          dense
          outlined
          emit-value
          map-options
          clearable
          @update:model-value="load"
        />
      </div>
      <div class="col-12 col-sm-3">
        <q-select
          v-model="period"
          :options="periodOptions"
          label="Период"
          dense
          outlined
          emit-value
          map-options
          @update:model-value="load"
        />
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Обнови" :loading="loading" @click="() => load()" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">Натрупано до инкасо</div>
            <div class="text-h5">{{ euro(openCashCents) }}</div>
            <div class="text-caption text-grey-6">отворени монетни транзакции</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-8 flex flex-center">
        <div class="text-caption text-grey-6">
          При <strong>Инкасо</strong> отворените транзакции се връзват към него.
          Админът може да изтрива (за тестове) — при отворена монета се намалява натрупаното.
        </div>
      </div>
    </div>

    <q-table
      flat
      bordered
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      no-data-label="Няма транзакции"
    >
      <template #body-cell-createdAt="props">
        <q-td :props="props">{{ formatTime(props.row.createdAt) }}</q-td>
      </template>
      <template #body-cell-type="props">
        <q-td :props="props">{{ labelType(props.row.type) }}</q-td>
      </template>
      <template #body-cell-value="props">
        <q-td :props="props">
          {{
            props.row.type === 'coin' || props.row.type === 'cashout'
              ? euro(props.row.value)
              : props.row.value
          }}
        </q-td>
      </template>
      <template #body-cell-period="props">
        <q-td :props="props">
          <q-badge
            v-if="props.row.type === 'cashout'"
            color="orange"
            :label="`Инкасо #${props.row.id}`"
          />
          <q-badge
            v-else-if="props.row.cashoutId"
            color="blue-grey"
            :label="`#${props.row.cashoutId}`"
          />
          <q-badge v-else color="positive" label="отворена" />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="auth.isAdmin"
            dense
            flat
            color="negative"
            icon="delete"
            :loading="deletingId === props.row.id"
            @click="remove(props.row)"
          >
            <q-tooltip>Изтрий (тест / корекция)</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
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
const deletingId = ref(null)
let refreshTimer = null
const rows = ref([])
const devices = ref([])
const deviceFilter = ref(null)
const period = ref('open')
const openCashCents = ref(0)

const periodOptions = [
  { label: 'До инкасо (отворени)', value: 'open' },
  { label: 'След инкасо', value: 'cashed' },
  { label: 'Всички', value: 'all' }
]

const typeLabels = {
  coin: 'Монета',
  unlock: 'Отключване',
  passage: 'Преминаване',
  passage_timeout: 'Таймаут датчик',
  relay_on: 'Реле ON',
  credit_clear: 'Изчистен кредит',
  credit_idle_clear: 'Авто нулиране кредит',
  force_unlock: 'Ръчно отключване',
  unlock_wait: 'Чака отключване',
  unlock_wait_next: 'Чака следващо',
  passage_auto: 'Авто (без датчик)',
  cashout: 'Инкасо',
  restart_request: 'Рестарт',
  remote_unlock: 'Отдалечено отключване',
  ota_request: 'OTA заявка'
}

const columns = computed(() => {
  const cols = [
    { name: 'createdAt', label: 'Време', field: 'createdAt', align: 'left' },
    { name: 'deviceName', label: 'Устройство', field: 'deviceName', align: 'left' },
    { name: 'type', label: 'Тип', field: 'type', align: 'left' },
    { name: 'value', label: 'Стойност', field: 'value', align: 'right' },
    { name: 'period', label: 'Инкасо', field: 'cashoutId', align: 'left' }
  ]
  if (auth.isAdmin) {
    cols.push({ name: 'actions', label: '', field: 'actions', align: 'right' })
  }
  return cols
})

const deviceOptions = computed(() =>
  devices.value.map((d) => ({
    label: `${d.name || d.id} (${d.id})`,
    value: d.id
  }))
)

function euro(cents) {
  return `${((Number(cents) || 0) / 100).toFixed(2)} €`
}
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}
function labelType(t) {
  return typeLabels[t] || t
}

async function loadDevices() {
  try {
    const { data } = await api.get('/api/admin/devices', { headers: auth.headers })
    devices.value = data.devices || []
  } catch {
    /* ignore */
  }
}

async function load({ quiet = false } = {}) {
  if (!quiet) loading.value = true
  try {
    const params = { period: period.value, limit: 300 }
    if (deviceFilter.value) params.deviceId = deviceFilter.value
    const { data } = await api.get('/api/admin/transactions', {
      headers: auth.headers,
      params
    })
    rows.value = data.transactions || []
    openCashCents.value = data.openCashCents || 0
  } catch {
    if (!quiet) $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    if (!quiet) loading.value = false
  }
}

function remove(row) {
  const isCashout = row.type === 'cashout'
  const msg = isCashout
    ? `Изтриване на инкасо #${row.id}?\nСвързаните транзакции ще станат отново „отворени“ и сумата ще се върне в натрупаното.`
    : row.cashoutId
      ? `Изтриване на ${labelType(row.type)} #${row.id} (вече в инкасо #${row.cashoutId})?\nСамо от историята — натрупаното няма да се пипа.`
      : `Изтриване на ${labelType(row.type)} #${row.id}?\n${
          row.type === 'coin' ? `Натрупаното ще намалее с ${euro(row.value)}.` : ''
        }`

  $q.dialog({
    title: 'Изтриване',
    message: msg,
    cancel: true,
    persistent: true,
    ok: { label: 'Изтрий', color: 'negative' }
  }).onOk(async () => {
    deletingId.value = row.id
    try {
      await api.delete(`/api/admin/events/${row.id}`, { headers: auth.headers })
      $q.notify({ type: 'positive', message: 'Изтрито' })
      await load({ quiet: true })
    } catch {
      $q.notify({ type: 'negative', message: 'Неуспешно изтриване' })
    } finally {
      deletingId.value = null
    }
  })
}

onMounted(async () => {
  await loadDevices()
  await load()
  refreshTimer = setInterval(() => load({ quiet: true }), REFRESH_MS)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
