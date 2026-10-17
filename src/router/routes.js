const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'devices' } },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('pages/DevicesPage.vue')
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('pages/StatsPage.vue')
      },
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('pages/TransactionsPage.vue')
      },
      {
        path: 'firmware',
        name: 'firmware',
        meta: { adminOnly: true },
        component: () => import('pages/FirmwarePage.vue')
      },
      {
        path: 'clients',
        name: 'clients',
        meta: { adminOnly: true },
        component: () => import('pages/ClientsPage.vue')
      }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
