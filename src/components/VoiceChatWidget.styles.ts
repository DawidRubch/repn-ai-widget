
const styles = `
#voice-chat-widget {
  position: fixed;
  bottom: 5px;
  right: 5px;
  font-family: sans-serif;
  z-index: 10000;
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
}

#widget-toggle-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

#widget-content {
  background: linear-gradient(to bottom, #f3f4f6, #f3f4f6, #3b82f6);
  padding: 20px;
  margin-bottom: 50px;
  width: 200px;
  height: 350px;
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
  margin-bottom: 30px;
}

#widget-content-header .name {
  color: #3b82f6;
  margin: 0;
  font-size: 24px;
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
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  margin-bottom: 20px;
}

#voice-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  background-color: white;
  border-radius: 25px;
  padding: 10px;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  width: 100%;
}

#voice-animation .bar {
  background-color: #52467b;
  bottom: 1px;
  height: 8px;
  width: 8px;
  margin: 0 2px;
  border-radius: 5px;
  transition: all 0.3s ease-in-out;
  max-height: 100%;
  min-height: 8px;
}

#powered-by-text {
  color: white;
  font-size: 14px;
  text-align: center;
  margin-top: auto;
  margin-bottom: 0;
}

#floating-buttons {
  position: absolute;
  bottom: 5px;
  right: 10px;
  gap: 10px;
  transition: all 0.3s ease-in-out;
  transform: scale(0);
  opacity: 0;
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
