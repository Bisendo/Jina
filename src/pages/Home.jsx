import React, { useState } from "react";

function Home() {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Say something...");
  const [tips, setTips] = useState("");

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  // 🎤 START LISTENING
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setMessage("You said: " + command);
      handleCommand(command);
    };

    recognition.onend = () => setListening(false);
  };

  // 🧠 COMMAND HANDLER
  const handleCommand = (command) => {
    if (command.includes("screenshot") || command.includes("screen shot")) {
      if (isMobile) {
        speak("Screen capture works only on desktop browsers.");
        setTips("📱 Mobile browsers block screen capture. Use a laptop or desktop.");
        return;
      }
      speak("Taking screenshot. Please allow permission.");
      setTips("👉 When popup appears, choose the screen and press SHARE.");
      takeScreenshot();
    } else {
      speak("Sorry, I did not understand.");
    }
  };

  // 🔊 SPEAK
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  // 📸 SCREENSHOT
  const takeScreenshot = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setTips("❌ Screen capture API not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const link = document.createElement("a");
      link.download = "screenshot.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      stream.getTracks().forEach((track) => track.stop());

      speak("Screenshot saved.");
      setTips("✅ Screenshot downloaded successfully.");
    } catch (err) {
      console.error(err);
      speak("Permission denied.");
      setTips("❌ Permission denied. Allow screen sharing when browser asks.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg shadow-2xl rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
        
        <h1 className="text-3xl font-bold text-white mb-4">
          🎤 Voice Assistant
        </h1>

        <div className="bg-white/20 rounded-xl p-4 mb-4 text-white min-h-[60px] flex items-center justify-center">
          {message}
        </div>

        {tips && (
          <div className="bg-yellow-300/20 text-yellow-100 text-sm p-3 rounded-lg mb-4">
            {tips}
          </div>
        )}

        <button
          onClick={startListening}
          className={`w-full py-3 rounded-xl font-semibold text-lg transition-all duration-300 ${
            listening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100"
          }`}
        >
          {listening ? "🎙 Listening..." : "Start Talking"}
        </button>

        <p className="text-white/70 text-sm mt-4">
          Try saying: <span className="font-semibold">"Take screenshot"</span>
        </p>

        <p className="text-white/50 text-xs mt-2">
          💻 Best supported on Chrome Desktop
        </p>
      </div>
    </div>
  );
}

export default Home;
