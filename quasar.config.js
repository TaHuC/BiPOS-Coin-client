import { configure } from 'quasar/wrappers'

export default configure((/* ctx */) => {
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
      // Empty = same-origin /api/ (nginx). Override only if API is on another host.
      env: {
        API_URL: process.env.API_URL || ''
      }
    },
    devServer: {
      open: true,
      port: 9000,
      proxy: {
        '/api': {
          target: process.env.API_PROXY || 'http://127.0.0.1:3080',
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
