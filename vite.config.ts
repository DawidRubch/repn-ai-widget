import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    //devtools(),
    solidPlugin(),
  ],
  server: {
    port: 8000,
    host: '127.0.0.1'

  },
  build: {
    target: 'esnext',
  },
});
