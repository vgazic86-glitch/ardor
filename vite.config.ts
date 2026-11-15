import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

/** DEPLOY_TARGET=node gradi običan Node server (Render i sl.) umjesto Netlify funkcija. */
const forNode = process.env.DEPLOY_TARGET === 'node'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), ...(forNode ? [] : [netlify()]), tanstackStart(), viteReact()],
})

export default config
