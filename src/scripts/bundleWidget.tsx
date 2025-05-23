import { customElement } from "solid-element";
import VoiceChatWidget, {
  VoiceChatWidgetProps,
} from "../components/VoiceChatWidget";

function registerWebComponents() {
  customElement("voice-chat-widget", getInitialProps(), VoiceChatWidget);
}

function getInitialProps(): VoiceChatWidgetProps {
  return {
    agentId: undefined,
  };
}

registerWebComponents();
