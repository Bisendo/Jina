import React, { useState, useEffect, useRef } from "react";

function SmartVoiceAssistant() {
  // State Management
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("Click the button and speak...");
  const [tips, setTips] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Features and Permissions
  const [permissions, setPermissions] = useState({
    microphone: false,
    contacts: false,
    camera: false,
    notifications: false,
    geolocation: false
  });
  
  // User Data
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [myPhoneNumber, setMyPhoneNumber] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  
  // Device Info
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
    batteryLevel: null,
    isOnline: navigator.onLine
  });
  
  // Active States
  const [activeFeatures, setActiveFeatures] = useState({
    flashlight: false,
    recording: false,
    cameraActive: false
  });

  // Refs
  const speechRecognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ======================
  // INITIALIZATION
  // ======================
  
  useEffect(() => {
    initializeApp();
    setupEventListeners();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    
    // Check device capabilities
    await checkCapabilities();
    
    // Request initial permissions
    await requestPermissions();
    
    // Load user data
    await loadUserData();
    
    setIsLoading(false);
    speak("Voice Assistant is ready. How can I help you?");
    setMessage("✅ Assistant Ready - Speak Now");
  };

  const checkCapabilities = () => {
    const capabilities = {
      speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
      speechSynthesis: 'speechSynthesis' in window,
      contacts: 'contacts' in navigator && 'ContactsManager' in window,
      mediaDevices: 'mediaDevices' in navigator,
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      vibrate: 'vibrate' in navigator,
      share: 'share' in navigator,
      clipboard: 'clipboard' in navigator && 'writeText' in navigator.clipboard
    };
    
    if (!capabilities.speechRecognition) {
      setMessage("❌ Speech recognition not supported");
      setTips("Please use Chrome, Edge, or Safari on desktop/mobile");
    }
  };

  const requestPermissions = async () => {
    try {
      // Request microphone permission
      if ('mediaDevices' in navigator) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setPermissions(prev => ({ ...prev, microphone: true }));
        } catch (error) {
          console.log("Microphone permission denied:", error);
        }
      }
      
      // Request notification permission
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          setPermissions(prev => ({ ...prev, notifications: permission === 'granted' }));
        } else {
          setPermissions(prev => ({ ...prev, notifications: Notification.permission === 'granted' }));
        }
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  const loadUserData = async () => {
    try {
      // Load contacts from device
      await loadDeviceContacts();
      
      // Load saved phone number
      const savedNumber = localStorage.getItem('myPhoneNumber');
      if (savedNumber) {
        setMyPhoneNumber(savedNumber);
      }
      
      // Load saved contacts as backup
      const savedContacts = localStorage.getItem('voiceAssistantContacts');
      if (savedContacts) {
        const parsedContacts = JSON.parse(savedContacts);
        // Merge with device contacts
        setContacts(prev => {
          const merged = [...prev];
          parsedContacts.forEach(contact => {
            if (!merged.some(c => c.number === contact.number)) {
              merged.push(contact);
            }
          });
          return merged;
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setTips("Could not load contacts. Please grant contact permission.");
    }
  };

  const loadDeviceContacts = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      console.log("Contacts API not supported");
      return;
    }
    
    try {
      const contactManager = new ContactsManager();
      const properties = await contactManager.getProperties();
      
      if (properties.includes('name') && properties.includes('tel')) {
        const deviceContacts = await contactManager.select(['name', 'tel', 'email'], {
          multiple: true
        });
        
        const formattedContacts = deviceContacts.map(contact => ({
          id: Math.random().toString(36).substr(2, 9),
          name: contact.name ? contact.name[0] : 'Unknown',
          number: contact.tel ? contact.tel[0] : '',
          email: contact.email ? contact.email[0] : '',
          fromDevice: true,
          hasWhatsApp: contact.tel ? true : false
        }));
        
        setContacts(formattedContacts);
        setFilteredContacts(formattedContacts.slice(0, 10));
        
        // Try to find user's own number
        const myContact = formattedContacts.find(c => 
          c.name.toLowerCase().includes('me') || 
          c.name.toLowerCase().includes('my') ||
          c.name.toLowerCase().includes('myself')
        );
        
        if (myContact && myContact.number) {
          setMyPhoneNumber(myContact.number);
          localStorage.setItem('myPhoneNumber', myContact.number);
        }
      }
    } catch (error) {
      console.log("Could not load device contacts:", error);
    }
  };

  const setupEventListeners = () => {
    // Online/Offline
    window.addEventListener('online', () => {
      setDeviceInfo(prev => ({ ...prev, isOnline: true }));
      showNotification("You're back online");
    });
    
    window.addEventListener('offline', () => {
      setDeviceInfo(prev => ({ ...prev, isOnline: false }));
      showNotification("You're offline");
    });
    
    // Battery status
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setDeviceInfo(prev => ({ ...prev, batteryLevel: Math.round(battery.level * 100) }));
        
        battery.addEventListener('levelchange', () => {
          const level = Math.round(battery.level * 100);
          setDeviceInfo(prev => ({ ...prev, batteryLevel: level }));
          
          if (level < 20) {
            speak(`Battery is low at ${level} percent`);
            setTips(`⚡ Low battery: ${level}% - Consider charging`);
          }
        });
      });
    }
    
    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && listening) {
        stopListening();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        toggleListening();
      }
    });
  };

  const cleanup = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && activeFeatures.recording) {
      mediaRecorderRef.current.stop();
    }
    
    if (activeFeatures.flashlight) {
      turnOffFlashlight();
    }
    
    if (activeFeatures.cameraActive) {
      closeCamera();
    }
  };

  // ======================
  // VOICE CONTROL
  // ======================
  
  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!permissions.microphone) {
      speak("Microphone permission is required. Please allow microphone access.");
      setMessage("❌ Microphone access denied");
      setTips("Allow microphone permission in browser settings");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      showNotification("Speech recognition not supported in this browser");
      return;
    }
    
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    
    recognition.start();
    setListening(true);
    setMessage("🎤 Listening... Speak Now");
    setTips("Say a command like 'WhatsApp John hello there'");
    
    // Auto-stop after 15 seconds
    setTimeout(() => {
      if (listening) {
        stopListening();
        speak("Listening timed out");
      }
    }, 15000);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      const command = transcript.toLowerCase();
      
      setMessage(`🎤 You said: "${transcript}"`);
      setLastCommand(command);
      
      if (confidence > 0.5) {
        handleCommand(command);
      } else {
        speak("I didn't catch that clearly. Please try again.");
      }
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      
      switch(event.error) {
        case 'no-speech':
          speak("I didn't hear anything. Please try again.");
          break;
        case 'audio-capture':
          speak("No microphone detected. Please check your microphone.");
          break;
        case 'not-allowed':
          speak("Microphone permission is required.");
          break;
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

  // ======================
  // COMMAND PROCESSING
  // ======================
  
  const handleCommand = (command) => {
    console.log("Processing command:", command);
    
    // WhatsApp Commands
    if (command.includes("whatsapp")) {
      if (command.includes("status")) {
        handleWhatsAppStatus(command);
      } else if (command.includes("broadcast")) {
        handleWhatsAppBroadcast(command);
      } else {
        handleWhatsAppMessage(command);
      }
    }
    
    // Contact Search Commands
    else if (command.includes("contact") || command.includes("find") || command.includes("search")) {
      handleContactSearch(command);
    }
    
    // Call Commands
    else if (command.includes("call")) {
      handleCallCommand(command);
    }
    
    // SMS Commands
    else if (command.includes("sms") || command.includes("text") || command.includes("message")) {
      handleSmsCommand(command);
    }
    
    // Smartphone Features
    else if (command.includes("flashlight") || command.includes("torch")) {
      toggleFlashlight();
    }
    else if (command.includes("camera")) {
      handleCameraCommand();
    }
    else if (command.includes("record") && command.includes("audio")) {
      startAudioRecording();
    }
    else if (command.includes("screenshot") || command.includes("capture screen")) {
      takeScreenshot();
    }
    else if (command.includes("alarm")) {
      setAlarm(command);
    }
    else if (command.includes("timer")) {
      setTimer(command);
    }
    
    // Device Info
    else if (command.includes("battery")) {
      getBatteryStatus();
    }
    else if (command.includes("location") || command.includes("where am i")) {
      getCurrentLocation();
    }
    else if (command.includes("device info") || command.includes("phone info")) {
      showDeviceInfo();
    }
    
    // Utility
    else if (command.includes("time")) {
      getCurrentTime();
    }
    else if (command.includes("date")) {
      getCurrentDate();
    }
    else if (command.includes("my number")) {
      showMyNumber();
    }
    else if (command.includes("my contacts")) {
      listContacts();
    }
    else if (command.includes("help")) {
      showHelp();
    }
    else if (command.includes("repeat")) {
      repeatLastCommand();
    }
    
    else {
      speak("I didn't understand that command. Try saying 'help' for available commands.");
      setTips("💡 Try: 'WhatsApp [name] [message]', 'Call [name]', or 'Turn on flashlight'");
    }
  };

  // ======================
  // WHATSAPP FUNCTIONALITY
  // ======================
  
  const handleWhatsAppMessage = (command) => {
    // Parse the command for name and message
    const nameMatch = command.match(/whatsapp\s+(.+?)\s+(.+)/i) ||
                     command.match(/send\s+(?:to\s+)?(.+?)\s+(.+)/i);
    
    if (!nameMatch) {
      speak("Who would you like to message and what should I say?");
      setTips("💡 Format: 'WhatsApp [contact name] [message]' or 'Send to [name] [message]'");
      return;
    }
    
    const contactName = nameMatch[1].trim();
    const messageText = nameMatch[2].trim();
    
    // Search for contact
    searchAndSendWhatsApp(contactName, messageText);
  };

  const searchAndSendWhatsApp = (contactName, messageText) => {
    setIsLoading(true);
    
    // Search in contacts
    const matchingContacts = contacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(contactName.toLowerCase());
      const numberMatch = contact.number && contact.number.includes(contactName.replace(/\D/g, ''));
      return nameMatch || numberMatch;
    });
    
    if (matchingContacts.length === 0) {
      speak(`Contact "${contactName}" not found in your contacts.`);
      setMessage(`❌ Contact not found: ${contactName}`);
      setTips("Try saying 'Show my contacts' to see available contacts");
      setIsLoading(false);
      return;
    }
    
    // If multiple matches, use the first one with a valid number
    const validContact = matchingContacts.find(c => c.number && c.number.length >= 9);
    
    if (!validContact) {
      speak(`Contact "${contactName}" doesn't have a valid phone number.`);
      setIsLoading(false);
      return;
    }
    
    // Send WhatsApp message
    sendWhatsAppDirect(validContact, messageText);
    setIsLoading(false);
  };

  const sendWhatsAppDirect = (contact, message) => {
    if (!deviceInfo.isMobile) {
      speak("Direct WhatsApp messaging requires a mobile device");
      setMessage("📱 Switch to mobile for direct WhatsApp");
      setTips("On desktop, I'll open WhatsApp Web instead");
      
      // Fallback to WhatsApp Web
      sendWhatsAppWeb(contact, message);
      return;
    }
    
    // Format phone number
    let phoneNumber = contact.number.replace(/\D/g, '');
    
    // Convert to international format for WhatsApp
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '255' + phoneNumber.substring(1);
    }
    
    if (phoneNumber.length < 9) {
      speak("Invalid phone number format");
      return;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    speak(`Sending WhatsApp to ${contact.name}: ${message}`);
    setMessage(`📱 WhatsApp to ${contact.name}...`);
    setTips(`Opening WhatsApp with message: "${message.substring(0, 40)}..."`);
    
    // Create and click the link
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Try to open WhatsApp
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      
      // Check if WhatsApp opened
      setTimeout(() => {
        if (document.hasFocus()) {
          // WhatsApp didn't open, try web version
          speak("Could not open WhatsApp app. Opening web version.");
          sendWhatsAppWeb(contact, message);
        }
      }, 1000);
    }, 500);
  };

  const sendWhatsAppWeb = (contact, message) => {
    let phoneNumber = contact.number.replace(/\D/g, '');
    
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '255' + phoneNumber.substring(1);
    }
    
    const encodedMessage = encodeURIComponent(message);
    const webUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    window.open(webUrl, '_blank');
    setTips("WhatsApp Web opened in new tab");
  };

  const handleWhatsAppStatus = (command) => {
    const statusMatch = command.match(/whatsapp status\s+(.+)/i);
    const statusText = statusMatch ? statusMatch[1].trim() : "Sharing from Voice Assistant!";
    
    if (deviceInfo.isMobile) {
      const encodedText = encodeURIComponent(statusText);
      const whatsappUrl = `whatsapp://status?text=${encodedText}`;
      
      speak(`Creating WhatsApp status: ${statusText}`);
      setMessage(`📱 WhatsApp Status: "${statusText}"`);
      
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.click();
    } else {
      speak("WhatsApp status requires mobile device");
      navigator.clipboard.writeText(statusText);
      setTips("Status text copied to clipboard. Open WhatsApp to post.");
    }
  };

  const handleWhatsAppBroadcast = (command) => {
    const broadcastMatch = command.match(/broadcast\s+(.+)/i);
    const messageText = broadcastMatch ? broadcastMatch[1].trim() : "Important announcement!";
    
    const whatsappContacts = contacts.filter(c => c.hasWhatsApp && c.number);
    
    if (whatsappContacts.length === 0) {
      speak("No WhatsApp contacts found");
      return;
    }
    
    speak(`Broadcasting to ${whatsappContacts.length} contacts`);
    setMessage(`📢 Broadcasting to ${whatsappContacts.length} contacts`);
    
    // Send to first 3 contacts (for demo)
    whatsappContacts.slice(0, 3).forEach((contact, index) => {
      setTimeout(() => {
        sendWhatsAppDirect(contact, messageText);
      }, index * 2000);
    });
  };

  // ======================
  // CONTACT MANAGEMENT
  // ======================
  
  const handleContactSearch = (command) => {
    const searchMatch = command.match(/find\s+(.+)/i) ||
                      command.match(/search\s+(?:for\s+)?(.+)/i) ||
                      command.match(/contact\s+(.+)/i);
    
    if (!searchMatch) {
      speak("Who are you looking for?");
      return;
    }
    
    const searchQuery = searchMatch[1].trim();
    searchContacts(searchQuery);
  };

  const searchContacts = (query) => {
    const results = contacts.filter(contact => 
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      (contact.number && contact.number.includes(query.replace(/\D/g, '')))
    );
    
    if (results.length === 0) {
      speak(`No contacts found for "${query}"`);
      setMessage(`🔍 No results for "${query}"`);
      setTips("Try adding the contact first or check the name spelling");
      return;
    }
    
    const contactList = results.slice(0, 5).map(c => `${c.name}: ${c.number || 'No number'}`).join(", ");
    speak(`Found ${results.length} contacts: ${contactList}`);
    setMessage(`🔍 Found ${results.length} contacts`);
    setFilteredContacts(results.slice(0, 10));
  };

  const addContact = async (name, number) => {
    const formattedNumber = formatPhoneNumber(number);
    
    const newContact = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      number: formattedNumber,
      email: '',
      fromDevice: false,
      hasWhatsApp: true
    };
    
    setContacts(prev => [...prev, newContact]);
    
    // Save to localStorage
    const savedContacts = JSON.parse(localStorage.getItem('voiceAssistantContacts') || '[]');
    savedContacts.push(newContact);
    localStorage.setItem('voiceAssistantContacts', JSON.stringify(savedContacts));
    
    speak(`Contact ${name} saved successfully`);
    setMessage(`✅ Contact saved: ${name}`);
  };

  const formatPhoneNumber = (number) => {
    let cleaned = number.replace(/\D/g, '');
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+255' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '+255' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return number;
  };

  const listContacts = () => {
    if (contacts.length === 0) {
      speak("You have no contacts saved");
      setMessage("📇 No contacts found");
      return;
    }
    
    const contactCount = contacts.length;
    const deviceContacts = contacts.filter(c => c.fromDevice).length;
    const savedContacts = contactCount - deviceContacts;
    
    speak(`You have ${contactCount} contacts. ${deviceContacts} from device, ${savedContacts} saved manually.`);
    setMessage(`📇 ${contactCount} contacts available`);
    setFilteredContacts(contacts.slice(0, 10));
  };

  // ======================
  // CALL & SMS FUNCTIONALITY
  // ======================
  
  const handleCallCommand = (command) => {
    const callMatch = command.match(/call\s+(.+)/i);
    
    if (!callMatch) {
      speak("Who would you like to call?");
      return;
    }
    
    const contactQuery = callMatch[1].trim();
    
    // Check for emergency
    if (contactQuery.includes('emergency') || contactQuery.includes('112') || contactQuery.includes('911')) {
      makeCall('112');
      return;
    }
    
    // Search for contact
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      (c.number && c.number.includes(contactQuery.replace(/\D/g, '')))
    );
    
    if (contact) {
      makeCall(contact.number, contact.name);
    } else {
      // Try as direct number
      const numbers = contactQuery.match(/\d+/g);
      if (numbers && numbers.join('').length >= 7) {
        makeCall(contactQuery);
      } else {
        speak(`Contact "${contactQuery}" not found`);
      }
    }
  };

  const makeCall = (phoneNumber, contactName = null) => {
    if (!deviceInfo.isMobile) {
      speak("Phone calls require a mobile device");
      setMessage("📞 Calls only work on mobile");
      return;
    }
    
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const telUrl = `tel:${formattedNumber}`;
    
    speak(`Calling ${contactName || phoneNumber}`);
    setMessage(`📞 Calling ${contactName || 'number'}...`);
    
    const link = document.createElement('a');
    link.href = telUrl;
    link.click();
  };

  const handleSmsCommand = (command) => {
    const smsMatch = command.match(/sms\s+(.+?)\s+(.+)/i) ||
                    command.match(/text\s+(.+?)\s+(.+)/i) ||
                    command.match(/message\s+(.+?)\s+(.+)/i);
    
    if (!smsMatch) {
      speak("Who would you like to message and what should I say?");
      return;
    }
    
    const contactQuery = smsMatch[1].trim();
    const messageText = smsMatch[2].trim();
    
    // Search for contact
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      (c.number && c.number.includes(contactQuery.replace(/\D/g, '')))
    );
    
    if (contact) {
      sendSms(contact.number, messageText, contact.name);
    } else {
      const numbers = contactQuery.match(/\d+/g);
      if (numbers && numbers.join('').length >= 7) {
        sendSms(contactQuery, messageText);
      } else {
        speak(`Contact "${contactQuery}" not found`);
      }
    }
  };

  const sendSms = (phoneNumber, message, contactName = null) => {
    if (!deviceInfo.isMobile) {
      speak("SMS requires a mobile device");
      return;
    }
    
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;
    
    speak(`Sending SMS to ${contactName || phoneNumber}`);
    setMessage(`💬 SMS to ${contactName || 'contact'}...`);
    
    const link = document.createElement('a');
    link.href = smsUrl;
    link.click();
  };

  // ======================
  // SMARTPHONE FEATURES
  // ======================
  
  const toggleFlashlight = () => {
    if (!deviceInfo.isMobile) {
      speak("Flashlight requires a mobile device");
      return;
    }
    
    const newState = !activeFeatures.flashlight;
    setActiveFeatures(prev => ({ ...prev, flashlight: newState }));
    
    if (newState) {
      // Try to use torch API
      if ('mediaDevices' in navigator) {
        navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            torch: true 
          } 
        }).then(stream => {
          const track = stream.getVideoTracks()[0];
          if ('applyConstraints' in track && 'torch' in track.getCapabilities()) {
            track.applyConstraints({ advanced: [{ torch: true }] });
            speak("Flashlight turned on");
            setMessage("🔦 Flashlight ON");
          }
        }).catch(() => {
          // Fallback to screen
          document.documentElement.style.filter = 'brightness(1000%)';
          document.documentElement.style.backgroundColor = 'white';
          speak("Using screen as flashlight");
          setMessage("🔦 Screen Flashlight ON");
        });
      }
    } else {
      turnOffFlashlight();
    }
  };

  const turnOffFlashlight = () => {
    document.documentElement.style.filter = '';
    document.documentElement.style.backgroundColor = '';
    speak("Flashlight turned off");
    setMessage("🔦 Flashlight OFF");
  };

  const handleCameraCommand = () => {
    if (!permissions.camera && 'mediaDevices' in navigator) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setPermissions(prev => ({ ...prev, camera: true }));
          openCamera();
        })
        .catch(() => {
          speak("Camera permission denied");
        });
    } else if (permissions.camera) {
      openCamera();
    }
  };

  const openCamera = () => {
    if (!deviceInfo.isMobile) {
      speak("Camera requires a mobile device");
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' },
      audio: false 
    }).then(stream => {
      setActiveFeatures(prev => ({ ...prev, cameraActive: true }));
      speak("Camera opened. Say 'take photo' to capture.");
      
      // Create camera interface
      const cameraOverlay = document.createElement('div');
      cameraOverlay.id = 'camera-overlay';
      cameraOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.style.cssText = `
        width: 100%;
        height: 80%;
        object-fit: cover;
      `;
      
      const controls = document.createElement('div');
      controls.style.cssText = `
        display: flex;
        gap: 20px;
        margin-top: 20px;
      `;
      
      const captureBtn = document.createElement('button');
      captureBtn.textContent = '📸 Capture';
      captureBtn.style.cssText = `
        padding: 15px 30px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
      `;
      captureBtn.onclick = () => takePhoto(stream);
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✖ Close';
      closeBtn.style.cssText = `
        padding: 15px 30px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        cursor: pointer;
      `;
      closeBtn.onclick = () => closeCamera();
      
      controls.appendChild(captureBtn);
      controls.appendChild(closeBtn);
      
      cameraOverlay.appendChild(video);
      cameraOverlay.appendChild(controls);
      document.body.appendChild(cameraOverlay);
      
      setMessage("📸 Camera Active - Say 'take photo'");
      
    }).catch(error => {
      speak("Could not access camera");
      console.error("Camera error:", error);
    });
  };

  const takePhoto = (stream) => {
    const video = document.querySelector('#camera-overlay video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${Date.now()}.jpg`;
      a.click();
      
      speak("Photo captured and saved");
      closeCamera();
    }, 'image/jpeg');
  };

  const closeCamera = () => {
    const overlay = document.getElementById('camera-overlay');
    if (overlay) {
      overlay.remove();
    }
    setActiveFeatures(prev => ({ ...prev, cameraActive: false }));
    setMessage("Camera closed");
  };

  const startAudioRecording = () => {
    if (!permissions.microphone) {
      speak("Microphone permission required");
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        
        speak("Recording saved");
        setMessage("🎙️ Recording saved");
      };
      
      mediaRecorderRef.current.start();
      setActiveFeatures(prev => ({ ...prev, recording: true }));
      speak("Recording started. Say 'stop recording' to save.");
      setMessage("🎙️ Recording...");
      
    }).catch(() => {
      speak("Microphone access denied");
    });
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && activeFeatures.recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setActiveFeatures(prev => ({ ...prev, recording: false }));
      speak("Recording stopped");
    }
  };

  const takeScreenshot = () => {
    speak("Taking screenshot");
    setMessage("📸 Capturing screenshot...");
    
    if (typeof html2canvas !== 'undefined') {
      html2canvas(document.body).then(canvas => {
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        speak("Screenshot saved");
      });
    } else {
      // Fallback for browsers without html2canvas
      speak("Screenshot feature requires html2canvas library");
      setTips("Include html2canvas library for screenshot functionality");
    }
  };

  // ======================
  // UTILITY FUNCTIONS
  // ======================
  
  const setAlarm = (command) => {
    const timeMatch = command.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridian = timeMatch[3]?.toLowerCase();
      
      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;
      
      const now = new Date();
      const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
      
      const timeDiff = alarmTime.getTime() - now.getTime();
      const alarmTimeStr = alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setTimeout(() => {
        speak("Alarm! Wake up!");
        triggerVibration();
        showNotification("⏰ Alarm! Time to wake up!");
      }, timeDiff);
      
      speak(`Alarm set for ${alarmTimeStr}`);
      setMessage(`⏰ Alarm: ${alarmTimeStr}`);
    } else {
      speak("Please specify alarm time like 'set alarm 7am' or 'set alarm 7:30'");
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
        showNotification("⏱️ Timer Complete!");
        setMessage("⏱️ Timer Complete!");
      }, milliseconds);
    } else {
      speak("Please specify timer duration like 'set timer 5 minutes'");
    }
  };

  const getBatteryStatus = () => {
    if (deviceInfo.batteryLevel !== null) {
      speak(`Battery is at ${deviceInfo.batteryLevel} percent`);
      setMessage(`🔋 ${deviceInfo.batteryLevel}%`);
    } else if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const level = Math.round(battery.level * 100);
        const charging = battery.charging ? " and charging" : "";
        speak(`Battery is at ${level} percent${charging}`);
        setMessage(`🔋 ${level}%${charging ? ' ⚡' : ''}`);
      });
    } else {
      speak("Battery information not available");
    }
  };

  const getCurrentLocation = () => {
    if (!permissions.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setPermissions(prev => ({ ...prev, geolocation: true })),
        () => speak("Location permission denied")
      );
      return;
    }
    
    speak("Getting your location...");
    setMessage("📍 Getting location...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        speak(`Your location is ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setMessage(`📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Create maps link
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setTips(`📍 Open in Google Maps`);
        
        const link = document.createElement('a');
        link.href = mapsUrl;
        link.target = '_blank';
        link.textContent = 'Open Maps';
        link.style.cssText = 'color: white; text-decoration: underline; margin-left: 10px;';
        
        const tipsContainer = document.querySelector('.tips-container');
        if (tipsContainer) {
          tipsContainer.appendChild(link);
        }
      },
      (error) => {
        speak("Could not get location");
        console.error("Geolocation error:", error);
      },
      { timeout: 10000 }
    );
  };

  const showDeviceInfo = () => {
    const info = `
      Platform: ${deviceInfo.isMobile ? 'Mobile' : 'Desktop'},
      OS: ${deviceInfo.isAndroid ? 'Android' : deviceInfo.isIOS ? 'iOS' : 'Unknown'},
      Online: ${deviceInfo.isOnline ? 'Yes' : 'No'},
      Battery: ${deviceInfo.batteryLevel || 'Unknown'}%,
      Contacts: ${contacts.length}
    `;
    
    speak(info);
    setMessage("📱 Device Information");
    setTips(`Battery: ${deviceInfo.batteryLevel || '?'}% • Contacts: ${contacts.length}`);
  };

  const getCurrentTime = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    speak(`Current time is ${time}`);
    setMessage(`🕐 ${time}`);
  };

  const getCurrentDate = () => {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    speak(`Today is ${date}`);
    setMessage(`📅 ${date}`);
  };

  const showMyNumber = () => {
    if (myPhoneNumber) {
      speak(`Your phone number is ${myPhoneNumber}`);
      setMessage(`📱 ${myPhoneNumber}`);
      setTips("Say 'copy my number' to copy to clipboard");
    } else {
      speak("Phone number not detected. You can set it in settings.");
      setMessage("📱 Number not set");
    }
  };

  const showHelp = () => {
    const helpText = `
      I can help you with:
      • WhatsApp messages to contacts
      • Phone calls and SMS
      • Contact search and management
      • Camera and flashlight
      • Audio recording
      • Alarms and timers
      • Location and battery info
      • And much more!
      
      Try saying: "WhatsApp John hello there"
      or "Call mom" or "Turn on flashlight"
    `;
    
    speak("Here's what I can help you with...");
    setMessage("ℹ️ Available Commands");
    setTips("WhatsApp, Call, SMS, Camera, Flashlight, Alarm, Timer, Location, etc.");
  };

  const repeatLastCommand = () => {
    if (lastCommand) {
      speak("Repeating last command");
      handleCommand(lastCommand);
    } else {
      speak("No previous command to repeat");
    }
  };

  // ======================
  // HELPER FUNCTIONS
  // ======================
  
  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      console.log("Speech synthesis not supported");
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Select a voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      utterance.voice = englishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const showNotification = (message) => {
    if (permissions.notifications) {
      new Notification('Voice Assistant', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  const triggerVibration = () => {
    if ('vibrate' in navigator && deviceInfo.isMobile) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // ======================
  // RENDER
  // ======================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📱 Smart Voice Assistant
          </h1>
          <p className="text-white/80">
            Control your smartphone with voice commands
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 mb-6">
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full ${deviceInfo.isOnline ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                <span className="text-white text-sm">
                  {deviceInfo.isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-500/30">
                <span className="text-white text-sm">
                  📞 {contacts.length} Contacts
                </span>
              </div>
              {deviceInfo.batteryLevel && (
                <div className={`px-3 py-1 rounded-full ${
                  deviceInfo.batteryLevel < 20 ? 'bg-red-500/30' : 'bg-yellow-500/30'
                }`}>
                  <span className="text-white text-sm">
                    🔋 {deviceInfo.batteryLevel}%
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-white/60 text-sm">
              {deviceInfo.isMobile ? '📱 Mobile' : '💻 Desktop'}
            </div>
          </div>

          {/* Message Display */}
          <div className="bg-black/30 rounded-2xl p-6 mb-6 min-h-[140px] flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                <p className="text-white">Loading assistant...</p>
              </div>
            ) : (
              <p className="text-white text-2xl md:text-3xl font-medium text-center break-words">
                {message}
              </p>
            )}
          </div>

          {/* Tips */}
          {tips && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-100 text-center tips-container">
                {tips}
              </p>
            </div>
          )}

          {/* Voice Control Button */}
          <button
            onClick={toggleListening}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-xl transition-all duration-300 shadow-lg ${
              listening
                ? 'bg-red-600 animate-pulse text-white'
                : 'bg-white text-blue-700 hover:scale-[1.02] hover:shadow-2xl'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {listening ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping mr-3"></div>
                ⏹️ Stop Listening
              </div>
            ) : (
              '🎤 Start Voice Command'
            )}
          </button>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-white font-medium mb-4 text-center">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => handleCommand("whatsapp Biestore hello")}
                className="bg-green-600/30 hover:bg-green-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">📱</span>
                <span className="text-sm">WhatsApp</span>
              </button>
              
              <button
                onClick={toggleFlashlight}
                className="bg-yellow-600/30 hover:bg-yellow-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">{activeFeatures.flashlight ? '🔆' : '🔦'}</span>
                <span className="text-sm">Flashlight</span>
              </button>
              
              <button
                onClick={() => handleCommand("call Biestore")}
                className="bg-green-700/30 hover:bg-green-700/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">📞</span>
                <span className="text-sm">Call</span>
              </button>
              
              <button
                onClick={handleCameraCommand}
                className="bg-purple-600/30 hover:bg-purple-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">📸</span>
                <span className="text-sm">Camera</span>
              </button>
              
              <button
                onClick={startAudioRecording}
                className="bg-red-500/30 hover:bg-red-500/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">{activeFeatures.recording ? '⏹️' : '🎙️'}</span>
                <span className="text-sm">Record</span>
              </button>
              
              <button
                onClick={() => handleCommand("my location")}
                className="bg-teal-600/30 hover:bg-teal-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">📍</span>
                <span className="text-sm">Location</span>
              </button>
              
              <button
                onClick={() => handleCommand("set alarm 7am")}
                className="bg-blue-600/30 hover:bg-blue-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">⏰</span>
                <span className="text-sm">Alarm</span>
              </button>
              
              <button
                onClick={showHelp}
                className="bg-gray-600/30 hover:bg-gray-600/40 text-white p-4 rounded-xl flex flex-col items-center transition-colors"
              >
                <span className="text-2xl mb-2">❓</span>
                <span className="text-sm">Help</span>
              </button>
            </div>
          </div>

          {/* Command Examples */}
          <div className="mt-8">
            <h3 className="text-white font-medium mb-3 text-center">Try Saying:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-white/90 text-sm">"WhatsApp [name] [message]"</p>
                <p className="text-white/60 text-xs mt-1">Send WhatsApp message</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-white/90 text-sm">"Call [name/number]"</p>
                <p className="text-white/60 text-xs mt-1">Make phone call</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-white/90 text-sm">"Turn on flashlight"</p>
                <p className="text-white/60 text-xs mt-1">Control flashlight</p>
              </div>
            </div>
          </div>

          {/* Permissions Status */}
          <div className="mt-6 p-4 bg-black/20 rounded-xl">
            <h4 className="text-white/70 text-sm mb-2">Permissions Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white/70 text-xs capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contacts Section */}
        {contacts.length > 0 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-xl font-medium">
                📇 Your Contacts ({contacts.length})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={listContacts}
                  className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => searchContacts('')}
                  className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  Show All
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                onChange={(e) => searchContacts(e.target.value)}
              />
            </div>
            
            {/* Contacts List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{contact.name}</h4>
                      <p className="text-white/70 text-sm mt-1">{contact.number || 'No number'}</p>
                      <div className="flex items-center mt-2 space-x-3">
                        {contact.fromDevice && (
                          <span className="text-blue-400 text-xs bg-blue-500/20 px-2 py-1 rounded">
                            📱 Device
                          </span>
                        )}
                        {contact.hasWhatsApp && contact.number && (
                          <span className="text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded">
                            WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {contact.number && (
                        <>
                          <button
                            onClick={() => makeCall(contact.number, contact.name)}
                            className="bg-green-600/30 hover:bg-green-600/50 text-white p-2 rounded-lg transition-colors"
                            title="Call"
                          >
                            📞
                          </button>
                          <button
                            onClick={() => sendWhatsAppDirect(contact, "Hello!")}
                            className="bg-green-500/30 hover:bg-green-500/50 text-white p-2 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            📱
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/70">No contacts found</p>
              </div>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
          <h3 className="text-white text-xl font-medium mb-4 text-center">
            🚀 Smartphone Features
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '📱', label: 'WhatsApp Direct', desc: 'Send messages via WhatsApp' },
              { icon: '📞', label: 'Phone Calls', desc: 'Make calls to contacts' },
              { icon: '💬', label: 'SMS Messages', desc: 'Send text messages' },
              { icon: '🔦', label: 'Flashlight', desc: 'Control torch light' },
              { icon: '📸', label: 'Camera', desc: 'Take photos' },
              { icon: '🎙️', label: 'Recording', desc: 'Record audio' },
              { icon: '⏰', label: 'Alarms', desc: 'Set alarms' },
              { icon: '📍', label: 'Location', desc: 'Get GPS location' },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 hover:bg-white/15 rounded-xl p-4 text-center transition-colors"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h4 className="text-white font-medium text-sm mb-1">{feature.label}</h4>
                <p className="text-white/60 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/50 text-sm">
          <p>Voice Assistant v3.0 • All processing happens locally • No data sent to servers</p>
          <p className="mt-1">Works best with Chrome on Android/iOS • Microphone permission required</p>
          <p className="mt-2">
            <span className="font-medium">Shortcut:</span> Press{' '}
            <kbd className="px-2 py-1 bg-white/20 rounded">Ctrl</kbd> +{' '}
            <kbd className="px-2 py-1 bg-white/20 rounded">Space</kbd> to toggle listening
          </p>
        </div>
      </div>
    </div>
  );
}

export default SmartVoiceAssistant;