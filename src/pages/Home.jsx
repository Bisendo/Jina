import React, { useState, useEffect } from "react";

function Home() {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Click the button and speak...");
  const [tips, setTips] = useState("");
  const [supportedFeatures, setSupportedFeatures] = useState({
    geolocation: false,
    battery: false,
    vibrate: false,
    share: false,
    clipboard: false
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Check browser support on component mount
  useEffect(() => {
    checkFeatureSupport();
  }, []);

  const checkFeatureSupport = () => {
    setSupportedFeatures({
      geolocation: 'geolocation' in navigator,
      battery: 'getBattery' in navigator,
      vibrate: 'vibrate' in navigator,
      share: 'share' in navigator,
      clipboard: 'clipboard' in navigator && 'writeText' in navigator.clipboard
    });
  };

  // 🎤 START VOICE LISTENING
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Speech recognition not supported in this browser");
      setMessage("Speech recognition not supported");
      setTips("Try using Chrome, Edge, or Safari on desktop");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);
    setMessage("Listening... Speak now!");
    setTips("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const command = transcript.toLowerCase();
      setMessage(`You said: "${transcript}"`);
      handleCommand(command);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      
      switch(event.error) {
        case 'no-speech':
          setMessage("No speech detected. Try again.");
          speak("I didn't hear anything. Please try again.");
          break;
        case 'audio-capture':
          setMessage("No microphone found.");
          speak("No microphone detected. Please check your microphone.");
          break;
        case 'not-allowed':
          setMessage("Microphone access denied.");
          speak("Microphone permission is required. Please allow microphone access.");
          break;
        default:
          setMessage("Error occurred. Try again.");
          speak("An error occurred. Please try again.");
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (!message.includes("You said:")) {
        setMessage("Click the button and speak...");
      }
    };
  };

  // 🧠 COMMAND HANDLER
  const handleCommand = (command) => {
    console.log("Processing command:", command);
    
    // Time-related commands
    if (command.includes("time") || command.includes("what time")) {
      getCurrentTime();
    }
    // Date commands
    else if (command.includes("date") || command.includes("today's date")) {
      getCurrentDate();
    }
    // Location commands
    else if (command.includes("location") || command.includes("where am i")) {
      getCurrentLocation();
    }
    // Battery commands
    else if (command.includes("battery") || command.includes("power level")) {
      getBatteryStatus();
    }
    // Share commands
    else if (command.includes("share") || command.includes("send this")) {
      shareContent();
    }
    // Copy commands
    else if (command.includes("copy") || command.includes("clipboard")) {
      copyToClipboard();
    }
    // Vibration commands
    else if (command.includes("vibrate") || command.includes("buzz")) {
      triggerVibration();
    }
    // Screenshot commands
    else if (command.includes("screenshot") || command.includes("screen shot")) {
      handleScreenshot();
    }
    // Shutdown commands
    else if (
      command.includes("shutdown") ||
      command.includes("power off") ||
      command.includes("turn off")
    ) {
      handleShutdown();
    }
    // Weather commands
    else if (command.includes("weather") || command.includes("temperature")) {
      getWeather();
    }
    // Help commands
    else if (command.includes("help") || command.includes("what can you do")) {
      showHelp();
    }
    // Calculator commands
    else if (command.includes("calculate") || command.includes("math")) {
      handleCalculation(command);
    }
    // Social media commands
    else if (command.includes("facebook") || command.includes("instagram") || 
             command.includes("twitter") || command.includes("linkedin") ||
             command.includes("youtube") || command.includes("whatsapp")) {
      openSocialMedia(command);
    }
    // Open URL commands
    else if (command.includes("open") && (command.includes(".com") || command.includes("website"))) {
      openWebsite(command);
    }
    else {
      speak("Sorry, I didn't understand that command.");
      setTips("💡 Try saying: 'what time is it', 'what's my location', 'check battery', or 'share this page'");
    }
  };

  // 🔊 SPEAK FUNCTION
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    speech.pitch = 1.0;
    speech.volume = 1.0;
    window.speechSynthesis.speak(speech);
  };

  // ⏰ GET CURRENT TIME
  const getCurrentTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = `The current time is ${timeString}`;
    speak(message);
    setTips(`🕐 Current time: ${timeString}`);
  };

  // 📅 GET CURRENT DATE
  const getCurrentDate = () => {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const message = `Today is ${dateString}`;
    speak(message);
    setTips(`📅 Today's date: ${dateString}`);
  };

  // 📍 GET CURRENT LOCATION
  const getCurrentLocation = () => {
    if (!supportedFeatures.geolocation) {
      speak("Geolocation is not supported in your browser.");
      setTips("📍 Location services are not available in this browser.");
      return;
    }

    setMessage("Getting your location...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        const message = `Your current location is approximately latitude ${lat}, longitude ${lon}`;
        speak(message);
        setMessage(`Location: ${lat}, ${lon}`);
        setTips(`📍 Your coordinates: ${lat}, ${lon}`);
        
        // Open in maps
        if (isMobile) {
          const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
          setTips(`📍 Location found. Opening in Google Maps...`);
          setTimeout(() => window.open(mapsUrl, '_blank'), 1000);
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        speak(errorMessage);
        setMessage(errorMessage);
        setTips("📍 Please enable location services in your browser settings.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 🔋 GET BATTERY STATUS
  const getBatteryStatus = async () => {
    if (!supportedFeatures.battery) {
      speak("Battery information is not available.");
      setTips("🔋 Battery API not supported in this browser.");
      return;
    }

    try {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      const charging = battery.charging;
      const chargingTime = battery.chargingTime;
      const dischargingTime = battery.dischargingTime;
      
      let message = `Your device battery is at ${level} percent. `;
      message += charging ? "It is currently charging." : "It is not charging.";
      
      if (charging && chargingTime !== Infinity) {
        const hours = Math.floor(chargingTime / 3600);
        const minutes = Math.floor((chargingTime % 3600) / 60);
        message += ` It will be fully charged in about ${hours} hours and ${minutes} minutes.`;
      }
      
      speak(message);
      setMessage(`Battery: ${level}% ${charging ? '⚡' : '🔋'}`);
      setTips(`🔋 Battery level: ${level}% | Charging: ${charging ? 'Yes' : 'No'}`);
    } catch (error) {
      speak("Unable to get battery information.");
      setTips("🔋 Could not access battery information.");
    }
  };

  // 📤 SHARE CONTENT
  const shareContent = async () => {
    if (!supportedFeatures.share) {
      speak("Sharing is not supported in your browser.");
      setTips("📤 Web Share API not supported. Try a modern browser.");
      return;
    }

    const shareData = {
      title: 'Voice Assistant',
      text: 'Check out this amazing voice assistant web app!',
      url: window.location.href
    };

    try {
      await navigator.share(shareData);
      speak("Shared successfully!");
      setMessage("Content shared!");
      setTips("✅ Page shared successfully!");
    } catch (error) {
      if (error.name !== 'AbortError') {
        speak("Sharing failed or was cancelled.");
        setTips("📤 Share cancelled or failed.");
      }
    }
  };

  // 📋 COPY TO CLIPBOARD
  const copyToClipboard = async () => {
    if (!supportedFeatures.clipboard) {
      speak("Clipboard access is not supported.");
      setTips("📋 Clipboard API not available.");
      return;
    }

    const textToCopy = "Check out this voice assistant! " + window.location.href;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      speak("Copied to clipboard!");
      setMessage("Text copied to clipboard!");
      setTips("✅ Link copied to clipboard!");
      
      // Visual feedback
      if (isMobile && supportedFeatures.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      speak("Failed to copy to clipboard.");
      setTips("❌ Failed to copy. Please try again.");
    }
  };

  // 📳 TRIGGER VIBRATION
  const triggerVibration = () => {
    if (!supportedFeatures.vibrate) {
      speak("Vibration is not supported on this device.");
      setTips("📳 Vibration API not supported on desktop browsers.");
      return;
    }

    // Different vibration patterns
    const patterns = {
      short: [100],
      medium: [200, 100, 200],
      long: [500],
      sos: [100, 100, 100, 100, 100, 500, 500, 100, 500, 100, 500, 500, 100, 100, 100]
    };

    navigator.vibrate(patterns.medium);
    speak("Device vibrating!");
    setMessage("Vibrating device...");
    setTips("📳 Device vibration activated!");
    
    // Stop vibration after 2 seconds
    setTimeout(() => {
      if (supportedFeatures.vibrate) {
        navigator.vibrate(0);
      }
    }, 2000);
  };

  // 🌤 GET WEATHER
  const getWeather = () => {
    getCurrentLocation();
    speak("Getting weather information for your location...");
    setMessage("Fetching weather...");
    setTips("🌤 Weather information requires location permission.");
    
    // Note: Actual weather API integration would require an API key
    // This is a placeholder that encourages using location
  };

  // 📸 SCREENSHOT FUNCTION
  const handleScreenshot = async () => {
    if (isMobile) {
      speak("Screen capture works best on desktop browsers.");
      setTips("📱 On mobile, use your device's built-in screenshot feature.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setTips("❌ Screen capture API not supported in this browser.");
      speak("Screen capture is not supported.");
      return;
    }

    try {
      speak("Select the screen or window you want to capture.");
      setMessage("Select window to capture...");
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          displaySurface: "window",
          cursor: "always" 
        } 
      });
      
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      const link = document.createElement("a");
      link.download = `screenshot-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      stream.getTracks().forEach((track) => track.stop());

      speak("Screenshot saved and downloaded.");
      setMessage("Screenshot captured!");
      setTips("✅ Screenshot downloaded successfully.");
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        speak("Permission denied for screen capture.");
        setTips("❌ Screen sharing permission denied.");
      } else {
        speak("Screen capture failed.");
        setTips("❌ Screen capture failed. Please try again.");
      }
    }
  };

  // ⚡ SHUTDOWN FUNCTION
  const handleShutdown = () => {
    if (isMobile) {
      speak("For safety, I cannot power off your mobile device. Please use the power button.");
      setTips("📱 Mobile devices cannot be shutdown via browser for security reasons.");
    } else {
      speak("For security reasons, web browsers cannot shutdown computers. Please use your operating system's shutdown option.");
      setTips("💻 Use Start menu → Power → Shut down (Windows) or Apple menu → Shut Down (Mac)");
    }
  };

  // ℹ️ SHOW HELP
  const showHelp = () => {
    const commands = [
      "📅 'What date is today?'",
      "🕐 'What time is it?'",
      "📍 'Where am I?'",
      "🔋 'Check battery'",
      "📤 'Share this page'",
      "📋 'Copy to clipboard'",
      "📳 'Vibrate device'",
      "🌤 'What's the weather?'",
      "📸 'Take screenshot' (desktop only)",
      "➕ 'Calculate 15 plus 27'"
    ];
    
    speak("Here are some commands you can try:");
    setMessage("Available Commands:");
    setTips(commands.join(" | "));
    
    // Speak each command slowly
    setTimeout(() => {
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          speak(cmd.replace(/[📅🕐📍🔋📤📋📳🌤📸➕]/g, ''));
        }, index * 2000);
      });
    }, 1000);
  };

  // ➕ HANDLE CALCULATIONS
  const handleCalculation = (command) => {
    // Simple calculation parsing
    const calculation = command
      .replace('calculate', '')
      .replace('what is', '')
      .replace('math', '')
      .trim();
    
    try {
      // Very basic calculation support
      if (calculation.includes('plus') || calculation.includes('+')) {
        const numbers = calculation.split(/plus|\+/).map(n => parseFloat(n.trim()));
        const result = numbers.reduce((a, b) => a + b);
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`➕ Calculation result: ${result}`);
      }
      else if (calculation.includes('minus') || calculation.includes('-')) {
        const numbers = calculation.split(/minus|-/).map(n => parseFloat(n.trim()));
        const result = numbers[0] - numbers[1];
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`➖ Calculation result: ${result}`);
      }
      else if (calculation.includes('times') || calculation.includes('*') || calculation.includes('x')) {
        const numbers = calculation.split(/times|\*|x/).map(n => parseFloat(n.trim()));
        const result = numbers.reduce((a, b) => a * b);
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`✖️ Calculation result: ${result}`);
      }
      else {
        speak("I can do basic calculations like addition, subtraction, and multiplication.");
        setTips("💡 Try: 'calculate 15 plus 27' or 'what is 100 minus 45'");
      }
    } catch (error) {
      speak("I couldn't understand that calculation.");
      setTips("❌ Could not process calculation. Try simpler format.");
    }
  };

  // 🌐 OPEN SOCIAL MEDIA
  const openSocialMedia = (command) => {
    const socialLinks = {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      twitter: 'https://twitter.com',
      linkedin: 'https://linkedin.com',
      youtube: 'https://youtube.com',
      whatsapp: 'https://web.whatsapp.com'
    };

    for (const [platform, url] of Object.entries(socialLinks)) {
      if (command.includes(platform)) {
        speak(`Opening ${platform}`);
        setMessage(`Opening ${platform}...`);
        setTips(`🌐 Opening ${platform} in new tab`);
        window.open(url, '_blank');
        return;
      }
    }
  };

  // 🌐 OPEN WEBSITE
  const openWebsite = (command) => {
    // Extract website from command
    const urlMatch = command.match(/open\s+([a-zA-Z0-9]+(?:\.[a-zA-Z]{2,})+)/);
    if (urlMatch) {
      const site = urlMatch[1];
      const url = site.startsWith('http') ? site : `https://${site}`;
      speak(`Opening ${site}`);
      setMessage(`Opening ${site}...`);
      setTips(`🌐 Opening ${url}`);
      window.open(url, '_blank');
    } else {
      speak("Please specify a website like 'open google.com'");
      setTips("💡 Try: 'open google.com' or 'open youtube.com'");
    }
  };

  // Get supported features text
  const getSupportedFeaturesText = () => {
    const features = [];
    if (supportedFeatures.geolocation) features.push("📍 Location");
    if (supportedFeatures.battery) features.push("🔋 Battery");
    if (supportedFeatures.vibrate && isMobile) features.push("📳 Vibration");
    if (supportedFeatures.share) features.push("📤 Share");
    if (supportedFeatures.clipboard) features.push("📋 Clipboard");
    
    return features.length > 0 
      ? `Available: ${features.join(", ")}` 
      : "Basic voice commands only";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full text-center border border-white/20">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          🎤 Voice Assistant
        </h1>
        
        <p className="text-white/80 text-sm mb-4">
          {isMobile ? "📱 Mobile" : "💻 Desktop"} Mode
        </p>

        <div className="bg-white/20 rounded-2xl p-4 mb-4 text-white min-h-[100px] flex items-center justify-center font-medium text-lg break-words">
          {message}
        </div>

        {tips && (
          <div className="bg-yellow-300/20 text-yellow-100 text-sm p-3 rounded-xl mb-4 border border-yellow-100/30">
            {tips}
          </div>
        )}

        <button
          onClick={startListening}
          disabled={listening}
          className={`w-full py-3 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg ${
            listening
              ? "bg-red-500 animate-pulse text-white cursor-not-allowed"
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100 active:scale-95"
          }`}
        >
          {listening ? "🎙 Listening... Speak Now" : "🎤 Start Voice Command"}
        </button>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCommand("what time is it")}
            className="bg-white/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-white/30 transition-colors"
          >
            🕐 Time
          </button>
          <button
            onClick={() => handleCommand("what date is today")}
            className="bg-white/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-white/30 transition-colors"
          >
            📅 Date
          </button>
          <button
            onClick={() => handleCommand("where am i")}
            className="bg-white/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-white/30 transition-colors"
          >
            📍 Location
          </button>
          <button
            onClick={() => handleCommand("check battery")}
            className="bg-white/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-white/30 transition-colors"
          >
            🔋 Battery
          </button>
        </div>

        <p className="text-white/70 text-sm mt-4">
          Try saying: <span className="font-semibold">"what time is it"</span> or{" "}
          <span className="font-semibold">"where am I"</span>
        </p>

        <div className="mt-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/60 text-xs">
            {getSupportedFeaturesText()}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isMobile 
              ? "📱 Optimized for mobile devices" 
              : "💻 Best experience on Chrome/Edge"}
          </p>
        </div>

        <div className="mt-4 text-white/40 text-xs">
          <p>Privacy Note: All voice processing happens locally in your browser</p>
          <p className="mt-1">Microphone access required for voice commands</p>
        </div>
      </div>

      <div className="mt-6 text-white/60 text-sm text-center max-w-md">
        <p className="font-medium mb-2">🌟 Available Commands:</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="bg-white/10 p-2 rounded">"What time is it?"</div>
          <div className="bg-white/10 p-2 rounded">"Where am I?"</div>
          <div className="bg-white/10 p-2 rounded">"Check battery"</div>
          <div className="bg-white/10 p-2 rounded">"Share this page"</div>
          <div className="bg-white/10 p-2 rounded">"Take screenshot"</div>
          <div className="bg-white/10 p-2 rounded">"Calculate 15 plus 27"</div>
        </div>
      </div>
    </div>
  );
}

export default Home;