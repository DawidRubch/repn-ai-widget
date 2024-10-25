
const styles = `
#voice-chat-widget {
  position: fixed;
  bottom: 20px;
  font-family: sans-serif;
  z-index: 10000;
}


#voice-chat-widget.right {
  right: 20px;
}

#voice-chat-widget.left {
  left: 20px;
}

#voice-chat-widget.center {
  right: 50%;
  transform: translateX(50%);
}

#widget-toggle {
  border: none;
  color: white;
  padding: 0;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 1px;
  cursor: pointer;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  overflow: hidden;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  animation: pulse 2s infinite;
  animation-iteration-count: 2;
}

#widget-toggle:hover {
  cursor: pointer;
  transform: scale(1.05);
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

#intro-message {
  background-color: #2e9dfb;
  color: #fff;
  padding: 10px;
  border-radius: 20px;
  width: 300px;
  position: absolute;
  bottom: 100px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
  opacity: 0;
  visibility: hidden;
}

#intro-message.left {
  left: 0px;
}

#intro-message.right {
  right: 0px;
}

#intro-message.center {
  left: 50%;
  transform: translateX(-50%);
}

#intro-message.show {
  opacity: 1;
  visibility: visible;
  animation: showIntroMessage 0.3s ease-in-out;
}


@keyframes showIntroMessage {
  0% {
    opacity: 0;
    visibility: hidden;
  }
  100% {
    opacity: 1;
    visibility: visible;
  }
}

.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  background-color: #10B981; /* green for online */
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 1;
  transition: opacity 0.3s ease-in-out;
  animation: showStatusAfterPulse 4s forwards;
}

@keyframes showStatusAfterPulse {
  0%, 99% { opacity: 0; }
  100% { opacity: 1; }
}

#widget-toggle:hover .status-indicator,
#widget-toggle:active .status-indicator {
  opacity: 0;
}

#widget-toggle-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

#widget-content {
  background: #E5F3FF;
  padding: 10px;
  margin-bottom: 50px;
  width: 150px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  border: 1px solid #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 20px;
  transition: all 0.3s ease-in-out;
  transform: scale(0);
  opacity: 0;
}

#widget-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 10px;
}

#widget-content-header .name {
  color: #3b82f6;
  margin: 0;
  font-size: 18px;
}

#book-appointment-button {
  padding: 3px;
  background-color: white;
  border: none;
  cursor: pointer;
  border-radius: 10px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
}

#avatar-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  margin-bottom: 10px;
}

#voice-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  background-color: white;
  border-radius: 25px;
  padding: 10px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  width: 100%;
  margin-bottom: 10px;
}

#voice-animation .bar {
  background-color: #3b82f6;
  bottom: 1px;
  height: 6px;
  width: 6px;
  margin: 0 2px;
  border-radius: 5px;
  transition: all 0.3s ease-in-out;
  min-height: 6px;
  max-height: 18px;

}

#powered-by-text {
  color: #3b82f6;
  font-size: 10px;
  text-align: center;
  margin-top: auto;
  margin-bottom: 0;
  font-weight: 300;
}


#floating-buttons {
  position: absolute;
  bottom: 5px;
  gap: 10px;
  transition: all 0.3s ease-in-out;
  transform: scale(0);
  opacity: 0;
}

#floating-buttons.right {
  right: 10px;
}

#floating-buttons.left {
  left: 10px;
}

#floating-buttons.center {
  left: calc(50%);
}


#minimize-button {
  padding: 10px;
  background-color: white;
  border: 1px solid black;
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease-in-out;
}
  

#minimized-speech-bubble {
  display: flex;
  align-items: center;
  height: 30px;
}

#minimized-speech-bubble .minimized-bar {
  background-color: black;
  height: 3px;
  width: 3px;
  margin: 0 2px;
  border-radius: 5px;
  min-height: 3px;
  max-height: 100%;
}

#speaking-summary {
  color: black;
  font-size: 14px;
}

#minimize-icon {
  transition: all 0.3s ease-in-out;
}

#close-button {
  padding: 10px;
  background-color: white;
  border: 1px solid black;
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease-in-out;
}
`;

export default styles;
