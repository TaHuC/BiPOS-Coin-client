import { configure } from 'quasar/wrappers'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

export default configure((ctx) => {
  return {
    boot: ['axios'],
    css: ['app.scss'],
    extras: ['material-icons', 'roboto-font'],
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20'
      },
      vueRouterMode: 'history',
      env: {
        APP_VERSION: pkg.version,
        // prod build: '' → same-origin /api/ (nginx)
        // dev: local API (override with API_URL=...)
        API_URL:
          process.env.API_URL ||
          (ctx.dev ? 'http://127.0.0.1:3080' : '')
      }
    },
    devServer: {
      open: true,
      port: 9000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3080',
          changeOrigin: true
        }
      }
    },
    framework: {
      config: {
        brand: {
          primary: '#3d9bfd',
          secondary: '#1a2332',
          accent: '#3ecf8e',
          dark: '#0f1419',
          positive: '#3ecf8e',
          negative: '#ff7b7b',
          info: '#3d9bfd',
          warning: '#f5a524'
        }
      },
      plugins: ['Notify', 'Dialog', 'Loading']
    }
  }
})
