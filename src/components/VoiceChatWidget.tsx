import { createSignal, createEffect, onCleanup, JSX, For } from "solid-js";
import { render } from "solid-js/web";

// Type definitions
type AgentData = {
  avatarUrl: string;
  displayName: string;
  introMessage: string;
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

const API_URL = "https://repn-voice-api.fly.dev";
const AGENT_SPEECH_TIMEOUT = 250;

type BarHeights = [number, number, number];

const VoiceChatWidget = (props: { agentId: string }) => {
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

  let mediaRecorder: MediaRecorder | null = null;
  let socket: WebSocket | null = null;
  let audioElement: HTMLAudioElement | null = null;

  const fetchAgentData = async () => {
    try {
      const response = await fetch(
        `https://repn-voice-api.fly.dev/agent-data/${props.agentId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch agent data");
      }
      const data = await response.json();
      setAgentData(data);
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
    const wsUrl = `wss://repn-voice-api.fly.dev/talk?agentID=${props.agentId}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setupAudioStream();
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
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const setupAudioStream = () => {
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

    // Cleanup function
    onCleanup(() => {
      clearInterval(checkAudioActivity);
      audioElement.pause();
      audioElement.src = "";
      audioContext.close();
    });
  };

  createEffect(() => {
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
    disconnectWebSocket();
    stopRecording();
  };

  return (
    <div
      id="voice-chat-widget"
      class="fixed bottom-5 right-5 font-sans z-[10000]"
    >
      {!isWidgetOpen() && (
        <button
          id="widget-toggle"
          onClick={toggleWidget}
          class="border-none text-white p-0 text-center no-underline inline-block text-base m-1 cursor-pointer rounded-full w-20 h-20 overflow-hidden shadow-lg"
        >
          <img
            id="widget-toggle-img"
            src={agentData()?.avatarUrl}
            alt={agentData()?.displayName}
            class="w-full h-full object-cover rounded-full"
          />
        </button>
      )}
      {isWidgetOpen() && (
        <div
          id="widget-content"
          class={`hidden bg-gradient-to-b from-gray-100 via-gray-100 to-blue-500 p-5 mb-[50px] w-[200px] h-[350px] shadow-md border border-gray-300 flex-col items-center rounded-[20px] transition-all duration-300 ease-in-out transform scale-0 opacity-0 ${
            isMinimized() ? "minimized" : ""
          }`}
        >
          <div
            id="widget-content-header"
            class="flex justify-between items-center w-full mb-[30px]"
          >
            <p class="name text-blue-500 m-0 text-3xl">
              {agentData()?.displayName}
            </p>
            <button
              id="book-appointment-button"
              onClick={() => {
                /* Implement Calendly logic */
              }}
              class="p-[3px] bg-white border-none cursor-pointer rounded-[10px] shadow-md"
            >
              {/* SVG icon for booking */}
            </button>
          </div>
          <img
            src={agentData()?.avatarUrl}
            alt={agentData()?.displayName}
            id="avatar-image"
            class="w-[140px] h-[140px] object-cover rounded-full shadow-md mb-5"
          />
          <div
            id="voice-animation"
            class="voice-animation flex items-center justify-center h-[50px] bg-white rounded-[25px] p-[10px] shadow-md w-full"
          >
            <For each={barHeights()}>
              {(height, index) => (
                <div
                  class="bar bg-[#52467b] bottom-[1px] h-[8px] w-[8px] mx-[2px] rounded-[5px] transition-all duration-300 ease-in-out max-h-full min-h-[8px]"
                  style={{ height: `${height}%` }}
                ></div>
              )}
            </For>
          </div>
          <p
            id="powered-by-text"
            class="text-white text-sm text-center mt-auto mb-0"
          >
            Powered by RepnAI
          </p>
        </div>
      )}
      {isWidgetOpen() && (
        <div
          id="floating-buttons"
          class="absolute bottom-[5px] right-[10px] hidden gap-[10px] transition-all duration-300 ease-in-out transform translate-y-full opacity-0"
        >
          <button
            id="minimize-button"
            onClick={minimizeWidget}
            class="p-[10px] bg-white border border-black cursor-pointer rounded-full shadow-md w-[40px] h-[40px] flex justify-center items-center transition-all duration-300 ease-in-out"
          >
            <div
              id="minimized-speech-bubble"
              class="hidden items-center h-[30px]"
            >
              <For each={minimizedBarHeights()}>
                {(height, index) => (
                  <div
                    class="minimized-bar bg-black h-[3px] w-[3px] mx-[2px] rounded-[5px] min-h-[3px] max-h-full"
                    style={{ height: `${height}%` }}
                  ></div>
                )}
              </For>
            </div>
            <p id="speaking-summary" class="text-black text-sm hidden">
              {agentData()?.displayName}
            </p>
            <svg
              id="minimize-icon"
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
          <button
            id="close-button"
            onClick={closeWidget}
            class="p-[10px] bg-white border border-black cursor-pointer rounded-full shadow-md w-[40px] h-[40px] flex justify-center items-center transition-all duration-300 ease-in-out"
          >
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
      )}
    </div>
  );
};

export default VoiceChatWidget;
