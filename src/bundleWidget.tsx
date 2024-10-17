import { customElement } from "solid-element";
import VoiceChatWidget, {
  VoiceChatWidgetProps,
} from "./components/VoiceChatWidget";
import "./index.css";
export function registerWebComponents() {
  customElement("voice-chat-widget", getInitialProps(), VoiceChatWidget);
}

function getInitialProps(): VoiceChatWidgetProps {
  return {
    agentId: "1",
  };
}

registerWebComponents();
