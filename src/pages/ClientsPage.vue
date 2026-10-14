<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Клиенти</div>
      <q-space />
      <q-btn color="primary" icon="person_add" label="Нов клиент" @click="openCreate" />
      <q-btn class="q-ml-sm" flat icon="refresh" :loading="loading" @click="load" />
    </div>

    <q-table
      flat
      bordered
      row-key="id"
      :rows="clients"
      :columns="columns"
      :loading="loading"
      no-data-label="Няма клиенти"
    >
      <template #body-cell-active="props">
        <q-td :props="props">
          <q-badge :color="props.row.active ? 'positive' : 'grey'">
            {{ props.row.active ? 'активен' : 'спрян' }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn dense flat color="primary" label="Редакция" @click="openEdit(props.row)" />
          <q-btn dense flat color="negative" label="Изтрий" @click="remove(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dlg" persistent>
      <q-card style="min-width: 480px; max-width: 96vw">
        <q-card-section>
          <div class="text-h6">{{ editId ? 'Редакция клиент' : 'Нов клиент' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.username" label="Потребител (login)" filled dense :disable="!!editId" />
          <q-input v-model="form.name" label="Име / фирма" filled dense />
          <q-input
            v-model="form.password"
            :label="editId ? 'Нова парола (празно = без промяна)' : 'Парола'"
            type="password"
            filled
            dense
          />
          <q-toggle v-model="form.active" label="Активен" />

          <div class="text-subtitle2 q-mt-md">Права за настройки</div>
          <div class="row q-col-gutter-sm">
            <div v-for="p in permKeys" :key="p.key" class="col-12 col-sm-6">
              <q-toggle v-model="form.permissions[p.key]" :label="p.label" dense />
            </div>
          </div>
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
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'

const $q = useQuasar()
const auth = useAuthStore()
auth.hydrate()

const loading = ref(false)
const saving = ref(false)
const clients = ref([])
const dlg = ref(false)
const editId = ref(null)
const defaults = ref({})

const permKeys = [
  { key: 'canEditName', label: 'Име на устройство' },
  { key: 'canEditPrice', label: 'Цена' },
  { key: 'canEditPulse', label: 'Стойност на импулс' },
  { key: 'canEditOverpay', label: 'Надвнесени пари' },
  { key: 'canEditRelay', label: 'Реле време' },
  { key: 'canEditUnlockTiming', label: 'Забавяния отключване' },
  { key: 'canEditPassage', label: 'Датчик / таймаут преминаване' },
  { key: 'canEditCoinDebounce', label: 'Монета debounce' },
  { key: 'canViewStats', label: 'Статистики' },
  { key: 'canCashout', label: 'Инкасо (нулиране на сума)' },
  { key: 'canRestart', label: 'Рестарт на устройство' }
]

const columns = [
  { name: 'username', label: 'Login', field: 'username', align: 'left' },
  { name: 'name', label: 'Име', field: 'name', align: 'left' },
  { name: 'deviceCount', label: 'Устройства', field: 'deviceCount', align: 'right' },
  { name: 'active', label: 'Статус', field: 'active', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' }
]

const form = ref(emptyForm())

function emptyForm() {
  return {
    username: '',
    name: '',
    password: '',
    active: true,
    permissions: { ...defaults.value }
  }
}

async function load() {
  loading.value = true
  try {
    const [c, d] = await Promise.all([
      api.get('/api/admin/clients', { headers: auth.headers }),
      api.get('/api/admin/permission-defaults', { headers: auth.headers })
    ])
    clients.value = c.data.clients || []
    defaults.value = d.data.defaults || {}
  } catch {
    $q.notify({ type: 'negative', message: 'Грешка при зареждане' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editId.value = null
  form.value = emptyForm()
  form.value.permissions = { ...defaults.value }
  dlg.value = true
}

function openEdit(row) {
  editId.value = row.id
  form.value = {
    username: row.username,
    name: row.name || '',
    password: '',
    active: !!row.active,
    permissions: { ...defaults.value, ...(row.permissions || {}) }
  }
  dlg.value = true
}

async function save() {
  if (!editId.value && (!form.value.username || !form.value.password)) {
    $q.notify({ type: 'negative', message: 'Потребител и парола са задължителни' })
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      const body = {
        name: form.value.name,
        active: form.value.active,
        permissions: form.value.permissions
      }
      if (form.value.password) body.password = form.value.password
      await api.patch(`/api/admin/clients/${editId.value}`, body, { headers: auth.headers })
    } else {
      await api.post(
        '/api/admin/clients',
        {
          username: form.value.username,
          password: form.value.password,
          name: form.value.name,
          active: form.value.active,
          permissions: form.value.permissions
        },
        { headers: auth.headers }
      )
    }
    $q.notify({ type: 'positive', message: 'Запазено' })
    dlg.value = false
    load()
  } catch (e) {
    const err = e?.response?.data?.error
    $q.notify({
      type: 'negative',
      message: err === 'exists' ? 'Потребителят вече съществува' : 'Грешка при запис'
    })
  } finally {
    saving.value = false
  }
}

function remove(row) {
  $q.dialog({
    title: 'Изтриване',
    message: `Изтрий клиент ${row.username}? Устройствата остават без клиент.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/api/admin/clients/${row.id}`, { headers: auth.headers })
      $q.notify({ type: 'positive', message: 'Изтрит' })
      load()
    } catch {
      $q.notify({ type: 'negative', message: 'Грешка' })
    }
  })
}

onMounted(load)
</script>
