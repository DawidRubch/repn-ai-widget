import { createScriptLoader } from "@solid-primitives/script-loader";
import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import styles from "./VoiceChatWidget.styles";
import { setupAudioStream } from "../utils/setupAudioStream";
import { blobToBase64 } from "../utils/blobToBase64";

export enum AgentState {
  SPEAKING = "speaking",
  LISTENING = "listening",
  THINKING = "thinking",
}
// Type definitions
type AgentData = {
  avatarUrl: string;
  displayName: string;
  introMessage: string;
  calendlyUrl: string | null;
  position: "right" | "left" | "center";
};

const getAPIUrls = () => {
  try {
    const API_URL =
      import.meta.env.VITE_GLOBAL_API_URL || "https://repn-voice-api.fly.dev";
    const WEBSOCKET_URL =
      import.meta.env.VITE_WEBSOCKET_URL || "wss://repn-voice-api.fly.dev/talk";

    return { API_URL, WEBSOCKET_URL };
  } catch (error) {
    return {
      API_URL: "https://repn-voice-api.fly.dev",
      WEBSOCKET_URL: "wss://repn-voice-api.fly.dev/talk",
    };
  }
};

const { API_URL, WEBSOCKET_URL } = getAPIUrls();

type BarHeights = [number, number, number];

export type VoiceChatWidgetProps = {
  agentId: string;
};

