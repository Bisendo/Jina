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
    notifications: false,
    nfc: false,
    bluetooth: false,
    deviceOrientation: false,
    deviceMotion: false,
    screenWakeLock: false,
    mediaSession: false
  });

  const [contacts, setContacts] = useState([]);
  const [myPhoneNumber, setMyPhoneNumber] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [isWhatsAppWebOpen, setIsWhatsAppWebOpen] = useState(false);
  const [socialMediaStatus, setSocialMediaStatus] = useState({
    whatsapp: "",
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    telegram: ""
  });
  
  const [deviceInfo, setDeviceInfo] = useState({
    batteryLevel: null,
    networkType: null,
    isOnline: true,
    deviceModel: null,
    storageInfo: null
  });
  
  const [activeFeatures, setActiveFeatures] = useState({
    flashlight: false,
    screenLock: false,
    audioRecording: false,
    locationTracking: false
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const speechRecognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Check browser support on component mount
  useEffect(() => {
    checkFeatureSupport();
    setupContacts();
    setupEventListeners();
    detectMyPhoneNumber();
    detectDeviceInfo();
    setupDeviceListeners();
    requestPermissions();
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
      call: isMobile,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      notifications: 'Notification' in window,
      nfc: 'NDEFReader' in window,
      bluetooth: 'bluetooth' in navigator,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
      screenWakeLock: 'wakeLock' in navigator,
      mediaSession: 'mediaSession' in navigator
    });
  };

  const requestPermissions = async () => {
    try {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      // Request microphone permission
      if ('mediaDevices' in navigator) {
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => console.log("Microphone permission granted"))
          .catch(() => console.log("Microphone permission denied"));
      }
    } catch (error) {
      console.log("Permission request error:", error);
    }
  };

  const detectDeviceInfo = async () => {
    // Detect device model
    const userAgent = navigator.userAgent;
    let deviceModel = "Unknown Device";
    
    if (userAgent.match(/Android/i)) {
      const match = userAgent.match(/Android\s([0-9.]+)/);
      deviceModel = `Android ${match ? match[1] : ''}`;
    } else if (userAgent.match(/iPhone|iPad|iPod/i)) {
      const match = userAgent.match(/OS\s([0-9_]+)/);
      deviceModel = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`;
    }
    
    // Get battery status
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        setDeviceInfo(prev => ({ 
          ...prev, 
          batteryLevel: Math.round(battery.level * 100),
          isOnline: navigator.onLine
        }));
        
        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          setDeviceInfo(prev => ({ 
            ...prev, 
            batteryLevel: Math.round(battery.level * 100)
          }));
        });
      } catch (error) {
        console.log("Battery info not available:", error);
      }
    }
    
    // Get network type
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setDeviceInfo(prev => ({ ...prev, networkType: connection.effectiveType }));
        
        connection.addEventListener('change', () => {
          setDeviceInfo(prev => ({ 
            ...prev, 
            networkType: connection.effectiveType,
            isOnline: navigator.onLine
          }));
        });
      }
    }
    
    setDeviceInfo(prev => ({ ...prev, deviceModel }));
  };

  const setupDeviceListeners = () => {
    // Online/Offline detection
    window.addEventListener('online', () => {
      setDeviceInfo(prev => ({ ...prev, isOnline: true }));
      speak("You're back online");
    });
    
    window.addEventListener('offline', () => {
      setDeviceInfo(prev => ({ ...prev, isOnline: false }));
      speak("You're offline");
    });
    
    // Battery level alerts
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        battery.addEventListener('levelchange', () => {
          if (battery.level < 0.2) {
            speak("Battery is low, only " + Math.round(battery.level * 100) + " percent remaining");
          } else if (battery.level < 0.1) {
            speak("Critical battery level, please charge immediately");
          }
        });
      });
    }
  };

  const detectMyPhoneNumber = async () => {
    try {
      // Check for SIM card info (Android Chrome only)
      if ('connection' in navigator && isAndroid) {
        const connection = navigator.connection;
        // Some Android devices expose phone number through this API
      }
      
      // Try to detect from device (experimental)
      if ('userAgentData' in navigator) {
        const ua = navigator.userAgentData;
        if (ua.mobile) {
          // This is a mobile device
          // Set as first number from the two specified numbers
          setMyPhoneNumber("+255621690364");
        }
      }
      
      // Try contacts API
      if (supportedFeatures.contacts) {
        try {
          const contactManager = new ContactsManager();
          const props = await contactManager.getProperties(['name', 'tel']);
          if (props.includes('name') && props.includes('tel')) {
            const userContacts = await contactManager.select(['name', 'tel'], { multiple: true });
            const myContact = userContacts.find(c => 
              c.name && c.name[0].toLowerCase().includes('me')
            );
            if (myContact && myContact.tel && myContact.tel[0]) {
              setMyPhoneNumber(myContact.tel[0]);
            }
          }
        } catch (error) {
          console.log("Could not get phone from contacts:", error);
        }
      }
      
      // Check localStorage
      const savedNumber = localStorage.getItem('myPhoneNumber');
      if (savedNumber) {
        setMyPhoneNumber(savedNumber);
      }
    } catch (error) {
      console.log("Could not detect phone number:", error);
    }
  };

  const setupContacts = async () => {
    try {
      if (supportedFeatures.contacts) {
        const contactManager = new ContactsManager();
        const props = await contactManager.getProperties(['name', 'tel', 'email']);
        if (props.includes('name') && props.includes('tel')) {
          const userContacts = await contactManager.select(['name', 'tel', 'email'], { 
            multiple: true 
          });
          const formattedContacts = userContacts.map(contact => ({
            name: contact.name ? contact.name[0] : 'Unknown',
            number: contact.tel ? contact.tel[0] : '',
            email: contact.email ? contact.email[0] : '',
            isWhatsApp: false
          }));
          setContacts(formattedContacts);
          
          // Save to localStorage as backup
          localStorage.setItem('voiceAssistantContacts', JSON.stringify(formattedContacts));
          return;
        }
      }
      
      // Fallback to localStorage
      const savedContacts = localStorage.getItem('voiceAssistantContacts');
      if (savedContacts) {
        const contactsData = JSON.parse(savedContacts);
        setContacts(contactsData);
        
        // Mark contacts with WhatsApp
        const updatedContacts = contactsData.map(contact => {
          // Check if contact likely has WhatsApp (has phone number)
          return {
            ...contact,
            isWhatsApp: contact.number && contact.number.length > 5
          };
        });
        setContacts(updatedContacts);
      } else {
        // Default contacts with the two specified numbers
        const defaultContacts = [
          { name: "Biestore", number: "255621690364", email: "kimotobidaus@gmail.com", isWhatsApp: true },
          { name: "Emergency", number: "255747617575", email: "", isWhatsApp: true }
        ];
        setContacts(defaultContacts);
        localStorage.setItem('voiceAssistantContacts', JSON.stringify(defaultContacts));
      }
    } catch (error) {
      console.error("Error setting up contacts:", error);
      // Fallback to the two specified numbers
      const defaultContacts = [
        { name: "Biestore", number: "255621690364", email: "kimotobidaus@gmail.com", isWhatsApp: true },
        { name: "Emergency", number: "255747617575", email: "", isWhatsApp: true }
      ];
      setContacts(defaultContacts);
    }
  };

  const setupEventListeners = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        if (listening) {
          stopListening();
        } else {
          startListening();
        }
      }
    });
  };

  const handleVisibilityChange = () => {
    if (document.hidden && listening) {
      stopListening();
    }
  };

  // 🎤 VOICE LISTENING
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
    
    recognition.lang = isMobile ? "en-US" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);
    setMessage("🎤 Listening... Speak now!");
    setTips("Say a command like 'WhatsApp to Biestore hello' or 'turn on flashlight'");

    setTimeout(() => {
      if (listening) {
        stopListening();
        setMessage("Listening timed out. Click to try again.");
        speak("Listening timed out. Please try again.");
      }
    }, 15000);

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

  // 🧠 ENHANCED COMMAND HANDLER
  const handleCommand = (command) => {
    console.log("Processing command:", command);
    
    // WhatsApp Direct Message Commands
    if (command.includes("whatsapp") || command.includes("send on whatsapp")) {
      handleWhatsAppMessage(command);
    }
    // WhatsApp Status Commands
    else if (command.includes("whatsapp status") || command.includes("status on whatsapp")) {
      handleWhatsAppStatus(command);
    }
    // WhatsApp Broadcast
    else if (command.includes("whatsapp broadcast") || command.includes("broadcast on whatsapp")) {
      handleWhatsAppBroadcast(command);
    }
    // Social Media Commands
    else if (command.includes("facebook") || command.includes("instagram") || 
             command.includes("twitter") || command.includes("tiktok") || 
             command.includes("telegram")) {
      handleSocialMedia(command);
    }
    // Smartphone Feature Commands
    else if (command.includes("flashlight") || command.includes("torch")) {
      toggleFlashlight();
    }
    else if (command.includes("brightness") || command.includes("screen brightness")) {
      adjustBrightness(command);
    }
    else if (command.includes("volume") || command.includes("sound volume")) {
      adjustVolume(command);
    }
    else if (command.includes("record audio") || command.includes("start recording")) {
      startAudioRecording();
    }
    else if (command.includes("stop recording") || command.includes("end recording")) {
      stopAudioRecording();
    }
    else if (command.includes("take screenshot") || command.includes("capture screen")) {
      takeScreenshot();
    }
    else if (command.includes("set alarm") || command.includes("wake me up")) {
      setAlarm(command);
    }
    else if (command.includes("set timer") || command.includes("countdown")) {
      setTimer(command);
    }
    else if (command.includes("open app") || command.includes("launch app")) {
      openApp(command);
    }
    else if (command.includes("close app") || command.includes("exit app")) {
      speak("App closing feature requires native integration");
    }
    else if (command.includes("check data") || command.includes("mobile data")) {
      checkMobileData();
    }
    else if (command.includes("turn on wifi") || command.includes("enable wifi")) {
      toggleWifi(true);
    }
    else if (command.includes("turn off wifi") || command.includes("disable wifi")) {
      toggleWifi(false);
    }
    else if (command.includes("turn on bluetooth") || command.includes("enable bluetooth")) {
      toggleBluetooth(true);
    }
    else if (command.includes("turn off bluetooth") || command.includes("disable bluetooth")) {
      toggleBluetooth(false);
    }
    else if (command.includes("airplane mode") || command.includes("flight mode")) {
      toggleAirplaneMode(command);
    }
    else if (command.includes("do not disturb") || command.includes("silent mode")) {
      toggleDoNotDisturb(command);
    }
    // Call commands
    else if (command.includes("call") || command.includes("phone") || command.includes("dial")) {
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
    else if (command.includes("location") || command.includes("where am i") || command.includes("my location")) {
      getCurrentLocation();
    }
    // Battery commands
    else if (command.includes("battery") || command.includes("power level")) {
      getBatteryStatus();
    }
    // Share content commands
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
    // Show contacts
    else if (command.includes("my contacts") || command.includes("show contacts")) {
      listContacts();
    }
    // Repeat last command
    else if (command.includes("repeat") || command.includes("again")) {
      repeatLastCommand();
    }
    // Device info
    else if (command.includes("device info") || command.includes("phone info")) {
      showDeviceInfo();
    }
    else {
      speak("Sorry, I didn't understand that command.");
      setTips("💡 Try: 'WhatsApp to Biestore hello', 'turn on flashlight', 'set alarm 7am', or 'take screenshot'");
    }
  };

  // 🔊 SPEAK FUNCTION
  const speak = (text) => {
    if (!window.speechSynthesis) {
      console.log("Speech synthesis not supported");
      return;
    }
    
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    speech.pitch = 1.0;
    speech.volume = 1.0;
    
    // Set voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => v.lang.includes('en')) || voices[0];
      speech.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(speech);
  };

  // 📱 ENHANCED WHATSAPP DIRECT MESSAGING
  const handleWhatsAppMessage = (command) => {
    // Extract contact and message
    let contactQuery = "";
    let messageText = "";
    
    // Handle different command patterns
    if (command.includes("whatsapp to")) {
      const match = command.match(/whatsapp to\s+(.+?)\s+(.+)/i);
      if (match) {
        contactQuery = match[1].trim();
        messageText = match[2].trim();
      }
    } else if (command.includes("send whatsapp")) {
      const match = command.match(/send whatsapp\s+(.+?)\s+(.+)/i);
      if (match) {
        contactQuery = match[1].trim();
        messageText = match[2].trim();
      }
    } else if (command.includes("whatsapp")) {
      // Try to extract from simple format
      const parts = command.replace(/whatsapp\s+/i, '').split(/\s+(?=\S+$)/);
      if (parts.length >= 2) {
        contactQuery = parts.slice(0, -1).join(' ');
        messageText = parts[parts.length - 1];
      }
    }
    
    if (!contactQuery || !messageText) {
      speak("Who would you like to message on WhatsApp and what should I say?");
      setTips("💡 Try: 'WhatsApp to Biestore hello there' or 'send WhatsApp message to Emergency I need help'");
      return;
    }

    // Find contact
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      (c.number && c.number.includes(contactQuery.replace(/\D/g, '')))
    );

    if (contact) {
      sendDirectWhatsAppMessage(contact, messageText);
    } else {
      // Check if it's one of our two specified numbers
      if (contactQuery.includes("255621690364") || contactQuery.includes("621690364")) {
        const tempContact = { 
          name: "Biestore", 
          number: "255621690364",
          isWhatsApp: true 
        };
        sendDirectWhatsAppMessage(tempContact, messageText);
      } else if (contactQuery.includes("255747617575") || contactQuery.includes("747617575")) {
        const tempContact = { 
          name: "Emergency", 
          number: "255747617575",
          isWhatsApp: true 
        };
        sendDirectWhatsAppMessage(tempContact, messageText);
      } else {
        speak(`Contact ${contactQuery} not found. Only Biestore (255621690364) and Emergency (255747617575) are available.`);
        setTips(`Try: 'WhatsApp to Biestore [message]' or 'WhatsApp to Emergency [message]'`);
      }
    }
  };

  const sendDirectWhatsAppMessage = (contact, message) => {
    if (!isMobile) {
      speak("Direct WhatsApp messaging works best on mobile devices");
      setMessage("📱 Switch to mobile for direct WhatsApp");
      setTips("On desktop, I'll open WhatsApp Web instead");
    }
    
    // Format phone number for WhatsApp
    let phoneNumber = contact.number;
    if (phoneNumber) {
      // Remove all non-digits
      phoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Ensure proper format for WhatsApp
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '255' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('255') && phoneNumber.length === 9) {
        phoneNumber = '255' + phoneNumber;
      }
    }
    
    const encodedMessage = encodeURIComponent(message);
    let whatsappUrl = '';
    
    if (phoneNumber) {
      // Direct WhatsApp URL scheme
      whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    } else if (contact.group) {
      // For groups (requires group link)
      whatsappUrl = `whatsapp://`;
      speak("For WhatsApp groups, please open WhatsApp manually");
    } else {
      whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    }
    
    speak(`Sending WhatsApp message to ${contact.name || contact.number}: ${message}`);
    setMessage(`📱 WhatsApp to ${contact.name || 'contact'}...`);
    setTips(`Opening WhatsApp with message: "${message.substring(0, 50)}..."`);
    
    // Create a temporary link to trigger WhatsApp
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Try to open WhatsApp
    setTimeout(() => {
      link.click();
      
      // Fallback to web if app doesn't open
      setTimeout(() => {
        if (document.hasFocus()) {
          // WhatsApp app didn't open, use web version
          const webUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
          window.open(webUrl, '_blank');
          setTips("WhatsApp Web opened in browser");
        }
      }, 1000);
    }, 500);
  };

  // 📱 WHATSAPP STATUS
  const handleWhatsAppStatus = (command) => {
    const statusMatch = command.match(/whatsapp status\s+(.+)/i) || 
                       command.match(/status on whatsapp\s+(.+)/i);
    
    const statusText = statusMatch ? statusMatch[1].trim() : 
                      "Sharing from Voice Assistant! 🎤";
    
    const encodedText = encodeURIComponent(statusText);
    
    if (isMobile) {
      // Try to open WhatsApp Status directly
      const whatsappUrl = `whatsapp://status?text=${encodedText}`;
      
      speak(`Creating WhatsApp status: ${statusText}`);
      setMessage(`📱 WhatsApp Status: "${statusText}"`);
      setTips("Opening WhatsApp Status...");
      
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      
      setTimeout(() => {
        link.click();
        
        // Fallback
        setTimeout(() => {
          if (document.hasFocus()) {
            const fallbackUrl = `whatsapp://send?text=${encodedText}`;
            window.open(fallbackUrl, '_blank');
          }
        }, 1000);
      }, 500);
      
      // Save status locally
      setSocialMediaStatus(prev => ({
        ...prev,
        whatsapp: statusText
      }));
    } else {
      speak(`For WhatsApp status, please use your mobile phone`);
      setMessage(`💻 WhatsApp Status: "${statusText}"`);
      setTips("This feature works best on mobile devices");
      navigator.clipboard.writeText(statusText);
    }
  };

  // 📢 WHATSAPP BROADCAST
  const handleWhatsAppBroadcast = (command) => {
    const broadcastMatch = command.match(/broadcast\s+(.+)/i);
    const messageText = broadcastMatch ? broadcastMatch[1].trim() : "Important announcement!";
    
    // Get WhatsApp contacts (our two numbers)
    const whatsAppContacts = contacts.filter(c => c.isWhatsApp && c.number);
    
    if (whatsAppContacts.length === 0) {
      speak("No WhatsApp contacts found");
      setTips("Add contacts with phone numbers to use broadcast");
      return;
    }
    
    speak(`Sending broadcast to ${whatsAppContacts.length} contacts: ${messageText}`);
    setMessage(`📢 Broadcasting to ${whatsAppContacts.length} contacts`);
    
    // Send to both contacts
    whatsAppContacts.forEach((contact, index) => {
      setTimeout(() => {
        sendDirectWhatsAppMessage(contact, messageText);
      }, index * 2000); // Stagger messages
    });
  };

  // 📱 SMARTPHONE FEATURES
  const toggleFlashlight = () => {
    if (!isMobile) {
      speak("Flashlight only works on mobile devices");
      return;
    }
    
    if ('torch' in navigator.mediaDevices) {
      // Experimental torch API
      navigator.mediaDevices.getUserMedia({ video: { torch: true } })
        .then(stream => {
          const track = stream.getVideoTracks()[0];
          const torch = track.getCapabilities().torch;
          
          if (torch) {
            const newState = !activeFeatures.flashlight;
            track.applyConstraints({
              advanced: [{ torch: newState }]
            });
            
            setActiveFeatures(prev => ({ ...prev, flashlight: newState }));
            speak(newState ? "Flashlight turned on" : "Flashlight turned off");
            setMessage(newState ? "🔦 Flashlight ON" : "🔦 Flashlight OFF");
          } else {
            speak("Flashlight not supported on this device");
          }
        })
        .catch(() => {
          speak("Could not access flashlight");
        });
    } else {
      // Fallback using screen brightness
      speak("Using screen as flashlight");
      setActiveFeatures(prev => ({ ...prev, flashlight: !prev.flashlight }));
      
      if (activeFeatures.flashlight) {
        document.body.style.backgroundColor = "#000";
        document.body.style.filter = "brightness(100)";
        setMessage("🔦 Screen Flashlight ON");
      } else {
        document.body.style.backgroundColor = "";
        document.body.style.filter = "";
        setMessage("🔦 Flashlight OFF");
      }
    }
  };

  const adjustBrightness = (command) => {
    const brightnessMatch = command.match(/(increase|decrease|set)\s+brightness\s+(?:to\s+)?(\d+)/i);
    if (brightnessMatch) {
      const action = brightnessMatch[1].toLowerCase();
      let level = parseInt(brightnessMatch[2]);
      
      if (action === 'increase') {
        speak(`Increasing brightness to ${level}%`);
      } else if (action === 'decrease') {
        speak(`Decreasing brightness to ${level}%`);
      } else {
        speak(`Setting brightness to ${level}%`);
      }
      
      setMessage(`☀️ Brightness: ${level}%`);
      
      // In a real app, this would use device APIs
      setTips("Brightness control requires native app integration");
    } else {
      speak("Please specify brightness level");
    }
  };

  const adjustVolume = (command) => {
    const volumeMatch = command.match(/(increase|decrease|set)\s+volume\s+(?:to\s+)?(\d+)/i);
    if (volumeMatch) {
      const action = volumeMatch[1].toLowerCase();
      let level = parseInt(volumeMatch[2]);
      
      speak(`${action} volume to ${level} percent`);
      setMessage(`🔊 Volume: ${level}%`);
      
      // Create audio context for volume demonstration
      if (window.AudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440;
        gainNode.gain.value = level / 100;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 500);
      }
    }
  };

  const startAudioRecording = () => {
    if (!supportedFeatures.camera) {
      speak("Audio recording not supported");
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Create download link
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = `recording-${Date.now()}.wav`;
          a.click();
          
          speak("Recording saved");
          setMessage("🎙️ Recording saved");
        };
        
        mediaRecorderRef.current.start();
        setActiveFeatures(prev => ({ ...prev, audioRecording: true }));
        speak("Recording started");
        setMessage("🎙️ Recording...");
        setTips("Say 'stop recording' to save");
      })
      .catch(() => {
        speak("Microphone access denied");
      });
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && activeFeatures.audioRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setActiveFeatures(prev => ({ ...prev, audioRecording: false }));
      speak("Recording stopped");
    }
  };

  const takeScreenshot = () => {
    // For web apps, we can only capture the current tab
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
      // Chrome extension API
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        speak("Screenshot taken");
      });
    } else {
      // Use html2canvas for web page screenshots
      import('html2canvas').then(html2canvas => {
        html2canvas.default(document.body).then(canvas => {
          const link = document.createElement('a');
          link.download = `screenshot-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
          speak("Screenshot taken");
          setMessage("📸 Screenshot saved");
        });
      }).catch(() => {
        speak("Screenshot feature requires html2canvas library");
      });
    }
  };

  const setAlarm = (command) => {
    const timeMatch = command.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
      
      // Convert to 24-hour format
      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;
      
      const now = new Date();
      const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
      
      const timeUntilAlarm = alarmTime.getTime() - now.getTime();
      
      setTimeout(() => {
        speak("Alarm! Wake up!");
        triggerVibration();
        
        if (supportedFeatures.notifications) {
          new Notification('Alarm', { 
            body: 'Time to wake up!',
            icon: '/favicon.ico',
            requireInteraction: true
          });
        }
      }, timeUntilAlarm);
      
      const alarmTimeStr = alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      speak(`Alarm set for ${alarmTimeStr}`);
      setMessage(`⏰ Alarm set: ${alarmTimeStr}`);
    } else {
      speak("Please specify alarm time");
    }
  };

  const setTimer = (command) => {
    const timerMatch = command.match(/\b(\d+)\s*(minutes?|seconds?|hours?)\b/i);
    if (timerMatch) {
      const amount = parseInt(timerMatch[1]);
      const unit = timerMatch[2].toLowerCase();
      
      let milliseconds = 0;
      switch(unit.charAt(0)) {
        case 'h': milliseconds = amount * 3600000; break;
        case 'm': milliseconds = amount * 60000; break;
        case 's': milliseconds = amount * 1000; break;
      }
      
      speak(`Timer set for ${amount} ${unit}`);
      setMessage(`⏱️ Timer: ${amount} ${unit}`);
      
      setTimeout(() => {
        speak("Timer complete!");
        triggerVibration();
        setMessage("⏱️ Timer Complete!");
      }, milliseconds);
    }
  };

  const openApp = (command) => {
    const appMatch = command.match(/open\s+(.+)/i);
    if (appMatch) {
      const appName = appMatch[1].toLowerCase();
      let appUrl = '';
      
      switch(appName) {
        case 'whatsapp':
        case 'whatsapp app':
          appUrl = 'whatsapp://';
          break;
        case 'facebook':
        case 'facebook app':
          appUrl = isIOS ? 'fb://' : 'fb://page';
          break;
        case 'instagram':
          appUrl = 'instagram://';
          break;
        case 'twitter':
          appUrl = 'twitter://';
          break;
        case 'camera':
          appUrl = 'camera://';
          break;
        case 'gallery':
        case 'photos':
          appUrl = 'photos://';
          break;
        case 'settings':
          appUrl = isIOS ? 'App-Prefs://' : 'settings://';
          break;
        case 'phone':
        case 'dialer':
          appUrl = 'tel://';
          break;
        case 'messages':
        case 'sms':
          appUrl = 'sms://';
          break;
        default:
          speak(`I don't know how to open ${appName}`);
          return;
      }
      
      speak(`Opening ${appName}`);
      setMessage(`📱 Opening ${appName}`);
      
      const link = document.createElement('a');
      link.href = appUrl;
      link.target = '_blank';
      setTimeout(() => link.click(), 500);
    }
  };

  const checkMobileData = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      if (connection) {
        const type = connection.effectiveType;
        const downlink = connection.downlink;
        const saveData = connection.saveData;
        
        let message = `Network type: ${type}, Speed: ${downlink} Mbps`;
        if (saveData) message += ", Data saver: ON";
        
        speak(message);
        setMessage(`📶 ${type} (${downlink} Mbps)`);
      }
    } else {
      speak("Network information not available");
    }
  };

  const toggleWifi = (enable) => {
    if (isMobile) {
      speak(enable ? "Turning WiFi on" : "Turning WiFi off");
      setMessage(enable ? "📶 WiFi ON" : "📶 WiFi OFF");
      setTips("WiFi control requires native app or device permissions");
      
      // This would require a native app in production
      // For web, we can only show a notification
      if (supportedFeatures.notifications) {
        new Notification('WiFi Control', {
          body: `Would ${enable ? 'enable' : 'disable'} WiFi (requires app)`
        });
      }
    }
  };

  const toggleBluetooth = (enable) => {
    if (supportedFeatures.bluetooth) {
      if (enable) {
        navigator.bluetooth.requestDevice({ acceptAllDevices: true })
          .then(device => {
            speak(`Connected to ${device.name}`);
            setMessage(`🔵 Connected: ${device.name}`);
          })
          .catch(() => {
            speak("Bluetooth connection cancelled");
          });
      } else {
        speak("Bluetooth turned off");
        setMessage("🔵 Bluetooth OFF");
      }
    } else {
      speak("Bluetooth not supported");
    }
  };

  const toggleAirplaneMode = (command) => {
    const enable = command.includes("on") || command.includes("enable");
    speak(enable ? "Airplane mode on" : "Airplane mode off");
    setMessage(enable ? "✈️ Airplane Mode ON" : "✈️ Airplane Mode OFF");
    setTips("Airplane mode control requires native app");
  };

  const toggleDoNotDisturb = (command) => {
    const enable = command.includes("on") || !command.includes("off");
    speak(enable ? "Do not disturb mode activated" : "Do not disturb mode deactivated");
    setMessage(enable ? "🔕 Do Not Disturb ON" : "🔔 Do Not Disturb OFF");
    
    // Change tab title when in DND mode
    document.title = enable ? "🔕 Voice Assistant" : "Voice Assistant";
  };

  const showDeviceInfo = () => {
    const info = `
      Device: ${deviceInfo.deviceModel || 'Unknown'},
      Battery: ${deviceInfo.batteryLevel || 'Unknown'}%,
      Network: ${deviceInfo.networkType || 'Unknown'},
      Online: ${deviceInfo.isOnline ? 'Yes' : 'No'},
      Platform: ${isMobile ? 'Mobile' : 'Desktop'}
    `;
    
    speak(info);
    setMessage("📱 Device Information");
    setTips(`Battery: ${deviceInfo.batteryLevel || '?'}% • Network: ${deviceInfo.networkType || '?'}`);
  };

  // Social Media Handler
  const handleSocialMedia = (command) => {
    let platform = '';
    let action = '';
    let content = '';
    
    // Extract platform
    if (command.includes("facebook")) {
      platform = 'facebook';
      if (command.includes("post") || command.includes("status")) {
        action = 'post';
        content = command.replace(/.*facebook\s+(?:post|status)\s+/i, '');
      } else if (command.includes("message")) {
        action = 'message';
        content = command.replace(/.*facebook\s+message\s+/i, '');
      }
    } else if (command.includes("instagram")) {
      platform = 'instagram';
      if (command.includes("story")) {
        action = 'story';
        content = command.replace(/.*instagram\s+story\s+/i, '');
      } else if (command.includes("post")) {
        action = 'post';
        content = command.replace(/.*instagram\s+post\s+/i, '');
      }
    } else if (command.includes("twitter")) {
      platform = 'twitter';
      action = 'tweet';
      content = command.replace(/.*twitter\s+(?:post|tweet)\s+/i, '');
    } else if (command.includes("tiktok")) {
      platform = 'tiktok';
      action = 'video';
      speak("TikTok integration requires the app");
      return;
    } else if (command.includes("telegram")) {
      platform = 'telegram';
      action = 'message';
      content = command.replace(/.*telegram\s+/i, '');
    }
    
    if (!content) {
      content = "Shared from Voice Assistant";
    }
    
    shareOnSocialMedia(platform, action, content);
  };

  const shareOnSocialMedia = (platform, action, content) => {
    const encodedContent = encodeURIComponent(content);
    const encodedUrl = encodeURIComponent(window.location.href);
    let shareUrl = '';
    let platformName = '';
    
    switch(platform) {
      case 'facebook':
        platformName = 'Facebook';
        if (action === 'post') {
          shareUrl = `fb://composer?text=${encodedContent}`;
          if (!isMobile) {
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedContent}`;
          }
        }
        break;
      case 'instagram':
        platformName = 'Instagram';
        speak(`For Instagram, please open the app and ${action}: ${content}`);
        navigator.clipboard.writeText(content);
        return;
      case 'twitter':
        platformName = 'Twitter';
        shareUrl = `twitter://post?message=${encodedContent}`;
        if (!isMobile) {
          shareUrl = `https://twitter.com/intent/tweet?text=${encodedContent}&url=${encodedUrl}`;
        }
        break;
      case 'telegram':
        platformName = 'Telegram';
        shareUrl = `tg://msg?text=${encodedContent}`;
        break;
    }
    
    if (shareUrl) {
      speak(`Sharing on ${platformName}: ${content}`);
      setMessage(`📱 ${platformName}: "${content.substring(0, 30)}..."`);
      
      const link = document.createElement('a');
      link.href = shareUrl;
      link.target = '_blank';
      setTimeout(() => link.click(), 500);
    }
  };

  const handleCallCommand = (command) => {
    const contactMatch = command.match(/call\s+(.+)/i);
    if (!contactMatch) {
      speak("Who would you like to call?");
      setTips("💡 Try: 'call Biestore' or 'call Emergency'");
      return;
    }

    const contactQuery = contactMatch[1].trim();
    
    // Check for emergency numbers
    if (contactQuery.includes('emergency') || contactQuery.includes('ambulance')) {
      makeCall('112');
      return;
    }
    
    // Check if it's one of our two numbers
    if (contactQuery.includes("255621690364") || contactQuery.includes("621690364")) {
      makeCall("255621690364", "Biestore");
      return;
    } else if (contactQuery.includes("255747617575") || contactQuery.includes("747617575")) {
      makeCall("255747617575", "Emergency");
      return;
    }
    
    // Find contact by name
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase())
    );

    if (contact) {
      makeCall(contact.number, contact.name);
    } else {
      speak(`Contact ${contactQuery} not found. Only Biestore and Emergency are available.`);
      setTips("Try: 'call Biestore' or 'call Emergency'");
    }
  };

  const makeCall = (phoneNumber, contactName = null) => {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const telUrl = `tel:${formattedNumber}`;
    
    if (isMobile) {
      speak(`Calling ${contactName || phoneNumber}`);
      setMessage(`📞 Calling ${contactName || phoneNumber}...`);
      
      const link = document.createElement('a');
      link.href = telUrl;
      setTimeout(() => link.click(), 500);
    } else {
      speak(`On mobile, I would call ${contactName || phoneNumber}`);
      setMessage(`📞 Would call: ${contactName || formattedNumber}`);
      setTips("Phone calls only work on mobile devices");
    }
  };

  const handleSmsCommand = (command) => {
    const messageMatch = command.match(/message\s+(.+?)\s+(.+)/i);
    if (!messageMatch) {
      speak("Who would you like to message and what should I say?");
      setTips("💡 Try: 'message Biestore hello how are you'");
      return;
    }

    const contactQuery = messageMatch[1].trim();
    const messageText = messageMatch[2].trim();
    
    // Check if it's one of our two numbers
    if (contactQuery.includes("255621690364") || contactQuery.includes("621690364")) {
      sendSms("255621690364", messageText, "Biestore");
      return;
    } else if (contactQuery.includes("255747617575") || contactQuery.includes("747617575")) {
      sendSms("255747617575", messageText, "Emergency");
      return;
    }

    // Find contact by name
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase())
    );

    if (contact) {
      sendSms(contact.number, messageText, contact.name);
    } else {
      speak(`Contact ${contactQuery} not found. Only Biestore and Emergency are available.`);
      setTips("Try: 'message Biestore [your message]'");
    }
  };

  const sendSms = (phoneNumber, message, contactName = null) => {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;
    
    if (isMobile) {
      speak(`Sending message to ${contactName || phoneNumber}`);
      setMessage(`💬 SMS to ${contactName || phoneNumber}...`);
      
      const link = document.createElement('a');
      link.href = smsUrl;
      setTimeout(() => link.click(), 500);
    } else {
      speak(`On mobile, I would send SMS to ${contactName || phoneNumber}`);
      setMessage(`💬 Would SMS: ${contactName || formattedNumber}`);
    }
  };

  const handleContactCommand = (command) => {
    if (command.includes("save contact") || command.includes("add contact")) {
      speak("Only two contacts are supported: Biestore (255621690364) and Emergency (255747617575)");
      setTips("Contacts are fixed: Biestore and Emergency");
    } else if (command.includes("delete contact") || command.includes("remove contact")) {
      speak("Contacts cannot be deleted. Only Biestore and Emergency are available.");
    } else if (command.includes("show contacts") || command.includes("my contacts")) {
      listContacts();
    } else if (command.includes("find contact") || command.includes("search contact")) {
      handleSearchContact(command);
    }
  };

  const handleSearchContact = (command) => {
    const searchMatch = command.match(/find contact\s+(.+)/i);
    if (!searchMatch) {
      speak("Who are you looking for?");
      return;
    }

    const contactQuery = searchMatch[1].trim();
    const foundContacts = contacts.filter(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      c.number.includes(contactQuery)
    );

    if (foundContacts.length > 0) {
      const contactList = foundContacts.slice(0, 3).map(c => `${c.name}: ${c.number}`).join(", ");
      speak(`Found ${foundContacts.length} contacts: ${contactList}`);
      setMessage(`🔍 Found ${foundContacts.length} contacts`);
      setTips(foundContacts.slice(0, 3).map(c => `${c.name}`).join(", "));
    } else {
      speak(`No contacts found for ${contactQuery}. Only Biestore and Emergency are available.`);
    }
  };

  const listContacts = () => {
    if (contacts.length === 0) {
      speak("You have no contacts saved");
      setMessage("No contacts found");
      return;
    }
    
    const contactList = contacts.map(c => `${c.name}: ${c.number}`).join(", ");
    speak(`You have ${contacts.length} contacts: ${contactList}`);
    setMessage(`📇 Contacts (${contacts.length}):`);
    setTips(contacts.map(c => `${c.name}`).join(", "));
  };

  const handleCameraCommand = () => {
    if (!supportedFeatures.camera) {
      speak("Camera not supported");
      return;
    }

    speak("Opening camera. Allow access when prompted");
    setMessage("📸 Opening camera...");
    
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' },
      audio: false 
    })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.cssText = `
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000; max-width: 90%; max-height: 90%;
          border: 5px solid white; border-radius: 10px;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
        `;
        video.id = 'camera-feed';
        
        const controls = document.createElement('div');
        controls.style.cssText = `
          position: fixed; bottom: 20px; left: 50%;
          transform: translateX(-50%); z-index: 1001;
          display: flex; gap: 10px;
        `;
        
        const captureBtn = document.createElement('button');
        captureBtn.textContent = '📸 Take Photo';
        captureBtn.style.cssText = `
          padding: 10px 20px; background: #4CAF50;
          color: white; border: none; border-radius: 5px;
          cursor: pointer;
        `;
        captureBtn.onclick = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          const link = document.createElement('a');
          link.download = `photo-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          
          speak("Photo captured!");
        };
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖ Close';
        closeBtn.style.cssText = `
          padding: 10px 20px; background: red;
          color: white; border: none; border-radius: 5px;
          cursor: pointer;
        `;
        closeBtn.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          controls.remove();
          setMessage("Camera closed");
        };
        
        controls.appendChild(captureBtn);
        controls.appendChild(closeBtn);
        
        document.body.appendChild(video);
        document.body.appendChild(controls);
        
        speak("Camera is active. Say 'take photo' or 'close camera'");
        setTips("Camera active - say 'take photo' to capture");
      })
      .catch(error => {
        speak("Camera access denied");
        setMessage("❌ Camera access denied");
      });
  };

  const getCurrentTime = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    speak(`Current time is ${time}`);
    setMessage(`🕐 ${time}`);
  };

  const getCurrentDate = () => {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    speak(`Today is ${date}`);
    setMessage(`📅 ${date}`);
  };

  const getCurrentLocation = () => {
    if (!supportedFeatures.geolocation) {
      speak("Location not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        speak(`Your location is ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setMessage(`📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Create Google Maps link
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setTips(`📍 Open in Google Maps`);
        
        // Add clickable link
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = mapsUrl;
          link.target = '_blank';
          link.textContent = 'Open in Maps';
          link.style.cssText = 'color: white; text-decoration: underline;';
          document.querySelector('.tips-container')?.appendChild(link);
        }, 1000);
      },
      error => {
        speak("Could not get location");
        setMessage("❌ Location access denied");
      }
    );
  };

  const getBatteryStatus = async () => {
    if (supportedFeatures.battery) {
      try {
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        const charging = battery.charging ? " (charging)" : "";
        speak(`Battery is at ${level} percent${charging}`);
        setMessage(`🔋 ${level}%${charging ? ' ⚡' : ''}`);
      } catch {
        speak("Battery info not available");
      }
    } else {
      speak("Battery API not supported");
    }
  };

  const shareContent = async () => {
    if (supportedFeatures.share) {
      try {
        await navigator.share({
          title: 'Voice Assistant',
          text: 'Check out this amazing voice assistant!',
          url: window.location.href
        });
        speak("Content shared successfully");
      } catch {
        speak("Share cancelled");
      }
    } else {
      speak("Web Share API not supported");
    }
  };

  const copyToClipboard = async () => {
    if (supportedFeatures.clipboard) {
      try {
        await navigator.clipboard.writeText(myPhoneNumber || 'Phone number not detected');
        speak("Phone number copied to clipboard");
        setMessage("📋 Copied to clipboard");
      } catch {
        speak("Could not copy to clipboard");
      }
    }
  };

  const triggerVibration = () => {
    if (supportedFeatures.vibrate && isMobile) {
      navigator.vibrate([200, 100, 200, 100, 200]);
      speak("Device vibrating");
      setMessage("📳 Vibrating...");
    }
  };

  const sendNotification = (command) => {
    if (supportedFeatures.notifications) {
      if (Notification.permission === 'granted') {
        const text = command.replace(/notification\s+/i, '') || 'Voice Assistant Notification';
        new Notification('Voice Assistant', { 
          body: text,
          icon: '/favicon.ico'
        });
        speak("Notification sent");
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            sendNotification(command);
          }
        });
      }
    }
  };

  const showHelp = () => {
    const helpText = `I can help you with: 
      WhatsApp messages to Biestore (255621690364) and Emergency (255747617575),
      Social media posts,
      Phone calls to Biestore and Emergency,
      SMS to Biestore and Emergency,
      Camera and photos,
      Flashlight control,
      Alarm and timer,
      Screen recording,
      Device information,
      And much more!
      Try saying specific commands.`;
    speak(helpText);
    setMessage("ℹ️ Available Commands");
    setTips("WhatsApp to Biestore/Emergency, Call Biestore/Emergency, SMS, Camera, Flashlight, etc.");
  };

  const handleCalculation = (command) => {
    const calc = command.replace(/calculate\s+/i, '');
    try {
      // Simple calculation
      const result = eval(calc.replace(/[^0-9+\-*/().]/g, ''));
      speak(`${calc} equals ${result}`);
      setMessage(`🧮 ${calc} = ${result}`);
    } catch {
      speak("Could not calculate");
    }
  };

  const showMyNumber = () => {
    if (myPhoneNumber) {
      speak(`Your phone number is ${myPhoneNumber}`);
      setMessage(`📱 ${myPhoneNumber}`);
      setTips("Say 'copy my number' to copy to clipboard");
    } else {
      speak("Phone number not detected");
      setMessage("📱 Number not detected");
      setTips("Say 'set my number +255712345678' to save it");
    }
  };

  const repeatLastCommand = () => {
    if (lastCommand) {
      handleCommand(lastCommand);
    } else {
      speak("No previous command");
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && activeFeatures.audioRecording) {
        mediaRecorderRef.current.stop();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Turn off flashlight if active
      if (activeFeatures.flashlight) {
        document.body.style.backgroundColor = "";
        document.body.style.filter = "";
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full text-center border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            📱 Smart Voice Assistant
          </h1>
          <div className="text-white/80 text-sm">
            {deviceInfo.batteryLevel && `🔋 ${deviceInfo.batteryLevel}%`}
          </div>
        </div>
        
        <p className="text-white/80 text-sm mb-4">
          {isMobile ? "📱 Mobile" : "💻 Desktop"} • {contacts.length} Contacts
          {myPhoneNumber && ` • 📞 ${myPhoneNumber}`}
          {deviceInfo.networkType && ` • 📶 ${deviceInfo.networkType.toUpperCase()}`}
        </p>

        <div className="bg-white/20 rounded-2xl p-4 mb-4 text-white min-h-[120px] flex items-center justify-center font-medium text-lg break-words">
          {message}
        </div>

        {tips && (
          <div className="bg-yellow-300/20 text-yellow-100 text-sm p-3 rounded-xl mb-4 border border-yellow-100/30 tips-container">
            {tips}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-white/10 p-2 rounded-xl">
            <div className="text-white/70 text-xs">Active Features</div>
            <div className="text-white text-sm">
              {activeFeatures.flashlight && "🔦 "}
              {activeFeatures.audioRecording && "🎙️ "}
              {activeFeatures.locationTracking && "📍 "}
              {!activeFeatures.flashlight && !activeFeatures.audioRecording && !activeFeatures.locationTracking && "None"}
            </div>
          </div>
          <div className="bg-white/10 p-2 rounded-xl">
            <div className="text-white/70 text-xs">Device Status</div>
            <div className="text-white text-sm">
              {deviceInfo.isOnline ? "🟢 Online" : "🔴 Offline"}
              {deviceInfo.batteryLevel && deviceInfo.batteryLevel < 20 && " ⚠️"}
            </div>
          </div>
        </div>

        <button
          onClick={listening ? stopListening : startListening}
          className={`w-full py-3 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg ${
            listening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100"
          }`}
        >
          {listening ? "⏹️ Stop Listening" : "🎤 Start Voice Command"}
        </button>

        <div className="mt-6 grid grid-cols-4 gap-2">
          <button
            onClick={() => handleCommand("whatsapp to Biestore Hello from voice assistant!")}
            className="bg-green-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-600/40 flex flex-col items-center"
          >
            <span className="text-lg">📱</span>
            <span className="text-xs">WhatsApp</span>
          </button>
          <button
            onClick={toggleFlashlight}
            className="bg-yellow-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-yellow-600/40 flex flex-col items-center"
          >
            <span className="text-lg">🔦</span>
            <span className="text-xs">Flashlight</span>
          </button>
          <button
            onClick={() => handleCommand("call Biestore")}
            className="bg-green-700/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-700/40 flex flex-col items-center"
          >
            <span className="text-lg">📞</span>
            <span className="text-xs">Call</span>
          </button>
          <button
            onClick={startAudioRecording}
            className="bg-red-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-red-500/40 flex flex-col items-center"
          >
            <span className="text-lg">🎙️</span>
            <span className="text-xs">Record</span>
          </button>
          <button
            onClick={() => handleCommand("camera")}
            className="bg-purple-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-purple-600/40 flex flex-col items-center"
          >
            <span className="text-lg">📸</span>
            <span className="text-xs">Camera</span>
          </button>
          <button
            onClick={() => handleCommand("set alarm 7am")}
            className="bg-blue-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-blue-600/40 flex flex-col items-center"
          >
            <span className="text-lg">⏰</span>
            <span className="text-xs">Alarm</span>
          </button>
          <button
            onClick={() => handleCommand("my location")}
            className="bg-teal-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-teal-600/40 flex flex-col items-center"
          >
            <span className="text-lg">📍</span>
            <span className="text-xs">Location</span>
          </button>
          <button
            onClick={showHelp}
            className="bg-gray-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-gray-600/40 flex flex-col items-center"
          >
            <span className="text-lg">❓</span>
            <span className="text-xs">Help</span>
          </button>
        </div>

        <p className="text-white/70 text-sm mt-4">
          Try: <span className="font-semibold">"WhatsApp to Biestore hello"</span>,{" "}
          <span className="font-semibold">"Call Emergency"</span>, or{" "}
          <span className="font-semibold">"Set alarm 7am"</span>
        </p>

        <div className="mt-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/60 text-xs">
            📱 Direct WhatsApp • 🔦 Flashlight Control • 🎙️ Audio Recording • 📸 Camera
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isMobile ? "Full smartphone integration enabled" : "Desktop mode - limited features"}
          </p>
        </div>

        <div className="mt-4 text-white/40 text-xs">
          <p>Press Ctrl+Space to start/stop listening • All processing happens locally</p>
          <p className="mt-1">Microphone & contact permissions required for full features</p>
        </div>
      </div>

      <div className="mt-6 text-white/60 text-sm text-center max-w-md">
        <p className="font-medium mb-2">🚀 Smartphone Features:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 p-2 rounded">"WhatsApp to Biestore [message]"</div>
          <div className="bg-white/10 p-2 rounded">"WhatsApp to Emergency [message]"</div>
          <div className="bg-white/10 p-2 rounded">"Turn on flashlight"</div>
          <div className="bg-white/10 p-2 rounded">"Start recording"</div>
          <div className="bg-white/10 p-2 rounded">"Take screenshot"</div>
          <div className="bg-white/10 p-2 rounded">"Set alarm 7:30"</div>
          <div className="bg-white/10 p-2 rounded">"Set timer 5 minutes"</div>
          <div className="bg-white/10 p-2 rounded">"Open camera"</div>
          <div className="bg-white/10 p-2 rounded">"My location"</div>
          <div className="bg-white/10 p-2 rounded">"Check battery"</div>
          <div className="bg-white/10 p-2 rounded">"Device info"</div>
          <div className="bg-white/10 p-2 rounded">"Do not disturb on"</div>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <div className="bg-black/30 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2 flex items-center justify-between">
              <span>📇 Your Contacts ({contacts.length})</span>
              <button 
                onClick={() => listContacts()}
                className="text-xs bg-white/20 px-2 py-1 rounded"
              >
                Refresh
              </button>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {contacts.map((contact, index) => (
                <div key={index} className="flex justify-between items-center bg-white/10 p-2 rounded">
                  <div className="flex items-center">
                    <span className="text-white text-sm">{contact.name}</span>
                    {contact.isWhatsApp && (
                      <span className="ml-2 text-green-400 text-xs">(WhatsApp)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {contact.number && (
                      <>
                        <button 
                          onClick={() => makeCall(contact.number, contact.name)}
                          className="text-xs bg-green-500/30 px-2 py-1 rounded"
                        >
                          📞
                        </button>
                        <button 
                          onClick={() => sendDirectWhatsAppMessage(contact, "Hello!")}
                          className="text-xs bg-green-600/30 px-2 py-1 rounded"
                        >
                          📱
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-white/40 text-xs text-center">
        <p>Voice Assistant v2.0 • Enhanced Smartphone Features</p>
        <p>Contacts: Biestore (255621690364) • Emergency (255747617575)</p>
        <p>Supports Android & iOS • Works best with Chrome on mobile</p>
      </div>
    </div>
  );
}

export default Home;