window.state = "idle"; // idle, thinking-speaking, interrupted
window.voiceInterruptionOn = true;
window.fullResponse = ""; // full response from the server in one conversation chain

function setState(newState) {
    window.state = newState;
    console.log(`State updated to: ${window.state}`);
}
window.setState = setState;

async function sendAudioPartition(audio) {
    console.log(audio);
    for (let index = 0; index < audio.length; index += chunkSize) {
        const endIndex = Math.min(index + chunkSize, audio.length);
        const chunk = audio.slice(index, endIndex);
        window.ws.send(JSON.stringify({ type: "mic-audio-data", audio: chunk }));
    }
    window.ws.send(JSON.stringify({ type: "mic-audio-end" }));
}
window.sendAudioPartition = sendAudioPartition;

window.ws = null;

function connectWebSocket() {
    window.ws = new WebSocket("ws://127.0.0.1:1017/client-ws");

    window.ws.onopen = function () {
        setState("idle");
        console.log("Connected to WebSocket");
    };

    window.ws.onclose = function () {
        setState("idle");
        console.log("Disconnected from WebSocket");
        if (window.audioTaskQueue) {
            window.audioTaskQueue.clearQueue();
        }
    };

    window.ws.onmessage = function (event) {
        handleMessage(JSON.parse(event.data));
    };

    window.ws.onerror = function (error) {
        console.error("WebSocket error:", error);
    };
}

function handleMessage(message) {
    console.log("Received Message: ", message);
    switch (message.type) {
        case "full-text":
            document.getElementById("message").textContent = message.text;
            console.log("full-text: ", message.text);
            break;
        case "control":
            switch (message.text) {
                case "start-mic":
                    window.start_mic();
                    break;
                case "stop-mic":
                    window.stop_mic();
                    break;
                case "conversation-chain-start":
                    setState("thinking-speaking");
                    window.fullResponse = "";
                    break;
                case "conversation-chain-end":
                    setState("idle");
                    setExpression(0);
                    if (!window.voiceInterruptionOn) {
                        window.start_mic();
                    }
                    break;
            }
            break;
        case "expression":
            setExpression(message.text);
            break;
        case "mouth":
            setMouth(Number(message.text));
            break;
        case "audio":
            if (window.state == "interrupted") {
                console.log("Audio playback intercepted. Sentence:", message.text);
            } else {
                window.addAudioTask(message.audio, message.instrument, message.volumes, message.slice_length, message.text, message.expressions);
            }
            break;
        case "set-model":
            break;
        case "listExpressions":
            console.log(listSupportedExpressions());
            break;
        default:
            console.error("Unknown message type: " + message.type);
            console.log(message);
    }
}
window.handleMessage = handleMessage;

connectWebSocket();

window.connectWebSocket = connectWebSocket;