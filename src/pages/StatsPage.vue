<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-col-gutter-sm">
      <div class="col-auto text-h6">Статистики</div>
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
          v-model="periodMode"
          :options="periodModeOptions"
          label="Период"
          dense
          outlined
          emit-value
          map-options
          @update:model-value="onPeriodMode"
        />
      </div>
      <div v-if="periodMode === 'month'" class="col-12 col-sm-2">
        <q-input
          v-model="monthValue"
          type="month"
          label="Месец"
          dense
          outlined
          @update:model-value="load"
        />
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn color="primary" icon="refresh" label="Обнови" :loading="loading" @click="() => load()" />
        <q-btn
          color="negative"
          outline
          icon="picture_as_pdf"
          label="PDF"
          :disable="loading"
          @click="exportPdf"
        />
      </div>
    </div>

    <div class="text-caption text-grey-6 q-mb-md">
      Справка:
      <strong>{{ periodTitle }}</strong>
      <span v-if="deviceLabel"> · {{ deviceLabel }}</span>
    </div>

    <!-- Live cash vs period money -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="bg-orange-1">
          <q-card-section>
            <div class="text-caption text-grey-8">За инкасо сега</div>
            <div class="text-h4 text-orange-10">{{ euro(summary.cashCents) }}</div>
            <div class="text-caption text-grey-7">
              Текуща каса до следващо инкасо (не зависи от периода).
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">Монети в периода</div>
            <div class="text-h5">{{ euro(summary.coinCents) }}</div>
            <div class="text-caption text-grey-6">
              {{ summary.coinCount || 0 }} събития · история
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">Инкасо в периода</div>
            <div class="text-h5">{{ euro(summary.cashoutCents) }}</div>
            <div class="text-caption text-grey-6">
              {{ summary.cashoutCount || 0 }} пъти · преминавания:
              {{ summary.passageCountPeriod || 0 }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="text-subtitle2 q-mb-sm">Събития в периода (брой)</div>
    <div class="text-caption text-grey-6 q-mb-md">
      Пари са само <strong>Монета</strong> и <strong>Инкасо</strong>. „Реле ON“ пази ms, не евро.
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div v-for="t in activityTotals" :key="t.type" class="col-6 col-sm-4 col-md-3">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-5">{{ labelType(t.type) }}</div>
            <div class="text-h5">{{ t.count }}</div>
            <div class="text-caption text-grey-6">{{ formatExtra(t) }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card v-if="byDay.length" flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">По дни</div>
        <q-table
          flat
          dense
          hide-pagination
          :rows="byDay"
          :columns="dayColumns"
          row-key="day"
          :pagination="{ rowsPerPage: 0 }"
        >
          <template #body-cell-coinCents="props">
            <q-td :props="props">{{ euro(props.row.coinCents) }}</q-td>
          </template>
          <template #body-cell-cashoutCents="props">
            <q-td :props="props">{{ euro(props.row.cashoutCents) }}</q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Натовареност по часове</div>
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
      </q-card-section>
    </q-card>

    <q-table
      flat
      bordered
      title="Събития в периода"
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
      <template #body-cell-value="props">
        <q-td :props="props">{{ formatEventValue(props.row.type, props.row.value) }}</q-td>
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
const MONEY_TYPES = new Set(['coin', 'cashout', 'unlock'])
const MS_TYPES = new Set(['relay_on', 'unlock_wait', 'unlock_wait_next', 'passage_timeout'])

const $q = useQuasar()
const auth = useAuthStore()
auth.hydrate()

const loading = ref(false)
let refreshTimer = null
const totals = ref([])
const recent = ref([])
const byHour = ref([])
const byDay = ref([])
const summary = ref({
  cashCents: 0,
  passageCount: 0,
  coinCents: 0,
  coinCount: 0,
  cashoutCents: 0,
  cashoutCount: 0,
  passageCountPeriod: 0,
  unlockCount: 0
})
const devices = ref([])
const deviceFilter = ref(null)
const periodMode = ref('month')
const monthValue = ref(currentMonthStr())

const periodModeOptions = [
  { label: 'Месец', value: 'month' },
  { label: 'Последните 7 дни', value: '7d' },
  { label: 'Предишен месец', value: 'prev' }
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
  remote_unlock: 'Отдалечено отключване',
  remote_clear_credit: 'Отдалечено изчистване кредит',
  ota_request: 'OTA заявка',
  ota_start: 'OTA старт',
  ota_fail: 'OTA грешка',
  restart_request: 'Рестарт'
}

const columns = [
  { name: 'createdAt', label: 'Време', field: 'createdAt', align: 'left' },
  { name: 'deviceId', label: 'Устройство', field: 'deviceId', align: 'left' },
  { name: 'type', label: 'Тип', field: 'type', align: 'left' },
  { name: 'value', label: 'Стойност', field: 'value', align: 'right' },
  { name: 'creditCents', label: 'Кредит след', field: 'creditCents', align: 'right' },
  { name: 'cashoutId', label: 'Инкасо', field: 'cashoutId', align: 'left' }
]

const dayColumns = [
  { name: 'day', label: 'Ден', field: 'day', align: 'left' },
  { name: 'coin', label: 'Монети', field: 'coin', align: 'right' },
  { name: 'coinCents', label: 'Сума', field: 'coinCents', align: 'right' },
  { name: 'passage', label: 'Преминавания', field: 'passage', align: 'right' },
  { name: 'unlock', label: 'Отключвания', field: 'unlock', align: 'right' },
  { name: 'cashout', label: 'Инкасо бр.', field: 'cashout', align: 'right' },
  { name: 'cashoutCents', label: 'Инкасо €', field: 'cashoutCents', align: 'right' }
]

const deviceOptions = computed(() =>
  devices.value.map((d) => ({
    label: `${d.name || d.id} (${d.id})`,
    value: d.id
  }))
)

const deviceLabel = computed(() => {
  if (!deviceFilter.value) return 'Всички устройства'
  const d = devices.value.find((x) => x.id === deviceFilter.value)
  return d ? `${d.name || d.id} (${d.id})` : deviceFilter.value
})

const periodTitle = computed(() => {
  if (periodMode.value === '7d') return 'Последните 7 дни'
  if (periodMode.value === 'prev') return `Месец ${monthValue.value}`
  return `Месец ${monthValue.value}`
})

const activityTotals = computed(() =>
  totals.value.slice().sort((a, b) => (b.count || 0) - (a.count || 0))
)

const maxHour = computed(() => Math.max(1, ...byHour.value.map((h) => h.total || 0)))

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevMonthStr() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function onPeriodMode(mode) {
  if (mode === 'prev') monthValue.value = prevMonthStr()
  if (mode === 'month' && !monthValue.value) monthValue.value = currentMonthStr()
  load()
}

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

function formatEventValue(type, value) {
  const v = Number(value) || 0
  if (MONEY_TYPES.has(type)) return euro(v)
  if (MS_TYPES.has(type)) return `${v} ms`
  if (v === 0) return '—'
  return String(v)
}

function formatExtra(t) {
  const v = Number(t.sumValue) || 0
  if (t.type === 'coin' || t.type === 'cashout') return `сума: ${euro(v)}`
  if (t.type === 'unlock') return `цени общо: ${euro(v)} (не е каса)`
  if (MS_TYPES.has(t.type)) {
    const avg = t.count ? Math.round(v / t.count) : 0
    return `ср. ${avg} ms (не е пари)`
  }
  return 'брой събития'
}

function buildParams() {
  const params = {}
  if (deviceFilter.value) params.deviceId = deviceFilter.value
  if (periodMode.value === '7d') {
    params.since = Date.now() - 7 * 24 * 3600 * 1000
  } else {
    params.month = monthValue.value || currentMonthStr()
  }
  return params
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
    const { data } = await api.get('/api/admin/stats', {
      headers: auth.headers,
      params: buildParams()
    })
    totals.value = data.totals || []
    recent.value = data.recent || []
    byHour.value = data.byHour || []
    byDay.value = data.byDay || []
    summary.value = {
      cashCents: 0,
      passageCount: 0,
      coinCents: 0,
      coinCount: 0,
      cashoutCents: 0,
      cashoutCount: 0,
      passageCountPeriod: 0,
      unlockCount: 0,
      ...(data.summary || {})
    }
  } catch {
    if (!quiet) $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    if (!quiet) loading.value = false
  }
}

function exportPdf() {
  const rows = byDay.value
    .map(
      (d) =>
        `<tr>
          <td>${d.day}</td>
          <td style="text-align:right">${d.coin}</td>
          <td style="text-align:right">${euro(d.coinCents)}</td>
          <td style="text-align:right">${d.passage}</td>
          <td style="text-align:right">${d.unlock}</td>
          <td style="text-align:right">${d.cashout}</td>
          <td style="text-align:right">${euro(d.cashoutCents)}</td>
        </tr>`
    )
    .join('')

  const eventRows = activityTotals.value
    .map(
      (t) =>
        `<tr>
          <td>${labelType(t.type)}</td>
          <td style="text-align:right">${t.count}</td>
          <td style="text-align:right">${formatExtra(t)}</td>
        </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8"/>
  <title>BiPOS справка — ${periodTitle.value}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 20px 0 8px; }
    .meta { color: #555; margin-bottom: 16px; }
    .cards { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0 20px; }
    .card { border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; min-width: 160px; }
    .card .label { color: #666; font-size: 11px; }
    .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; }
    th { background: #f3f3f3; text-align: left; }
    .foot { margin-top: 24px; color: #777; font-size: 11px; }
    @media print {
      body { margin: 12mm; }
      .noprint { display: none; }
    }
  </style>
</head>
<body>
  <button class="noprint" onclick="window.print()" style="margin-bottom:12px;padding:8px 14px">
    Печат / Запази като PDF
  </button>
  <h1>BiPOS Coin — месечна справка</h1>
  <div class="meta">
    Период: <strong>${periodTitle.value}</strong><br/>
    Устройство: <strong>${deviceLabel.value}</strong><br/>
    Генерирана: ${new Date().toLocaleString()}
  </div>
  <div class="cards">
    <div class="card"><div class="label">Монети в периода</div><div class="value">${euro(summary.value.coinCents)}</div><div class="label">${summary.value.coinCount || 0} събития</div></div>
    <div class="card"><div class="label">Инкасо в периода</div><div class="value">${euro(summary.value.cashoutCents)}</div><div class="label">${summary.value.cashoutCount || 0} пъти</div></div>
    <div class="card"><div class="label">Преминавания в периода</div><div class="value">${summary.value.passageCountPeriod || 0}</div></div>
    <div class="card"><div class="label">Отключвания</div><div class="value">${summary.value.unlockCount || 0}</div></div>
    <div class="card"><div class="label">Каса сега (live)</div><div class="value">${euro(summary.value.cashCents)}</div></div>
  </div>
  <h2>По дни</h2>
  <table>
    <thead>
      <tr>
        <th>Ден</th><th>Монети бр.</th><th>Сума</th><th>Преминавания</th>
        <th>Отключвания</th><th>Инкасо бр.</th><th>Инкасо €</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7">Няма данни за периода</td></tr>'}
    </tbody>
  </table>
  <h2>Събития (обобщение)</h2>
  <table>
    <thead><tr><th>Тип</th><th>Брой</th><th>Детайл</th></tr></thead>
    <tbody>${eventRows || '<tr><td colspan="3">—</td></tr>'}</tbody>
  </table>
  <div class="foot">BiPOS Coin · автоматична справка</div>
  <script>setTimeout(function(){ window.print(); }, 300);<\/script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    $q.notify({ type: 'warning', message: 'Разреши pop-up за PDF експорт' })
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
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
