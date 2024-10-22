import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";

const extensions = [".ts", ".tsx"];

export default {
  input: "./src/scripts/bundleWidget.tsx",
  output: {
    file: "dist/widget.mjs",
    format: "es",
  },
  external: [],
  plugins: [
    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
      "import.meta.env.VITE_GLOBAL_API_URL": JSON.stringify(
        "https://repn-voice-api.fly.dev"
      ),
      "import.meta.env.VITE_WEBSOCKET_URL": JSON.stringify(
        "wss://repn-voice-api.fly.dev/talk"
      ),
    }),
    resolve({ extensions }),
    babel({
      exclude: "node_modules/**",
      presets: ["solid", "@babel/preset-typescript"],
      extensions,
    }),
    terser({ output: { comments: false } }),
    {
      name: "inject-widget-loader",
      generateBundle(options, bundle) {
        const fileName = Object.keys(bundle)[0];
        const code = bundle[fileName].code;
        bundle[fileName].code = `
          ${code}
          
          // Automatically append the widget to the document
          (function() {
            function loadWidget() {
              const scripts = document.getElementsByTagName('script');
              let agentId = 'default-agent-id';
              for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].getAttribute('data-script-id') === 'repnai-voice-chat-widget') {
                  agentId = scripts[i].getAttribute('data-agent-id') || agentId;
                  break;
                }
              }

              const widget = document.createElement('voice-chat-widget');
              widget.setAttribute('agent-id', agentId);
              document.body.appendChild(widget);
            }
      
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', loadWidget);
            } else {
              loadWidget();
            }
          })();
        `;
      },
    },
  ],
};
