import React, { useState } from "react";

function Home() {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Say something...");
  const [tips, setTips] = useState("");

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  // 🎤 START VOICE LISTENING
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Speech recognition not supported in this browser");
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
      handleScreenshot();
    } else if (command.includes("shutdown") || command.includes("power off")) {
      handleShutdown();
    } else {
      speak("Sorry, I did not understand.");
      setTips("💡 Try saying: 'Take screenshot' or 'Shutdown computer'");
    }
  };

  // 🔊 SPEAK FUNCTION
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  // 📸 SCREENSHOT FUNCTION
  const handleScreenshot = async () => {
    if (isMobile) {
      speak("Screen capture works only on desktop browsers.");
      setTips("📱 Mobile browsers block screen capture. Use a laptop or desktop.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setTips("❌ Screen capture API not supported in this browser.");
      speak("Screen capture is not supported.");
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
      canvas.getContext("2d").drawImage(video, 0, 0);

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

  // ⚡ SHUTDOWN FUNCTION
  const handleShutdown = () => {
    if (isMobile) {
      speak("Power off is not allowed on mobile devices.");
      setTips("📱 You cannot shut down your phone from a browser.");
      return;
    }

    speak("Attempting to shut down computer...");
    setTips("💻 Desktop shutdown is only possible in Node.js or Electron apps.");

    // This works **only if running in a local Node.js environment**
    if (window.require) {
      try {
        const { exec } = window.require("child_process");
        exec("shutdown /s /t 0", (err) => {
          if (err) {
            console.error(err);
            setTips("❌ Failed to shutdown. Check permissions.");
          }
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      console.warn("Shutdown blocked by browser security.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
          🎤 Voice Assistant
        </h1>

        <div className="bg-white/20 rounded-2xl p-4 mb-4 text-white min-h-[80px] flex items-center justify-center font-medium text-lg break-words">
          {message}
        </div>

        {tips && (
          <div className="bg-yellow-300/20 text-yellow-100 text-sm p-3 rounded-xl mb-4 border border-yellow-100/30">
            {tips}
          </div>
        )}

        <button
          onClick={startListening}
          className={`w-full py-3 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg ${
            listening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100"
          }`}
        >
          {listening ? "🎙 Listening..." : "Start Talking"}
        </button>

        <p className="text-white/70 text-sm mt-4">
          Try saying: <span className="font-semibold">"Take screenshot"</span> or <span className="font-semibold">"Shutdown computer"</span>
        </p>

        <p className="text-white/50 text-xs mt-2">
          💻 Best supported on Chrome Desktop
        </p>
      </div>
    </div>
  );
}

export default Home;
