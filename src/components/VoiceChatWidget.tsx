import {
  createSignal,
  createEffect,
  onCleanup,
  JSX,
  For,
  onMount,
  Show,
} from "solid-js";
import { render } from "solid-js/web";
import styles from "./VoiceChatWidget.styles";

declare global {
  interface Window {
    Calendly: any;
  }
}

// Type definitions
type AgentData = {
  avatarUrl: string;
  displayName: string;
  introMessage: string;
  calendlyUrl: string | null;
  position: "right" | "left" | "center";
};

enum MicrophoneState {
  WAITING_FOR_PERMISSION = "waiting_for_permission",
  PERMISSION_DENIED = "permission_denied",
  RECORDING = "recording",
  NOT_RECORDING = "not_recording",
  NOT_FOUND = "not_found",
  NOT_SUPPORTED = "not_supported",
}

enum AgentState {
  SPEAKING = "speaking",
  LISTENING = "listening",
  THINKING = "thinking",
}

const API_URL = import.meta.env.VITE_GLOBAL_API_URL;
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

type BarHeights = [number, number, number];

export type VoiceChatWidgetProps = {
  agentId: string;
};

const VoiceChatWidget = (props: VoiceChatWidgetProps) => {
  const [agentData, setAgentData] = createSignal<AgentData | null>(null);
  const [agentState, setAgentState] = createSignal<AgentState>(
    AgentState.THINKING
  );
  const [microphoneState, setMicrophoneState] = createSignal<MicrophoneState>(
    MicrophoneState.WAITING_FOR_PERMISSION
  );
  const [isMinimized, setIsMinimized] = createSignal(false);
  const [isWidgetOpen, setIsWidgetOpen] = createSignal(false);
  const [barHeights, setBarHeights] = createSignal<BarHeights>([0, 0, 0]);
  const [minimizedBarHeights, setMinimizedBarHeights] =
    createSignal<BarHeights>([0, 0, 0]);

  const [dataFetched, setDataFetched] = createSignal(false);

  let mediaRecorder: MediaRecorder | null = null;
  let socket: WebSocket | null = null;
  let audioElement: HTMLAudioElement | null = null;

  const fetchAgentData = async () => {
    try {
      const response = await fetch(`${API_URL}/agent-data/${props.agentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch agent data");
      }
      const data = await response.json();
      setAgentData(data);
      console.log("Agent data fetched:", data);
      setDataFetched(true);
    } catch (error) {
      console.error("Error fetching agent data:", error);
    }
  };

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

      mediaRecorder.addEventListener("start", () => {
        console.log("MediaRecorder started");
        setMicrophoneState(MicrophoneState.RECORDING);
      });

      mediaRecorder.addEventListener("stop", () => {
        console.log("MediaRecorder stopped");
        setMicrophoneState(MicrophoneState.NOT_RECORDING);
      });

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
      setMicrophoneState(
        error.name === "NotAllowedError"
          ? MicrophoneState.PERMISSION_DENIED
          : error.name === "NotFoundError"
          ? MicrophoneState.NOT_FOUND
          : error.name === "NotSupportedError"
          ? MicrophoneState.NOT_SUPPORTED
          : MicrophoneState.NOT_RECORDING
      );
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
      setupAudioStream(socket);
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
      startRecording();
    } else {
      disconnectWebSocket();
      stopRecording();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const setupAudioStream = (socket: WebSocket) => {
    let mediaSource = new MediaSource();
    let audioElement = new Audio();
    let sourceBuffer: SourceBuffer | null = null;
    let queue: ArrayBuffer[] = [];
    let isAppending = false;
    let audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    let analyser = audioContext.createAnalyser();
    let audioCurrentTime = 0;

    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateBars = (
      setHeights: (heights: BarHeights) => void,
      scaleFactorMultiplier = 0.5
    ) => {
      analyser.getByteFrequencyData(dataArray);
      const updateOrder = [1, 0, 2]; // Middle, then left, then right
      const newHeights: BarHeights = [0, 0, 0];

      for (let i = 0; i < 3; i++) {
        const barIndex = updateOrder[i];
        const distanceFromMiddle = Math.abs(1 - barIndex);
        const dataIndex = Math.floor(dataArray.length / 2) - distanceFromMiddle;
        const value = dataArray[dataIndex];
        const percent = value / 255;

        newHeights[barIndex] = 3 * percent * 100 * scaleFactorMultiplier;
      }

      setHeights(newHeights);
    };

    const updateAllBars = () => {
      updateBars(setBarHeights, 1);
      updateBars(setMinimizedBarHeights, 0.2);
      requestAnimationFrame(updateAllBars);
    };

    updateAllBars();

    const checkAudioActivity = setInterval(() => {
      if (audioElement.currentTime === 0) return;

      if (audioElement.currentTime === audioCurrentTime) {
        setAgentState(AgentState.LISTENING);
      }

      audioCurrentTime = audioElement.currentTime;
    }, 150);

    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    mediaSource.onsourceopen = () => {
      sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

      sourceBuffer.onupdateend = () => {
        isAppending = false;
        appendNextBuffer();
      };

      socket.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          queue.push(arrayBuffer);
          appendNextBuffer();
        } else {
          const data = JSON.parse(event.data);
          if (data.type === "voiceActivityStart") {
            console.log("voiceActivityStart");
            setAgentState(AgentState.LISTENING);
            audioElement.currentTime = 0;
            queue = [];
            if (sourceBuffer && !sourceBuffer.updating) {
              sourceBuffer.abort();
            }

            mediaSource.endOfStream();
            mediaSource = new MediaSource();

            audioElement.src = URL.createObjectURL(mediaSource);

            mediaSource.onsourceopen = () => {
              sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
              sourceBuffer.onupdateend = () => {
                isAppending = false;
                appendNextBuffer();
              };
            };
          }

          if (data.type === "voiceActivityEnd") {
            console.log("voiceActivityEnd");
            setAgentState(AgentState.THINKING);
          }

          if (data.type === "newAudioStream") {
            console.log("newAudioStream");
            queue = [];
          }
        }
      };
    };

    const appendNextBuffer = () => {
      if (
        !sourceBuffer ||
        isAppending ||
        queue.length === 0 ||
        sourceBuffer.updating
      ) {
        return;
      }

      isAppending = true;
      const nextBuffer = queue.shift();
      if (nextBuffer) {
        sourceBuffer.appendBuffer(nextBuffer);
      }
    };

    audioElement.src = URL.createObjectURL(mediaSource);

    audioElement.oncanplay = () => {
      console.log("Audio can play");
      setAgentState(AgentState.SPEAKING);
      audioElement
        .play()
        .catch((error) => console.error("Error playing audio:", error));
    };

    audioElement.onended = () => {
      console.log("Audio ended");
    };

    audioElement.onpause = () => {
      console.log("Audio paused");
    };
    // Cleanup function
    onCleanup(() => {
      clearInterval(checkAudioActivity);
      audioElement.pause();
      audioElement.src = "";
      audioContext.close();
    });
  };

  onMount(() => {
    fetchAgentData();
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

  const handleCalendlyClick = () => {
    if (typeof window.Calendly !== "undefined") {
      window.Calendly.initPopupWidget({
        url: agentData()?.calendlyUrl,
      });
    } else {
      console.error("Calendly not found");
    }
  };

  return (
    <Show when={dataFetched()} fallback={<></>}>
      <style>{styles}</style>
      <div id="voice-chat-widget">
        <button
          id="widget-toggle"
          onClick={toggleWidget}
          style={{ display: isWidgetOpen() ? "none" : "inline-block" }}
        >
          <img
            id="widget-toggle-img"
            src={agentData()?.avatarUrl}
            alt={agentData()?.displayName}
          />
        </button>

        <div
          id="widget-content"
          style={{
            transform:
              isWidgetOpen() && !isMinimized() ? "scale(1)" : "scale(0)",
            opacity: isWidgetOpen() && !isMinimized() ? "1" : "0",
            display: isWidgetOpen() && !isMinimized() ? "flex" : "none",
          }}
        >
          <div id="widget-content-header">
            <p class="name">{agentData()?.displayName}</p>
            <button id="book-appointment-button" onClick={handleCalendlyClick}>
              {/* SVG icon for booking */}
            </button>
          </div>
          <img
            src={agentData()?.avatarUrl}
            alt={agentData()?.displayName}
            id="avatar-image"
          />
          <div id="voice-animation">
            <For each={barHeights()}>
              {(height, index) => (
                <div class="bar" style={{ height: `${height}%` }}></div>
              )}
            </For>
          </div>
          <p id="powered-by-text">Powered by RepnAI</p>
        </div>

        <div
          id="floating-buttons"
          style={{
            transform: isWidgetOpen() ? "scale(1)" : "scale(0)",
            opacity: isWidgetOpen() ? "1" : "0",
            display: isWidgetOpen() ? "flex" : "none",
          }}
        >
          <button
            id="minimize-button"
            onClick={minimizeWidget}
            style={{
              width: isMinimized() ? "150px" : "40px",
              "justify-content": isMinimized() ? "space-between" : "center",
            }}
          >
            <div
              id="minimized-speech-bubble"
              style={{ display: isMinimized() ? "flex" : "none" }}
            >
              <For each={minimizedBarHeights()}>
                {(height, index) => (
                  <div
                    class="minimized-bar"
                    style={{ height: `${height}%` }}
                  ></div>
                )}
              </For>
            </div>
            <p
              id="speaking-summary"
              style={{ display: isMinimized() ? "block" : "none" }}
            >
              {agentData()?.displayName}
            </p>
            <svg
              id="minimize-icon"
              style={{
                transform: isMinimized() ? "rotate(180deg)" : "rotate(0deg)",
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
          <button id="close-button" onClick={closeWidget}>
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
        </div>
      </div>
    </Show>
  );
};

export default VoiceChatWidget;
