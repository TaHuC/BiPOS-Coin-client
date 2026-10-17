<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-col-gutter-sm">
      <div class="col-auto text-h6">Статистики</div>
      <q-space />
      <div class="col-12 col-sm-4">
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
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Обнови" :loading="loading" @click="load" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">Натрупано (до инкасо)</div>
            <div class="text-h5">{{ euro(summary.cashCents) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">Преминавания (общо)</div>
            <div class="text-h5">{{ summary.passageCount || 0 }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div v-for="t in totals" :key="t.type" class="col-12 col-sm-4 col-md-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">{{ labelType(t.type) }}</div>
            <div class="text-h5">{{ t.count }}</div>
            <div class="text-caption">сума: {{ euro(t.sumValue) }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Натовареност по часове (последните 7 дни)</div>
        <div class="row items-end q-gutter-xs" style="min-height: 140px">
          <div
            v-for="h in byHour"
            :key="h.hour"
            class="column items-center"
            style="flex: 1; min-width: 18px"
          >
            <div
              class="bg-primary"
              :style="{
                width: '100%',
                maxWidth: '22px',
                height: barHeight(h.total) + 'px',
                borderRadius: '3px 3px 0 0',
                opacity: h.total ? 1 : 0.15
              }"
            >
              <q-tooltip>
                {{ h.hour }}:00 — общо {{ h.total }}
                (монети {{ h.coin }}, преминавания {{ h.passage }}, unlock {{ h.unlock }})
              </q-tooltip>
            </div>
            <div class="text-caption text-grey-6" style="font-size: 10px">{{ h.hour }}</div>
          </div>
        </div>
        <div class="text-caption text-grey-6 q-mt-sm">
          Височината = брой събития (монета / преминаване / unlock) в този час.
        </div>
      </q-card-section>
    </q-card>

    <q-table
      flat
      bordered
      title="Последни събития"
      row-key="id"
      :rows="recent"
      :columns="columns"
      :loading="loading"
    >
      <template #body-cell-createdAt="props">
        <q-td :props="props">{{ formatTime(props.row.createdAt) }}</q-td>
      </template>
      <template #body-cell-type="props">
        <q-td :props="props">{{ labelType(props.row.type) }}</q-td>
      </template>
      <template #body-cell-creditCents="props">
        <q-td :props="props">{{ euro(props.row.creditCents) }}</q-td>
      </template>
      <template #body-cell-cashoutId="props">
        <q-td :props="props">
          <q-badge v-if="props.row.type === 'cashout'" color="orange" :label="`#${props.row.id}`" />
          <q-badge v-else-if="props.row.cashoutId" color="blue-grey" :label="`#${props.row.cashoutId}`" />
          <span v-else class="text-grey-6">—</span>
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
let refreshTimer = null
const totals = ref([])
const recent = ref([])
const byHour = ref([])
const summary = ref({ cashCents: 0, passageCount: 0 })
const devices = ref([])
const deviceFilter = ref(null)

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
  remote_unlock: 'Отдалечено отключване',
  ota_request: 'OTA заявка'
}

const columns = [
  { name: 'createdAt', label: 'Време', field: 'createdAt', align: 'left' },
  { name: 'deviceId', label: 'Устройство', field: 'deviceId', align: 'left' },
  { name: 'type', label: 'Тип', field: 'type', align: 'left' },
  { name: 'value', label: 'Стойност', field: 'value', align: 'right' },
  { name: 'creditCents', label: 'Кредит', field: 'creditCents', align: 'right' },
  { name: 'cashoutId', label: 'Инкасо', field: 'cashoutId', align: 'left' }
]

const deviceOptions = computed(() =>
  devices.value.map((d) => ({
    label: `${d.name || d.id} (${d.id})`,
    value: d.id
  }))
)

const maxHour = computed(() => Math.max(1, ...byHour.value.map((h) => h.total || 0)))

function euro(cents) {
  return `${((Number(cents) || 0) / 100).toFixed(2)} €`
}
function formatTime(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}
function labelType(t) {
  return typeLabels[t] || t
}
function barHeight(total) {
  return Math.max(4, Math.round((total / maxHour.value) * 110))
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
    const params = {}
    if (deviceFilter.value) params.deviceId = deviceFilter.value
    const { data } = await api.get('/api/admin/stats', { headers: auth.headers, params })
    totals.value = data.totals || []
    recent.value = data.recent || []
    byHour.value = data.byHour || []
    summary.value = data.summary || { cashCents: 0, passageCount: 0 }
  } catch {
    if (!quiet) $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    if (!quiet) loading.value = false
  }
}

onMounted(async () => {
  await loadDevices()
  await load()
  refreshTimer = setInterval(() => {
    load({ quiet: true })
  }, REFRESH_MS)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
