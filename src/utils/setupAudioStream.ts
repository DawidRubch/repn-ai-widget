import { onCleanup } from "solid-js";
import { BarHeights, updateBarHeights } from "./updateBarHeights";
import { AgentState } from "../components/VoiceChatWidget";

type AudioStreamParams = {
    socket: WebSocket;
    setBarHeights: (heights: BarHeights) => void;
    setMinimizedBarHeights: (heights: BarHeights) => void;
    setSocketReady: (ready: boolean) => void;
};

export const setupAudioStream = (params: AudioStreamParams) => {
    const { socket, setBarHeights, setMinimizedBarHeights, setSocketReady } = params;
    let mediaSource = new MediaSource();
    const audioElement = new Audio();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    let sourceBuffer: SourceBuffer | null = null;
    let queue: ArrayBuffer[] = [];
    let isAppending = false;
    let audioCurrentTime = 0;

    const updateAllBars = () => {
        setBarHeights(updateBarHeights({ analyser, scaleFactorMultiplier: 1 }));
        setMinimizedBarHeights(updateBarHeights({ analyser, scaleFactorMultiplier: 0.2 }));
        requestAnimationFrame(updateAllBars);
    };

    const checkAudioActivity = setInterval(() => {
        if (audioElement.currentTime === 0) return;
        audioCurrentTime = audioElement.currentTime;
    }, 150);

    const appendNextBuffer = () => {
        if (!sourceBuffer || isAppending || queue.length === 0 || sourceBuffer.updating) return;
        isAppending = true;
        const nextBuffer = queue.shift();
        if (nextBuffer) sourceBuffer.appendBuffer(nextBuffer);
    };

    const handleSocketMessage = async (event: MessageEvent) => {
        if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            queue.push(arrayBuffer);
            appendNextBuffer();
        } else {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "voiceActivityStart":
                    console.log("voiceActivityStart");
                    audioElement.currentTime = 0;
                    queue = [];
                    if (sourceBuffer && !sourceBuffer.updating) sourceBuffer.abort();
                    mediaSource.endOfStream();
                    mediaSource = new MediaSource();
                    audioElement.src = URL.createObjectURL(mediaSource);

                    mediaSource.onsourceopen = () => {
                        console.log("source open");
                        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
                        sourceBuffer.onupdateend = () => {
                            isAppending = false;
                            appendNextBuffer();
                        };
                    };

                    break;
                case "voiceActivityEnd":
                    console.log("voiceActivityEnd");
                    break;
                case "newAudioStream":
                    console.log("newAudioStream");
                    queue = [];
                    break;
                case "ready":
                    setSocketReady(true);
                    break;
            }
        }
    };

    const initializeAudio = () => {
        updateAllBars();
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        audioElement.src = URL.createObjectURL(mediaSource);

        mediaSource.onsourceopen = () => {
            sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
            sourceBuffer.onupdateend = () => {
                isAppending = false;
                appendNextBuffer();
            };
        };

        audioElement.oncanplay = () => {
            audioElement.play().catch((error) => console.error("Error playing audio:", error));
        };
    };

    initializeAudio();
    socket.onmessage = handleSocketMessage;

    onCleanup(() => {
        clearInterval(checkAudioActivity);
        audioElement.pause();
        audioElement.src = "";
        audioContext.close();
    });
};


