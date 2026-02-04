import React, { useState, useEffect, useRef } from "react";

function Home() {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Click the button and speak...");
  const [tips, setTips] = useState("");
  const [supportedFeatures, setSupportedFeatures] = useState({
    geolocation: false,
    battery: false,
    vibrate: false,
    share: false,
    clipboard: false,
    contacts: false,
    sms: false,
    call: false,
    camera: false,
    notifications: false
  });

  const [contacts, setContacts] = useState([]);
  const [myPhoneNumber, setMyPhoneNumber] = useState("+255123456789"); // Default Tanzania number
  const [lastCommand, setLastCommand] = useState("");
  const [callLog, setCallLog] = useState([]);
  const [smsLog, setSmsLog] = useState([]);

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const speechRecognitionRef = useRef(null);

  // Sample contacts for demo
  const sampleContacts = [
    { name: "Mom", number: "+255712345678" },
    { name: "Dad", number: "+255754321987" },
    { name: "John", number: "+255788123456" },
    { name: "Sarah", number: "+255765432109" },
    { name: "Emergency", number: "112" }
  ];

  // Check browser support on component mount
  useEffect(() => {
    checkFeatureSupport();
    setupContacts();
    setupEventListeners();
  }, []);

  const checkFeatureSupport = () => {
    setSupportedFeatures({
      geolocation: 'geolocation' in navigator,
      battery: 'getBattery' in navigator,
      vibrate: 'vibrate' in navigator,
      share: 'share' in navigator,
      clipboard: 'clipboard' in navigator && 'writeText' in navigator.clipboard,
      contacts: 'contacts' in navigator && 'ContactsManager' in window,
      sms: 'sms' in navigator,
      call: isMobile, // Calls only work on mobile
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      notifications: 'Notification' in window && Notification.permission !== 'denied'
    });
  };

  const setupContacts = () => {
    // Try to get real contacts if supported
    if (supportedFeatures.contacts) {
      try {
        const contactManager = new ContactsManager();
        contactManager.getProperties(['name', 'tel'])
          .then(props => {
            if (props.includes('name') && props.includes('tel')) {
              contactManager.select(['name', 'tel'], { multiple: true })
                .then(contacts => {
                  setContacts(contacts);
                })
                .catch(() => setContacts(sampleContacts));
            }
          })
          .catch(() => setContacts(sampleContacts));
      } catch {
        setContacts(sampleContacts);
      }
    } else {
      setContacts(sampleContacts);
    }
  };

  const setupEventListeners = () => {
    // Listen for app visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const handleVisibilityChange = () => {
    if (document.hidden && listening) {
      stopListening();
    }
  };

  // 🎤 START VOICE LISTENING
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Speech recognition not supported in this browser");
      setMessage("Speech recognition not supported");
      setTips("Try using Chrome, Edge, or Safari on desktop");
      return;
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);
    setMessage("🎤 Listening... Speak now!");
    setTips("");
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (listening) {
        stopListening();
        setMessage("Listening timed out. Click to try again.");
        speak("Listening timed out. Please try again.");
      }
    }, 10000);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const command = transcript.toLowerCase();
      setMessage(`🎤 You said: "${transcript}"`);
      setLastCommand(command);
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
      speechRecognitionRef.current = null;
    };
  };

  const stopListening = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setListening(false);
  };

  // 🧠 COMMAND HANDLER
  const handleCommand = (command) => {
    console.log("Processing command:", command);
    
    // Call commands
    if (command.includes("call") || command.includes("phone") || command.includes("dial")) {
      handleCallCommand(command);
    }
    // SMS commands
    else if (command.includes("message") || command.includes("sms") || command.includes("text")) {
      handleSmsCommand(command);
    }
    // Contact commands
    else if (command.includes("contact") || command.includes("save contact")) {
      handleContactCommand(command);
    }
    // Camera commands
    else if (command.includes("camera") || command.includes("photo") || command.includes("picture")) {
      handleCameraCommand();
    }
    // Time-related commands
    else if (command.includes("time") || command.includes("what time")) {
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
    // Notification commands
    else if (command.includes("notification") || command.includes("alert")) {
      sendNotification(command);
    }
    // Screenshot commands
    else if (command.includes("screenshot") || command.includes("screen shot")) {
      handleScreenshot();
    }
    // Shutdown commands
    else if (command.includes("shutdown") || command.includes("power off")) {
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
    // Show my number
    else if (command.includes("my number") || command.includes("what's my number")) {
      showMyNumber();
    }
    // Show call log
    else if (command.includes("call log") || command.includes("recent calls")) {
      showCallLog();
    }
    // Show SMS log
    else if (command.includes("sms log") || command.includes("messages")) {
      showSmsLog();
    }
    // Repeat last command
    else if (command.includes("repeat") || command.includes("again")) {
      repeatLastCommand();
    }
    else {
      speak("Sorry, I didn't understand that command.");
      setTips("💡 Try saying: 'call mom', 'message john hello', or 'what's my number'");
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

  // 📞 HANDLE CALL COMMANDS
  const handleCallCommand = (command) => {
    // Extract contact name or number
    const contactMatch = command.match(/call\s+(.+)/) || command.match(/phone\s+(.+)/) || command.match(/dial\s+(.+)/);
    
    if (!contactMatch) {
      speak("Who would you like to call?");
      setTips("💡 Try: 'call mom' or 'call +255712345678'");
      return;
    }

    const contactQuery = contactMatch[1].trim();
    
    // Check if it's a direct number
    if (/[\d\+]/.test(contactQuery[0])) {
      makeCall(contactQuery);
      return;
    }

    // Find contact by name
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase())
    );

    if (contact) {
      makeCall(contact.number, contact.name);
    } else {
      speak(`Contact ${contactQuery} not found. Would you like to call a number directly?`);
      setTips(`Contact not found. Try: 'call +255712345678' or add ${contactQuery} to contacts first.`);
    }
  };

  // Make a phone call
  const makeCall = (phoneNumber, contactName = null) => {
    // Format phone number
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (Tanzania: +255)
    if (!formattedNumber.startsWith('255') && formattedNumber.length === 9) {
      formattedNumber = '255' + formattedNumber;
    }
    
    const telUrl = `tel:+${formattedNumber}`;
    const displayName = contactName || phoneNumber;
    
    // Log the call
    const callRecord = {
      type: 'outgoing',
      number: formattedNumber,
      name: displayName,
      timestamp: new Date().toLocaleString(),
      duration: 'Not answered'
    };
    
    setCallLog(prev => [callRecord, ...prev.slice(0, 9)]);
    
    if (isMobile) {
      speak(`Calling ${displayName} at ${phoneNumber}`);
      setMessage(`📞 Calling ${displayName}...`);
      setTips(`Opening phone dialer for ${formattedNumber}`);
      
      // Open phone dialer
      setTimeout(() => {
        window.open(telUrl, '_blank');
      }, 1000);
    } else {
      speak(`On mobile, I would call ${displayName} at ${phoneNumber}. This is a desktop simulation.`);
      setMessage(`📞 Would call: ${displayName} (${formattedNumber})`);
      setTips("📞 Phone calls only work on mobile devices");
    }
  };

  // 💬 HANDLE SMS COMMANDS
  const handleSmsCommand = (command) => {
    // Extract message details
    const messageMatch = command.match(/message\s+(.+?)\s+(.+)/) || 
                        command.match(/sms\s+(.+?)\s+(.+)/) ||
                        command.match(/text\s+(.+?)\s+(.+)/);
    
    if (!messageMatch) {
      speak("Who would you like to message and what should I say?");
      setTips("💡 Try: 'message john hello how are you'");
      return;
    }

    const contactQuery = messageMatch[1].trim();
    const messageText = messageMatch[2].trim();
    
    // Check if it's a direct number
    if (/[\d\+]/.test(contactQuery[0])) {
      sendSms(contactQuery, messageText);
      return;
    }

    // Find contact by name
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase())
    );

    if (contact) {
      sendSms(contact.number, messageText, contact.name);
    } else {
      speak(`Contact ${contactQuery} not found. Would you like to message a number directly?`);
      setTips(`Contact not found. Try: 'message +255712345678 hello'`);
    }
  };

  // Send SMS
  const sendSms = (phoneNumber, message, contactName = null) => {
    // Format phone number
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (Tanzania: +255)
    if (!formattedNumber.startsWith('255') && formattedNumber.length === 9) {
      formattedNumber = '255' + formattedNumber;
    }
    
    const smsUrl = `sms:+${formattedNumber}?body=${encodeURIComponent(message)}`;
    const displayName = contactName || phoneNumber;
    
    // Log the SMS
    const smsRecord = {
      type: 'sent',
      number: formattedNumber,
      name: displayName,
      message: message,
      timestamp: new Date().toLocaleString()
    };
    
    setSmsLog(prev => [smsRecord, ...prev.slice(0, 9)]);
    
    if (isMobile) {
      speak(`Sending message to ${displayName}: ${message}`);
      setMessage(`💬 Sending SMS to ${displayName}...`);
      setTips(`Opening messages app for ${formattedNumber}`);
      
      // Open SMS app
      setTimeout(() => {
        window.open(smsUrl, '_blank');
      }, 1000);
    } else {
      speak(`On mobile, I would send this message to ${displayName}: ${message}`);
      setMessage(`💬 Would SMS ${displayName}: "${message}"`);
      setTips("💬 SMS only works on mobile devices");
    }
  };

  // 👤 HANDLE CONTACT COMMANDS
  const handleContactCommand = (command) => {
    if (command.includes("save contact") || command.includes("add contact")) {
      handleAddContact(command);
    } else if (command.includes("show contacts") || command.includes("list contacts")) {
      listContacts();
    } else if (command.includes("my contacts")) {
      listContacts();
    }
  };

  // Add a new contact
  const handleAddContact = (command) => {
    const addMatch = command.match(/add contact\s+(.+?)\s+(\+?[\d\s]+)/) || 
                     command.match(/save contact\s+(.+?)\s+(\+?[\d\s]+)/);
    
    if (!addMatch) {
      speak("Please specify a name and phone number for the new contact.");
      setTips("💡 Try: 'save contact John +255712345678'");
      return;
    }

    const name = addMatch[1].trim();
    let number = addMatch[2].replace(/\s/g, '');
    
    // Format number
    if (!number.startsWith('+') && !number.startsWith('255') && number.length === 9) {
      number = '+255' + number;
    } else if (!number.startsWith('+') && number.length === 12) {
      number = '+' + number;
    }
    
    const newContact = { name, number };
    setContacts(prev => [...prev, newContact]);
    
    speak(`Contact ${name} with number ${number} has been saved.`);
    setMessage(`✅ Contact saved: ${name}`);
    setTips(`📱 New contact: ${name} - ${number}`);
    
    // Try to save to device contacts if supported
    if (supportedFeatures.contacts) {
      try {
        const contact = {
          name: [name],
          tel: [number]
        };
        
        // This would need actual Contacts API implementation
        console.log("Would save to device contacts:", contact);
      } catch (error) {
        console.error("Error saving to device contacts:", error);
      }
    }
  };

  // List all contacts
  const listContacts = () => {
    if (contacts.length === 0) {
      speak("You have no contacts saved.");
      setMessage("No contacts found");
      setTips("💡 Say 'save contact [name] [number]' to add contacts");
      return;
    }
    
    const contactList = contacts.map(c => `${c.name}: ${c.number}`).join(", ");
    speak(`You have ${contacts.length} contacts: ${contactList}`);
    setMessage(`📇 Contacts (${contacts.length}):`);
    setTips(contacts.slice(0, 3).map(c => `${c.name}: ${c.number}`).join(" | "));
  };

  // 📸 HANDLE CAMERA COMMAND
  const handleCameraCommand = () => {
    if (!supportedFeatures.camera) {
      speak("Camera access is not supported in your browser.");
      setTips("📸 Camera API not available.");
      return;
    }

    speak("Opening camera. Please allow camera access when prompted.");
    setMessage("📸 Opening camera...");
    setTips("Allow camera access when browser asks for permission.");

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        setMessage("📸 Camera is active!");
        setTips("Camera is now active. Say 'close camera' to stop.");
        
        // Create video element to show camera feed
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.position = 'fixed';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.transform = 'translate(-50%, -50%)';
        video.style.zIndex = '1000';
        video.style.maxWidth = '90%';
        video.style.maxHeight = '90%';
        video.style.border = '5px solid white';
        video.style.borderRadius = '10px';
        video.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        video.id = 'camera-feed';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖ Close Camera';
        closeBtn.style.position = 'fixed';
        closeBtn.style.top = '20px';
        closeBtn.style.right = '20px';
        closeBtn.style.zIndex = '1001';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.background = 'red';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '5px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          closeBtn.remove();
          setMessage("Camera closed");
          speak("Camera closed");
        };
        
        document.body.appendChild(video);
        document.body.appendChild(closeBtn);
        
        // Auto-close after 30 seconds
        setTimeout(() => {
          if (document.getElementById('camera-feed')) {
            stream.getTracks().forEach(track => track.stop());
            video.remove();
            closeBtn.remove();
            setMessage("Camera closed automatically");
          }
        }, 30000);
      })
      .catch(error => {
        console.error("Camera error:", error);
        speak("Failed to access camera. Please check permissions.");
        setMessage("❌ Camera access denied");
        setTips("Camera permission required. Please allow in browser settings.");
      });
  };

  // 🔔 SEND NOTIFICATION
  const sendNotification = (command) => {
    if (!supportedFeatures.notifications) {
      speak("Notifications are not supported in your browser.");
      setTips("🔔 Notifications not available.");
      return;
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createNotification(command);
        }
      });
    } else if (Notification.permission === 'granted') {
      createNotification(command);
    } else {
      speak("Notification permission denied. Please enable in browser settings.");
      setTips("🔔 Enable notifications in browser settings.");
    }
  };

  const createNotification = (command) => {
    const messageMatch = command.match(/notification\s+(.+)/) || command.match(/alert\s+(.+)/);
    const notificationText = messageMatch ? messageMatch[1] : "Voice assistant notification";
    
    const notification = new Notification("Voice Assistant", {
      body: notificationText,
      icon: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
      badge: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png"
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    speak("Notification sent.");
    setMessage("🔔 Notification sent!");
    setTips("Check your notifications");
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
        setMessage(`📍 Location: ${lat}, ${lon}`);
        setTips(`📍 Coordinates: ${lat}, ${lon}`);
        
        // Open in maps on mobile
        if (isMobile) {
          const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
          setTimeout(() => window.open(mapsUrl, '_blank'), 1000);
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        speak(errorMessage);
        setMessage(errorMessage);
        setTips("📍 Enable location services in settings.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 🔋 GET BATTERY STATUS
  const getBatteryStatus = async () => {
    if (!supportedFeatures.battery) {
      speak("Battery information is not available.");
      setTips("🔋 Battery API not supported.");
      return;
    }

    try {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      const charging = battery.charging;
      
      let message = `Your device battery is at ${level} percent. `;
      message += charging ? "It is currently charging." : "It is not charging.";
      
      speak(message);
      setMessage(`🔋 Battery: ${level}% ${charging ? '⚡' : ''}`);
      setTips(`🔋 ${level}% | Charging: ${charging ? 'Yes' : 'No'}`);
    } catch (error) {
      speak("Unable to get battery information.");
      setTips("🔋 Could not access battery info.");
    }
  };

  // 📤 SHARE CONTENT
  const shareContent = async () => {
    if (!supportedFeatures.share) {
      speak("Sharing is not supported in your browser.");
      setTips("📤 Web Share API not supported.");
      return;
    }

    const shareData = {
      title: 'Smart Voice Assistant',
      text: 'Check out this amazing voice assistant with call and SMS features!',
      url: window.location.href
    };

    try {
      await navigator.share(shareData);
      speak("Shared successfully!");
      setMessage("📤 Content shared!");
      setTips("✅ Page shared!");
    } catch (error) {
      if (error.name !== 'AbortError') {
        speak("Sharing failed.");
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

    const textToCopy = `My phone number: ${myPhoneNumber}\nVoice Assistant: ${window.location.href}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      speak("Copied to clipboard!");
      setMessage("📋 Copied to clipboard!");
      setTips("✅ Contact info copied!");
      
      if (isMobile && supportedFeatures.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      speak("Failed to copy to clipboard.");
      setTips("❌ Failed to copy.");
    }
  };

  // 📳 TRIGGER VIBRATION
  const triggerVibration = () => {
    if (!supportedFeatures.vibrate) {
      speak("Vibration is not supported on this device.");
      setTips("📳 Vibration API not supported.");
      return;
    }

    navigator.vibrate([200, 100, 200]);
    speak("Device vibrating!");
    setMessage("📳 Vibrating device...");
    setTips("📳 Vibration activated!");
    
    setTimeout(() => {
      if (supportedFeatures.vibrate) {
        navigator.vibrate(0);
      }
    }, 2000);
  };

  // 📸 SCREENSHOT FUNCTION
  const handleScreenshot = async () => {
    if (isMobile) {
      speak("On mobile, use your device's screenshot feature.");
      setTips("📱 Use power + volume down buttons for screenshot.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setTips("❌ Screen capture API not supported.");
      speak("Screen capture not supported.");
      return;
    }

    try {
      speak("Select screen or window to capture.");
      setMessage("Select window to capture...");
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "window" } 
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

      speak("Screenshot saved.");
      setMessage("📸 Screenshot captured!");
      setTips("✅ Screenshot downloaded.");
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        speak("Permission denied.");
        setTips("❌ Screen sharing permission denied.");
      } else {
        speak("Screen capture failed.");
        setTips("❌ Screen capture failed.");
      }
    }
  };

  // ⚡ SHUTDOWN FUNCTION
  const handleShutdown = () => {
    if (isMobile) {
      speak("For safety, I cannot power off your mobile device.");
      setTips("📱 Use power button to shutdown mobile.");
    } else {
      speak("Web browsers cannot shutdown computers.");
      setTips("💻 Use operating system shutdown option.");
    }
  };

  // 🌤 GET WEATHER
  const getWeather = () => {
    getCurrentLocation();
    speak("Getting weather for your location...");
    setMessage("🌤 Fetching weather...");
    setTips("🌤 Weather info requires location permission.");
  };

  // ℹ️ SHOW HELP
  const showHelp = () => {
    const commands = [
      "📞 'Call mom'",
      "💬 'Message John hello'",
      "📇 'Save contact Lisa +255712345678'",
      "📸 'Open camera'",
      "🔔 'Send notification reminder'",
      "🕐 'What time is it?'",
      "📍 'Where am I?'",
      "🔋 'Check battery'",
      "📤 'Share this page'",
      "📋 'Copy my number'"
    ];
    
    speak("Here are some commands you can try.");
    setMessage("Available Commands:");
    setTips(commands.join(" | "));
  };

  // ➕ HANDLE CALCULATIONS
  const handleCalculation = (command) => {
    const calculation = command
      .replace('calculate', '')
      .replace('what is', '')
      .replace('math', '')
      .trim();
    
    try {
      if (calculation.includes('plus') || calculation.includes('+')) {
        const numbers = calculation.split(/plus|\+/).map(n => parseFloat(n.trim()));
        const result = numbers.reduce((a, b) => a + b);
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`➕ Result: ${result}`);
      }
      else if (calculation.includes('minus') || calculation.includes('-')) {
        const numbers = calculation.split(/minus|-/).map(n => parseFloat(n.trim()));
        const result = numbers[0] - numbers[1];
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`➖ Result: ${result}`);
      }
      else if (calculation.includes('times') || calculation.includes('*') || calculation.includes('x')) {
        const numbers = calculation.split(/times|\*|x/).map(n => parseFloat(n.trim()));
        const result = numbers.reduce((a, b) => a * b);
        speak(`The result is ${result}`);
        setMessage(`${calculation} = ${result}`);
        setTips(`✖️ Result: ${result}`);
      }
      else {
        speak("I can do basic calculations.");
        setTips("💡 Try: 'calculate 15 plus 27'");
      }
    } catch (error) {
      speak("I couldn't understand that calculation.");
      setTips("❌ Could not process calculation.");
    }
  };

  // 📱 SHOW MY NUMBER
  const showMyNumber = () => {
    speak(`Your phone number is ${myPhoneNumber}`);
    setMessage(`📱 My number: ${myPhoneNumber}`);
    setTips(`Your phone number: ${myPhoneNumber}`);
  };

  // 📞 SHOW CALL LOG
  const showCallLog = () => {
    if (callLog.length === 0) {
      speak("No call history available.");
      setMessage("No call history");
      setTips("Make calls to see history");
      return;
    }
    
    const recentCalls = callLog.slice(0, 3).map(call => 
      `${call.name}: ${call.timestamp}`
    ).join(", ");
    
    speak(`Recent calls: ${recentCalls}`);
    setMessage(`📞 Recent calls (${callLog.length}):`);
    setTips(callLog.slice(0, 2).map(c => `${c.name}`).join(" | "));
  };

  // 💬 SHOW SMS LOG
  const showSmsLog = () => {
    if (smsLog.length === 0) {
      speak("No message history available.");
      setMessage("No message history");
      setTips("Send messages to see history");
      return;
    }
    
    const recentMessages = smsLog.slice(0, 2).map(sms => 
      `${sms.name}: ${sms.message.substring(0, 20)}...`
    ).join(", ");
    
    speak(`Recent messages: ${recentMessages}`);
    setMessage(`💬 Recent messages (${smsLog.length}):`);
    setTips(smsLog.slice(0, 2).map(s => `${s.name}: "${s.message.substring(0, 15)}..."`).join(" | "));
  };

  // 🔁 REPEAT LAST COMMAND
  const repeatLastCommand = () => {
    if (lastCommand) {
      speak("Repeating last command.");
      handleCommand(lastCommand);
    } else {
      speak("No previous command to repeat.");
      setTips("Speak a command first, then say 'repeat'");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full text-center border border-white/20">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          📱 Smart Voice Assistant
        </h1>
        
        <p className="text-white/80 text-sm mb-4">
          {isMobile ? "📱 Mobile" : "💻 Desktop"} Mode • {contacts.length} Contacts
        </p>

        <div className="bg-white/20 rounded-2xl p-4 mb-4 text-white min-h-[120px] flex items-center justify-center font-medium text-lg break-words">
          {message}
        </div>

        {tips && (
          <div className="bg-yellow-300/20 text-yellow-100 text-sm p-3 rounded-xl mb-4 border border-yellow-100/30">
            {tips}
          </div>
        )}

        <button
          onClick={listening ? stopListening : startListening}
          className={`w-full py-3 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg ${
            listening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100 active:scale-95"
          }`}
        >
          {listening ? "⏹️ Stop Listening" : "🎤 Start Voice Command"}
        </button>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            onClick={() => handleCommand("call mom")}
            className="bg-green-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-500/30 transition-colors"
          >
            📞 Call
          </button>
          <button
            onClick={() => handleCommand("message john hello")}
            className="bg-blue-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-blue-500/30 transition-colors"
          >
            💬 SMS
          </button>
          <button
            onClick={() => handleCommand("what time is it")}
            className="bg-purple-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-purple-500/30 transition-colors"
          >
            🕐 Time
          </button>
          <button
            onClick={() => handleCommand("open camera")}
            className="bg-red-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
          >
            📸 Camera
          </button>
          <button
            onClick={() => handleCommand("where am i")}
            className="bg-orange-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-orange-500/30 transition-colors"
          >
            📍 Location
          </button>
          <button
            onClick={() => handleCommand("check battery")}
            className="bg-yellow-500/20 text-white py-2 px-3 rounded-xl text-sm hover:bg-yellow-500/30 transition-colors"
          >
            🔋 Battery
          </button>
        </div>

        <p className="text-white/70 text-sm mt-4">
          Try: <span className="font-semibold">"call mom"</span>,{" "}
          <span className="font-semibold">"message john"</span>, or{" "}
          <span className="font-semibold">"what's my number"</span>
        </p>

        <div className="mt-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/60 text-xs">
            📱 Phone: {myPhoneNumber} • 📞 Calls: {callLog.length} • 💬 SMS: {smsLog.length}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isMobile ? "Full mobile features enabled" : "Limited features on desktop"}
          </p>
        </div>

        <div className="mt-4 text-white/40 text-xs">
          <p>All processing happens locally in your browser</p>
          <p className="mt-1">Microphone & permissions required for full features</p>
        </div>
      </div>

      <div className="mt-6 text-white/60 text-sm text-center max-w-md">
        <p className="font-medium mb-2">🌟 Smartphone Features:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 p-2 rounded">"Call [contact]"</div>
          <div className="bg-white/10 p-2 rounded">"Message [contact] [text]"</div>
          <div className="bg-white/10 p-2 rounded">"Save contact [name] [number]"</div>
          <div className="bg-white/10 p-2 rounded">"Open camera"</div>
          <div className="bg-white/10 p-2 rounded">"Send notification [text]"</div>
          <div className="bg-white/10 p-2 rounded">"What's my number"</div>
          <div className="bg-white/10 p-2 rounded">"Show call log"</div>
          <div className="bg-white/10 p-2 rounded">"Show contacts"</div>
        </div>
      </div>

      {/* Contact List */}
      {contacts.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <div className="bg-black/30 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">📇 Your Contacts</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {contacts.slice(0, 5).map((contact, index) => (
                <div key={index} className="flex justify-between items-center bg-white/10 p-2 rounded">
                  <span className="text-white text-sm">{contact.name}</span>
                  <span className="text-white/70 text-xs">{contact.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;