const VoiceChatWidget = (props: VoiceChatWidgetProps) => {
  const [agentData, setAgentData] = createSignal<AgentData | null>(null);
  const [isMinimized, setIsMinimized] = createSignal(false);
  const [isWidgetOpen, setIsWidgetOpen] = createSignal(false);
  const [barHeights, setBarHeights] = createSignal<BarHeights>([0, 0, 0]);
  const [minimizedBarHeights, setMinimizedBarHeights] =
    createSignal<BarHeights>([0, 0, 0]);

  const [dataFetched, setDataFetched] = createSignal(false);
  const [isCalendlyOpen, setIsCalendlyOpen] = createSignal(false);
  const [socketReady, setSocketReady] = createSignal(false);

  let mediaRecorder: MediaRecorder | null = null;
  let socket: WebSocket | null = null;
  let audioElement: HTMLAudioElement | null = null;

  createEffect(
    on(isCalendlyOpen, () => {
      const postMessageEventListener = (event: MessageEvent) => {
        if (!isCalendlyEvent(event)) return;

        const eventData = event.data.event;
        if (eventData === "calendly.event_scheduled") {
          saveAMeetingEvent(props.agentId);
        }
      };

      if (isCalendlyOpen()) {
        window.addEventListener("message", postMessageEventListener);
      } else {
        window.removeEventListener("message", postMessageEventListener);
      }
    })
  );

  createEffect(
    on(socketReady, () => {
      if (socketReady()) {
        startRecording();
      }
    })
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.addEventListener("dataavailable", async (event) => {
        if (
          event.data.size > 0 &&
          socket &&
          socket.readyState === WebSocket.OPEN
        ) {
          const base64 = await blobToBase64(event.data);
          socket.send(JSON.stringify({ type: "audioIn", data: base64 }));
        }
      });

      mediaRecorder.start(500);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      console.log("MediaRecorder stopped");
    }
  };

  const initializeWebSocket = () => {
    const wsUrl = `${WEBSOCKET_URL}?agentID=${props.agentId}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setupAudioStream({
        socket,
        setBarHeights,
        setMinimizedBarHeights,
        setSocketReady,
      });
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsWidgetOpen(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  };

  const disconnectWebSocket = () => {
    if (socket) {
      socket.close();
    }
  };

  const startConversation = () => {
    if (!socket) {
      initializeWebSocket();
    } else {
      disconnectWebSocket();
      stopRecording();
    }
  };

  onMount(() => {
    createScriptLoader({
      src: "https://assets.calendly.com/assets/external/widget.js",
      async: true,
    });

    fetchAgentData(props.agentId).then((data) => {
      setAgentData(data);
      setDataFetched(true);
    });
  });

  onCleanup(() => {
    disconnectWebSocket();
    stopRecording();
    if (audioElement) {
      audioElement.pause();
      audioElement.src = "";
    }
  });

  const toggleWidget = () => {
    setIsWidgetOpen(true);
    startConversation();
  };

  const minimizeWidget = () => {
    setIsMinimized(!isMinimized());
  };

  const closeWidget = () => {
    setIsWidgetOpen(false);
    setIsMinimized(false);
    disconnectWebSocket();
    stopRecording();
  };

  const handleCalendlyClick = (e: MouseEvent) => {
    if (isCalendlyOpen()) {
      closeCalendly();
      return;
    }
    e.stopPropagation();
    if (typeof window.Calendly !== "undefined") {
      setIsCalendlyOpen(true);
      initCalendlyWidget();
    } else {
      console.error("Calendly not found");
    }
  };

  const closeCalendly = () => {
    setIsCalendlyOpen(false);
  };

  return (
    <Show when={dataFetched()} fallback={<></>}>
      <CalendlyDialog isOpen={isCalendlyOpen()} onClose={closeCalendly} />

      <style>{styles}</style>
      <div id="voice-chat-widget">
        <Show when={!isWidgetOpen()}>
          <div class="status-indicator"></div>
        </Show>
        <WidgetToggleButton
          isWidgetOpen={isWidgetOpen()}
          agentData={agentData()}
          onClick={toggleWidget}
        />

        <WidgetContent
          isWidgetOpen={isWidgetOpen()}
          isMinimized={isMinimized()}
          agentData={agentData()}
          barHeights={barHeights()}
          onCalendlyClick={handleCalendlyClick}
        />

        <FloatingButtons
          isWidgetOpen={isWidgetOpen()}
          isMinimized={isMinimized()}
          minimizedBarHeights={minimizedBarHeights()}
          agentData={agentData()}
          onMinimize={minimizeWidget}
          onClose={closeWidget}
        />
      </div>
    </Show>
  );
};

export default VoiceChatWidget;

type CalendlyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CalendlyDialog = (props: CalendlyDialogProps) => (
  <dialog
    open={props.isOpen}
    onClose={props.onClose}
    id="calendly-dialog"
    style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      "z-index": "9999",
      padding: "0",
      border: "1px solid #000",
      "border-radius": "8px",
      "box-shadow": "0 4px 6px rgba(0, 0, 0, 0.1)",
      width: "auto",
      height: "760px",
    }}
  >
    <Show when={props.isOpen} fallback={<></>}>
      <button
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "#fff",
          "border-radius": "50%",
          width: "30px",
          height: "30px",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          border: "none",
          cursor: "pointer",
          "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
        onClick={props.onClose}
      >
        <span
          style={{
            "font-size": "16px",
            color: "#333",
            "line-height": 1,
          }}
        >
          ✕
        </span>
      </button>

      <div
        id="calendly-embed"
        style={{ "min-width": "320px", height: "750px", width: "auto" }}
      ></div>
    </Show>
  </dialog>
);

type WidgetToggleButtonProps = {
  isWidgetOpen: boolean;
  agentData: AgentData | null;
  onClick: () => void;
};

const WidgetToggleButton = (props: WidgetToggleButtonProps) => (
  <button
    id="widget-toggle"
    onClick={props.onClick}
    style={{ display: props.isWidgetOpen ? "none" : "inline-block" }}
  >
    <img
      id="widget-toggle-img"
      src={props.agentData?.avatarUrl}
      alt={props.agentData?.displayName}
    />
  </button>
);

type WidgetContentProps = {
  isWidgetOpen: boolean;
  isMinimized: boolean;
  agentData: AgentData | null;
  barHeights: BarHeights;
  onCalendlyClick: (e: MouseEvent) => void;
};

const WidgetContent = (props: WidgetContentProps) => {
  return (
    <div
      id="widget-content"
      style={{
        transform:
          props.isWidgetOpen && !props.isMinimized ? "scale(1)" : "scale(0)",
        opacity: props.isWidgetOpen && !props.isMinimized ? "1" : "0",
        display: props.isWidgetOpen && !props.isMinimized ? "flex" : "none",
      }}
    >
      <div id="widget-content-header">
        <p class="name">{props.agentData?.displayName}</p>
        <button id="book-appointment-button" onClick={props.onCalendlyClick}>
          <CalendarIcon />
        </button>
      </div>
      <img
        src={props.agentData?.avatarUrl}
        alt={props.agentData?.displayName}
        id="avatar-image"
      />
      <div id="voice-animation">
        <For each={props.barHeights}>
          {(height, index) => (
            <div class="bar" style={{ height: `${height}%` }}></div>
          )}
        </For>
      </div>
      <p id="powered-by-text">Powered by RepnAI</p>
    </div>
  );
};

type FloatingButtonsProps = {
  isWidgetOpen: boolean;
  isMinimized: boolean;
  minimizedBarHeights: BarHeights;
  agentData: AgentData | null;
  onMinimize: () => void;
  onClose: () => void;
};

const FloatingButtons = (props: FloatingButtonsProps) => (
  <div
    id="floating-buttons"
    style={{
      transform: props.isWidgetOpen ? "scale(1)" : "scale(0)",
      opacity: props.isWidgetOpen ? "1" : "0",
      display: props.isWidgetOpen ? "flex" : "none",
    }}
  >
    <button
      id="minimize-button"
      onClick={props.onMinimize}
      style={{
        width: props.isMinimized ? "150px" : "40px",
        "justify-content": props.isMinimized ? "space-between" : "center",
        "border-radius": props.isMinimized ? "20px" : "50%",
      }}
    >
      <div
        id="minimized-speech-bubble"
        style={{ display: props.isMinimized ? "flex" : "none" }}
      >
        <For each={props.minimizedBarHeights}>
          {(height, index) => (
            <div class="minimized-bar" style={{ height: `${height}%` }}></div>
          )}
        </For>
      </div>
      <p
        id="speaking-summary"
        style={{ display: props.isMinimized ? "block" : "none" }}
      >
        {props.agentData?.displayName}
      </p>
      <svg
        id="minimize-icon"
        style={{
          transform: props.isMinimized ? "rotate(180deg)" : "rotate(0deg)",
        }}
        width="18"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.33317 12L15.9998 22.6667L26.6665 12"
          stroke="black"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <CloseButton onClick={props.onClose} />
  </div>
);

const CalendarIcon = () => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 50 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M41.1584 42V40C41.1584 37.7909 39.3252 36 37.0638 36H28.8747C26.6133 36 24.7801 37.7909 24.7801 40V42M18.6383 22H8.40186M41.1584 18V14C41.1584 11.7909 39.3252 10 37.0638 10H12.4964C10.2351 10 8.40186 11.7909 8.40186 14V38C8.40186 40.2091 10.2351 42 12.4964 42H16.591M30.9219 6V14M18.6383 6V14M37.0638 26C37.0638 28.2091 35.2306 30 32.9692 30C30.7079 30 28.8747 28.2091 28.8747 26C28.8747 23.7909 30.7079 22 32.9692 22C35.2306 22 37.0638 23.7909 37.0638 26Z"
      stroke="#001A72"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <button id="close-button" onClick={onClick}>
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25.3332 6.66666L6.6665 25.3333M6.66652 6.66666L25.3332 25.3333"
        stroke="black"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
);

const fetchAgentData = async (agentId: string) => {
  try {
    const response = await fetch(`${API_URL}/agent-data/${agentId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch agent data");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching agent data:", error);
  }
};

const saveAMeetingEvent = (agentId: string) => {
  fetch(`${API_URL}/agent-data/${agentId}`, {
    method: "POST",
  });
};

const isCalendlyEvent = (event: MessageEvent) => {
  return event.data.event && event.data.event.indexOf("calendly") === 0;
};

const initCalendlyWidget = () => {
  const utm = {
    utm_source: "repnai",
    utm_medium: "voicechatwidget",
  };
  setTimeout(() => {
    window.Calendly.initInlineWidget({
      url: "https://calendly.com/dawid-niegrebecki/meeting-with-dawid",
      parentElement: document.getElementById("calendly-embed"),
      utm,
    });
  }, 0);
};
