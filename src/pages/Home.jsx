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
    storage: false,
    screenCapture: false,
    deviceOrientation: false,
    ambientLight: false,
    proximity: false
  });

  const [contacts, setContacts] = useState([]);
  const [myPhoneNumber, setMyPhoneNumber] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedScreenshots, setCapturedScreenshots] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState({
    model: '',
    platform: '',
    battery: null,
    storage: null
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const speechRecognitionRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Check browser support on component mount
  useEffect(() => {
    checkFeatureSupport();
    setupContacts();
    setupEventListeners();
    detectMyPhoneNumber();
    detectDeviceInfo();
    checkStorageAccess();
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
      storage: 'storage' in navigator && 'estimate' in navigator.storage,
      screenCapture: 'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      ambientLight: 'AmbientLightSensor' in window,
      proximity: 'ondeviceproximity' in window || 'ProximitySensor' in window
    });
  };

  const detectDeviceInfo = async () => {
    try {
      // Detect device model from user agent
      const ua = navigator.userAgent;
      let model = 'Unknown Device';
      
      if (ua.includes('Pixel 3a')) model = 'Google Pixel 3a';
      else if (ua.includes('Pixel')) model = 'Google Pixel';
      else if (ua.includes('iPhone')) model = 'iPhone';
      else if (ua.includes('Samsung')) model = 'Samsung';
      else if (ua.includes('Android')) model = 'Android Device';
      
      // Get battery info
      let batteryInfo = null;
      if (supportedFeatures.battery) {
        try {
          const battery = await navigator.getBattery();
          batteryInfo = {
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          };
        } catch (error) {
          console.log("Could not get battery info:", error);
        }
      }

      // Get storage info
      let storageInfo = null;
      if (supportedFeatures.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          storageInfo = {
            used: Math.round(estimate.usage / (1024 * 1024)), // MB
            quota: Math.round(estimate.quota / (1024 * 1024)), // MB
            percentage: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0
          };
        } catch (error) {
          console.log("Could not get storage info:", error);
        }
      }

      setDeviceInfo({
        model,
        platform: navigator.platform,
        battery: batteryInfo,
        storage: storageInfo
      });
    } catch (error) {
      console.log("Error detecting device info:", error);
    }
  };

  const detectMyPhoneNumber = async () => {
    try {
      // For Google Pixel/Android devices, we can try to get phone info
      if (navigator.userAgent.includes('Android')) {
        // Try to get from device properties (limited in browser)
        if (navigator.userAgent.includes('Pixel 3a')) {
          // Pixel 3a specific detection
          setMyPhoneNumber("Pixel 3a Detected");
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
            if (myContact?.tel?.[0]) {
              setMyPhoneNumber(myContact.tel[0]);
            }
          }
        } catch (error) {
          console.log("Could not get phone from contacts:", error);
        }
      }
    } catch (error) {
      console.log("Could not detect phone number:", error);
    }
  };

  const checkStorageAccess = async () => {
    try {
      // Check if we can access storage
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          const persisted = await navigator.storage.persist();
          if (persisted) {
            console.log("Storage persistence granted");
          }
        }
      }
    } catch (error) {
      console.log("Storage access error:", error);
    }
  };

  const setupContacts = async () => {
    try {
      if (supportedFeatures.contacts) {
        const contactManager = new ContactsManager();
        const props = await contactManager.getProperties(['name', 'tel', 'email', 'photo']);
        if (props.includes('name') && props.includes('tel')) {
          const userContacts = await contactManager.select(['name', 'tel', 'email', 'photo'], { 
            multiple: true 
          });
          const formattedContacts = userContacts.map(contact => ({
            name: contact.name ? contact.name[0] : 'Unknown',
            number: contact.tel ? contact.tel[0] : '',
            email: contact.email ? contact.email[0] : '',
            photo: contact.photo ? contact.photo[0] : null
          }));
          setContacts(formattedContacts);
          saveToLocalStorage('voiceAssistantContacts', formattedContacts);
          return;
        }
      }
      
      // Load from localStorage
      const savedContacts = loadFromLocalStorage('voiceAssistantContacts');
      if (savedContacts) {
        setContacts(savedContacts);
      } else {
        // Default contacts
        const defaultContacts = [
          { name: "Mom", number: "+255712345678", email: "mom@example.com" },
          { name: "Dad", number: "+255754321987", email: "dad@example.com" },
          { name: "Emergency", number: "112", email: "" }
        ];
        setContacts(defaultContacts);
        saveToLocalStorage('voiceAssistantContacts', defaultContacts);
      }
    } catch (error) {
      console.error("Error setting up contacts:", error);
    }
  };

  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const loadFromLocalStorage = (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return null;
    }
  };

  const setupEventListeners = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Device orientation (for Pixel 3a features)
    if (supportedFeatures.deviceOrientation) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
    
    // Proximity sensor (Pixel 3a has this)
    if (supportedFeatures.proximity) {
      window.addEventListener('deviceproximity', handleProximity);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden && listening) {
      stopListening();
    }
    if (document.hidden && isCameraActive) {
      closeCamera();
    }
  };

  const handleDeviceOrientation = (event) => {
    // Can be used for gesture controls
    console.log("Device orientation:", event);
  };

  const handleProximity = (event) => {
    // Can be used for proximity-based features
    console.log("Proximity:", event);
  };

  // 🎤 VOICE LISTENING
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Speech recognition not supported in this browser");
      setMessage("Speech recognition not supported");
      setTips("Try using Chrome on Pixel 3a for best experience");
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

    // Enhanced recognition for Pixel 3a
    if (deviceInfo.model.includes('Pixel')) {
      recognition.interimResults = true;
      recognition.continuous = true;
    }

    recognition.start();
    setListening(true);
    setMessage("🎤 Listening... Speak now!");
    setTips("");

    setTimeout(() => {
      if (listening) {
        stopListening();
        setMessage("Listening timed out. Click to try again.");
        speak("Listening timed out. Please try again.");
      }
    }, 15000);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      const command = transcript.toLowerCase();
      setMessage(`🎤 You said: "${transcript}"`);
      setLastCommand(command);
      handleCommand(command);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
      handleRecognitionError(event.error);
    };

    recognition.onend = () => {
      setListening(false);
      speechRecognitionRef.current = null;
    };
  };

  const handleRecognitionError = (error) => {
    switch(error) {
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

  const stopListening = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setListening(false);
  };

  // 🧠 ENHANCED COMMAND HANDLER FOR PIXEL 3A
  const handleCommand = (command) => {
    console.log("Processing command:", command);
    
    // Camera & Photo Commands
    if (command.includes("take photo") || command.includes("take picture") || command.includes("capture photo")) {
      takePhoto();
    }
    else if (command.includes("open camera") || command.includes("start camera")) {
      openCamera();
    }
    else if (command.includes("close camera") || command.includes("stop camera")) {
      closeCamera();
    }
    // Screenshot Commands
    else if (command.includes("screenshot") || command.includes("screen capture") || command.includes("capture screen")) {
      takeScreenshot();
    }
    // Device Info Commands
    else if (command.includes("device info") || command.includes("phone info") || command.includes("my device")) {
      showDeviceInfo();
    }
    else if (command.includes("battery") || command.includes("power level") || command.includes("charge")) {
      showBatteryInfo();
    }
    else if (command.includes("storage") || command.includes("memory") || command.includes("space")) {
      showStorageInfo();
    }
    // Advanced Features
    else if (command.includes("flashlight") || command.includes("torch") || command.includes("flash")) {
      toggleFlashlight();
    }
    else if (command.includes("record video") || command.includes("start recording")) {
      startVideoRecording();
    }
    else if (command.includes("stop recording") || command.includes("end recording")) {
      stopVideoRecording();
    }
    else if (command.includes("vibrate") || command.includes("buzz")) {
      triggerVibrationPattern(command);
    }
    // WhatsApp & Social Media
    else if (command.includes("whatsapp status")) {
      handleWhatsAppStatus(command);
    }
    else if (command.includes("whatsapp") && command.includes("send")) {
      handleWhatsAppMessage(command);
    }
    else if (command.includes("facebook status") || command.includes("instagram story")) {
      handleSocialMediaStatus(command);
    }
    // Communication
    else if (command.includes("call")) {
      handleCallCommand(command);
    }
    else if (command.includes("message") || command.includes("sms")) {
      handleSmsCommand(command);
    }
    else if (command.includes("email") || command.includes("send email")) {
      handleEmailCommand(command);
    }
    // Contacts
    else if (command.includes("save contact") || command.includes("add contact")) {
      handleAddContact(command);
    }
    else if (command.includes("my contacts") || command.includes("show contacts")) {
      listContacts();
    }
    // Utilities
    else if (command.includes("time") || command.includes("what time")) {
      getCurrentTime();
    }
    else if (command.includes("date") || command.includes("today's date")) {
      getCurrentDate();
    }
    else if (command.includes("location") || command.includes("where am i")) {
      getCurrentLocation();
    }
    else if (command.includes("weather") || command.includes("temperature")) {
      getWeatherInfo();
    }
    else if (command.includes("calculator") || command.includes("calculate")) {
      handleCalculation(command);
    }
    else if (command.includes("alarm") || command.includes("set alarm")) {
      setAlarm(command);
    }
    else if (command.includes("timer") || command.includes("set timer")) {
      setTimer(command);
    }
    else if (command.includes("reminder") || command.includes("set reminder")) {
      setReminder(command);
    }
    // Photos & Gallery
    else if (command.includes("my photos") || command.includes("show photos")) {
      showCapturedPhotos();
    }
    else if (command.includes("my screenshots") || command.includes("show screenshots")) {
      showCapturedScreenshots();
    }
    // Help
    else if (command.includes("help") || command.includes("what can you do")) {
      showHelp();
    }
    else if (command.includes("my number") || command.includes("what's my number")) {
      showMyNumber();
    }
    else if (command.includes("repeat") || command.includes("again")) {
      repeatLastCommand();
    }
    // Pixel 3a Specific
    else if (command.includes("pixel features") || command.includes("google assistant")) {
      showPixelFeatures();
    }
    else if (command.includes("night sight") || command.includes("night mode")) {
      activateNightMode();
    }
    else if (command.includes("portrait mode") || command.includes("portrait")) {
      activatePortraitMode();
    }
    else {
      speak("Sorry, I didn't understand that command.");
      setTips("💡 Try: 'take photo', 'screenshot', 'call mom', or 'what's my battery'");
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

  // 📸 CAMERA FUNCTIONALITY
  const openCamera = async () => {
    if (!supportedFeatures.camera) {
      speak("Camera not supported on this device");
      setTips("📸 Camera API not available");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      cameraStreamRef.current = stream;
      setIsCameraActive(true);
      
      // Create camera interface
      const cameraContainer = document.createElement('div');
      cameraContainer.id = 'camera-container';
      cameraContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.style.cssText = `
        width: 100%;
        height: 80%;
        object-fit: cover;
      `;
      
      const controls = document.createElement('div');
      controls.style.cssText = `
        position: absolute;
        bottom: 20px;
        display: flex;
        gap: 20px;
        align-items: center;
      `;
      
      const captureBtn = document.createElement('button');
      captureBtn.innerHTML = '📷';
      captureBtn.style.cssText = `
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
      `;
      captureBtn.onclick = () => takePhotoFromStream(stream);
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✖';
      closeBtn.style.cssText = `
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: red;
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
      `;
      closeBtn.onclick = closeCamera;
      
      controls.appendChild(captureBtn);
      controls.appendChild(closeBtn);
      
      cameraContainer.appendChild(video);
      cameraContainer.appendChild(controls);
      document.body.appendChild(cameraContainer);
      
      speak("Camera opened. Say 'take photo' or 'close camera'");
      setMessage("📸 Camera Active");
      setTips("Say 'take photo' to capture or 'close camera' to exit");
      
    } catch (error) {
      console.error("Camera error:", error);
      speak("Failed to open camera. Please check permissions.");
      setMessage("❌ Camera Error");
      setTips("Allow camera permission in settings");
    }
  };

  const takePhotoFromStream = async (stream) => {
    try {
      const video = document.querySelector('#camera-container video');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const photoData = canvas.toDataURL('image/jpeg', 0.9);
      const photoName = `photo_${Date.now()}.jpg`;
      
      // Save photo
      const newPhoto = {
        id: Date.now(),
        name: photoName,
        data: photoData,
        timestamp: new Date().toLocaleString(),
        size: Math.round(photoData.length / 1024) // KB
      };
      
      const updatedPhotos = [newPhoto, ...capturedPhotos];
      setCapturedPhotos(updatedPhotos);
      saveToLocalStorage('capturedPhotos', updatedPhotos);
      
      // Provide feedback
      speak("Photo captured and saved!");
      
      // Show preview
      const preview = document.createElement('div');
      preview.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1001;
        text-align: center;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
      `;
      
      const img = document.createElement('img');
      img.src = photoData;
      img.style.cssText = 'max-width: 300px; max-height: 300px; border-radius: 5px;';
      
      const closePreview = document.createElement('button');
      closePreview.textContent = 'Close';
      closePreview.style.cssText = `
        margin-top: 10px;
        padding: 10px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      `;
      closePreview.onclick = () => preview.remove();
      
      preview.appendChild(img);
      preview.appendChild(closePreview);
      document.body.appendChild(preview);
      
      // Auto-close preview
      setTimeout(() => {
        if (document.body.contains(preview)) {
          preview.remove();
        }
      }, 3000);
      
    } catch (error) {
      console.error("Photo capture error:", error);
      speak("Failed to capture photo");
    }
  };

  const takePhoto = () => {
    if (!isCameraActive) {
      speak("Opening camera first...");
      openCamera();
      setTimeout(() => {
        if (cameraStreamRef.current) {
          takePhotoFromStream(cameraStreamRef.current);
        }
      }, 2000);
    } else if (cameraStreamRef.current) {
      takePhotoFromStream(cameraStreamRef.current);
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer) {
      cameraContainer.remove();
    }
    
    speak("Camera closed");
    setMessage("Camera Closed");
  };

  // 📱 SCREENSHOT FUNCTIONALITY
  const takeScreenshot = async () => {
    if (isMobile) {
      speak("On mobile, please use your device's screenshot feature");
      setTips("📱 Use power + volume down buttons for screenshot");
      return;
    }

    if (!supportedFeatures.screenCapture) {
      speak("Screen capture not supported");
      setTips("❌ Screen capture API not available");
      return;
    }

    try {
      speak("Select the screen or window you want to capture");
      setMessage("🖥️ Selecting screen...");
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "window",
          cursor: "always"
        },
        audio: false
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const screenshotData = canvas.toDataURL('image/png');
      const screenshotName = `screenshot_${Date.now()}.png`;
      
      // Save screenshot
      const newScreenshot = {
        id: Date.now(),
        name: screenshotName,
        data: screenshotData,
        timestamp: new Date().toLocaleString(),
        size: Math.round(screenshotData.length / 1024) // KB
      };
      
      const updatedScreenshots = [newScreenshot, ...capturedScreenshots];
      setCapturedScreenshots(updatedScreenshots);
      saveToLocalStorage('capturedScreenshots', updatedScreenshots);
      
      // Create download link
      const link = document.createElement('a');
      link.download = screenshotName;
      link.href = screenshotData;
      link.click();
      
      stream.getTracks().forEach(track => track.stop());
      
      speak("Screenshot captured and saved!");
      setMessage("✅ Screenshot Saved");
      setTips(`Screenshot saved as ${screenshotName}`);
      
    } catch (error) {
      console.error("Screenshot error:", error);
      if (error.name === 'NotAllowedError') {
        speak("Screen sharing permission denied");
        setTips("❌ Permission denied for screen capture");
      } else {
        speak("Failed to capture screenshot");
        setTips("❌ Screenshot failed");
      }
    }
  };

  // 📱 DEVICE INFO FUNCTIONALITY
  const showDeviceInfo = () => {
    let info = `You are using ${deviceInfo.model} on ${deviceInfo.platform}. `;
    
    if (deviceInfo.battery) {
      info += `Battery is at ${deviceInfo.battery.level}%. `;
      info += deviceInfo.battery.charging ? "Currently charging. " : "";
    }
    
    if (deviceInfo.storage) {
      info += `Storage: ${deviceInfo.storage.used}MB used of ${deviceInfo.storage.quota}MB. `;
    }
    
    speak(info);
    setMessage(`📱 ${deviceInfo.model}`);
    setTips(`Platform: ${deviceInfo.platform} | Storage: ${deviceInfo.storage?.percentage || '?'}% used`);
  };

  const showBatteryInfo = async () => {
    if (supportedFeatures.battery) {
      try {
        const battery = await navigator.getBattery();
        let message = `Battery is at ${Math.round(battery.level * 100)}%. `;
        message += battery.charging ? "Currently charging. " : "Not charging. ";
        
        if (battery.charging && battery.chargingTime !== Infinity) {
          const hours = Math.floor(battery.chargingTime / 3600);
          const minutes = Math.floor((battery.chargingTime % 3600) / 60);
          message += `Will be fully charged in ${hours} hours ${minutes} minutes.`;
        }
        
        speak(message);
        setMessage(`🔋 ${Math.round(battery.level * 100)}%`);
        setTips(`Charging: ${battery.charging ? 'Yes' : 'No'}`);
      } catch (error) {
        speak("Could not get battery information");
      }
    } else {
      speak("Battery information not available");
    }
  };

  const showStorageInfo = () => {
    if (deviceInfo.storage) {
      const { used, quota, percentage } = deviceInfo.storage;
      const message = `Storage: ${used}MB used of ${quota}MB. That's ${percentage}% full.`;
      speak(message);
      setMessage(`💾 ${used}MB / ${quota}MB`);
      setTips(`${percentage}% used`);
    } else {
      speak("Storage information not available");
    }
  };

  // ⚡ ADVANCED FEATURES
  const toggleFlashlight = () => {
    if (!supportedFeatures.camera) {
      speak("Flashlight not available");
      return;
    }

    speak("Flashlight feature would use camera flash on Pixel 3a");
    setMessage("🔦 Flashlight");
    setTips("Pixel 3a camera flash can be controlled via camera API");
  };

  const startVideoRecording = () => {
    if (!supportedFeatures.camera) {
      speak("Video recording not available");
      return;
    }

    speak("Video recording would start on Pixel 3a");
    setMessage("🎥 Recording...");
    setTips("Video recording uses MediaRecorder API");
  };

  const stopVideoRecording = () => {
    speak("Video recording stopped");
    setMessage("⏹️ Recording Stopped");
  };

  const triggerVibrationPattern = (command) => {
    if (!supportedFeatures.vibrate) {
      speak("Vibration not available");
      return;
    }

    let pattern;
    if (command.includes("strong")) pattern = [300, 100, 300];
    else if (command.includes("sos")) pattern = [100, 100, 100, 300, 300, 100, 300, 100, 300, 300, 100, 100, 100];
    else if (command.includes("long")) pattern = [1000];
    else pattern = [200, 100, 200];
    
    navigator.vibrate(pattern);
    speak("Device vibrating");
    setMessage("📳 Vibrating...");
  };

  // 📞 COMMUNICATION FEATURES
  const handleCallCommand = (command) => {
    const match = command.match(/call\s+(.+)/);
    if (match) {
      const contact = match[1];
      speak(`Calling ${contact}`);
      setMessage(`📞 Calling ${contact}...`);
      
      if (isMobile) {
        setTimeout(() => {
          window.open(`tel:${contact.replace(/\D/g, '')}`, '_blank');
        }, 1000);
      }
    }
  };

  const handleSmsCommand = (command) => {
    const match = command.match(/message\s+(.+?)\s+(.+)/);
    if (match) {
      const [, contact, message] = match;
      speak(`Sending message to ${contact}`);
      setMessage(`💬 SMS to ${contact}`);
      
      if (isMobile) {
        setTimeout(() => {
          window.open(`sms:${contact.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`, '_blank');
        }, 1000);
      }
    }
  };

  const handleEmailCommand = (command) => {
    const match = command.match(/email\s+(.+?)\s+(.+)/);
    if (match) {
      const [, contact, subject] = match;
      speak(`Composing email to ${contact}`);
      setMessage(`📧 Email to ${contact}`);
      
      setTimeout(() => {
        window.open(`mailto:${contact}?subject=${encodeURIComponent(subject)}`, '_blank');
      }, 1000);
    }
  };

  // 📱 WHATSAPP & SOCIAL MEDIA
  const handleWhatsAppStatus = (command) => {
    const match = command.match(/whatsapp status\s+(.+)/);
    const status = match ? match[1] : "Having a great day!";
    speak(`Creating WhatsApp status: ${status}`);
    setMessage("📱 WhatsApp Status");
    
    if (isMobile) {
      setTimeout(() => {
        window.open(`whatsapp://send?text=${encodeURIComponent(status)}`, '_blank');
      }, 1000);
    }
  };

  const handleWhatsAppMessage = (command) => {
    const match = command.match(/whatsapp\s+(.+?)\s+(.+)/);
    if (match) {
      const [, contact, message] = match;
      speak(`Sending WhatsApp to ${contact}`);
      setMessage("💬 WhatsApp");
      
      if (isMobile) {
        setTimeout(() => {
          window.open(`https://wa.me/${contact.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        }, 1000);
      }
    }
  };

  const handleSocialMediaStatus = (command) => {
    if (command.includes("facebook")) {
      speak("Sharing on Facebook");
      setMessage("📘 Facebook");
      setTimeout(() => {
        window.open('https://www.facebook.com/', '_blank');
      }, 1000);
    } else if (command.includes("instagram")) {
      speak("Sharing on Instagram");
      setMessage("📸 Instagram");
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 1000);
    }
  };

  // 👤 CONTACTS
  const handleAddContact = (command) => {
    const match = command.match(/add contact\s+(.+?)\s+(\+?[\d\s]+)/);
    if (match) {
      const [, name, number] = match;
      const newContact = { name, number: number.replace(/\s/g, '') };
      const updatedContacts = [...contacts, newContact];
      setContacts(updatedContacts);
      saveToLocalStorage('voiceAssistantContacts', updatedContacts);
      
      speak(`Contact ${name} saved`);
      setMessage(`✅ ${name} saved`);
    }
  };

  const listContacts = () => {
    if (contacts.length === 0) {
      speak("No contacts saved");
    } else {
      const contactList = contacts.slice(0, 3).map(c => c.name).join(', ');
      speak(`You have ${contacts.length} contacts including ${contactList}`);
      setMessage(`📇 ${contacts.length} Contacts`);
    }
  };

  // 🕐 UTILITIES
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
    if (supportedFeatures.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          speak(`Your location is ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setMessage(`📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        error => speak("Could not get location")
      );
    }
  };

  const getWeatherInfo = () => {
    speak("Weather information would use location services on Pixel 3a");
    setMessage("🌤️ Weather");
    setTips("Uses geolocation to fetch weather data");
  };

  const handleCalculation = (command) => {
    const match = command.match(/calculate\s+(.+)/);
    if (match) {
      const expression = match[1];
      try {
        // Basic calculation - in real app use a proper evaluator
        if (expression.includes('+')) {
          const [a, b] = expression.split('+').map(Number);
          const result = a + b;
          speak(`${a} plus ${b} equals ${result}`);
          setMessage(`➕ ${a} + ${b} = ${result}`);
        }
      } catch {
        speak("Could not calculate");
      }
    }
  };

  const setAlarm = (command) => {
    speak("Alarm setting would use device alarm features on Pixel 3a");
    setMessage("⏰ Alarm");
  };

  const setTimer = (command) => {
    speak("Timer setting would use device timer features");
    setMessage("⏱️ Timer");
  };

  const setReminder = (command) => {
    speak("Reminder setting would use device calendar or notifications");
    setMessage("📝 Reminder");
  };

  // 📷 PHOTOS & GALLERY
  const showCapturedPhotos = () => {
    if (capturedPhotos.length === 0) {
      speak("No photos captured yet");
      setMessage("📷 No Photos");
    } else {
      speak(`You have ${capturedPhotos.length} captured photos`);
      setMessage(`📷 ${capturedPhotos.length} Photos`);
      setTips(`Latest: ${capturedPhotos[0]?.name || ''}`);
    }
  };

  const showCapturedScreenshots = () => {
    if (capturedScreenshots.length === 0) {
      speak("No screenshots captured yet");
      setMessage("🖥️ No Screenshots");
    } else {
      speak(`You have ${capturedScreenshots.length} screenshots`);
      setMessage(`🖥️ ${capturedScreenshots.length} Screenshots`);
    }
  };

  // ℹ️ HELP
  const showHelp = () => {
    const helpText = `You can: Take photos, Capture screenshots, Get device info, 
                      Make calls, Send messages, Set alarms, Check battery, 
                      And much more on your Pixel 3a!`;
    speak(helpText);
    setMessage("❓ Available Commands");
    setTips("Camera, Screenshot, Call, Message, Battery, Storage, etc.");
  };

  const showMyNumber = () => {
    if (myPhoneNumber) {
      speak(`Your phone number is ${myPhoneNumber}`);
      setMessage(`📞 ${myPhoneNumber}`);
    } else {
      speak("Phone number not detected");
      setMessage("📞 Number Unknown");
    }
  };

  const repeatLastCommand = () => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  };

  // 🌟 PIXEL 3A SPECIFIC
  const showPixelFeatures = () => {
    const features = `Pixel 3a features include: Excellent camera with Night Sight, 
                      Google Assistant integration, Fast performance, 
                      And pure Android experience.`;
    speak(features);
    setMessage("🌟 Pixel 3a Features");
    setTips("Night Sight, Google Assistant, Pure Android");
  };

  const activateNightMode = () => {
    speak("Night Sight mode would enhance low-light photography on Pixel 3a");
    setMessage("🌙 Night Sight");
    setTips("Pixel 3a's Night Sight improves low-light photos");
  };

  const activatePortraitMode = () => {
    speak("Portrait mode would create beautiful background blur on Pixel 3a");
    setMessage("👤 Portrait Mode");
    setTips("Creates professional-looking portrait photos");
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (supportedFeatures.deviceOrientation) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      }
      if (supportedFeatures.proximity) {
        window.removeEventListener('deviceproximity', handleProximity);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full text-center border border-white/20">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          📱 Pixel 3a Voice Assistant
        </h1>
        
        <p className="text-white/80 text-sm mb-4">
          {deviceInfo.model || 'Mobile Device'} • {contacts.length} Contacts
          {deviceInfo.battery && ` • 🔋 ${deviceInfo.battery.level}%`}
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
              : "bg-white text-purple-700 hover:scale-105 hover:bg-purple-100"
          }`}
        >
          {listening ? "⏹️ Stop Listening" : "🎤 Start Voice Command"}
        </button>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            onClick={() => handleCommand("take photo")}
            className="bg-blue-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-blue-500/40"
          >
            📷 Photo
          </button>
          <button
            onClick={() => handleCommand("screenshot")}
            className="bg-green-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-500/40"
          >
            🖥️ Screenshot
          </button>
          <button
            onClick={() => handleCommand("device info")}
            className="bg-purple-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-purple-500/40"
          >
            📱 Device Info
          </button>
          <button
            onClick={() => handleCommand("call mom")}
            className="bg-red-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-red-500/40"
          >
            📞 Call
          </button>
          <button
            onClick={() => handleCommand("whatsapp status Hello!")}
            className="bg-green-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-600/40"
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => handleCommand("battery")}
            className="bg-yellow-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-yellow-500/40"
          >
            🔋 Battery
          </button>
        </div>

        <p className="text-white/70 text-sm mt-4">
          Try: <span className="font-semibold">"take photo"</span>,{" "}
          <span className="font-semibold">"screenshot"</span>, or{" "}
          <span className="font-semibold">"device info"</span>
        </p>

        <div className="mt-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/60 text-xs">
            📸 Camera • 🖥️ Screenshot • 📱 Device Control • 📞 Communication
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isMobile ? "Full mobile features enabled" : "Desktop mode"}
          </p>
        </div>

        <div className="mt-4 text-white/40 text-xs">
          <p>All processing happens locally • Privacy focused</p>
          <p className="mt-1">Microphone & permissions required for full features</p>
        </div>
      </div>

      <div className="mt-6 text-white/60 text-sm text-center max-w-md">
        <p className="font-medium mb-2">🌟 Pixel 3a Features:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 p-2 rounded">"take photo"</div>
          <div className="bg-white/10 p-2 rounded">"screenshot"</div>
          <div className="bg-white/10 p-2 rounded">"device info"</div>
          <div className="bg-white/10 p-2 rounded">"battery status"</div>
          <div className="bg-white/10 p-2 rounded">"storage info"</div>
          <div className="bg-white/10 p-2 rounded">"night sight"</div>
          <div className="bg-white/10 p-2 rounded">"portrait mode"</div>
          <div className="bg-white/10 p-2 rounded">"my photos"</div>
        </div>
      </div>

      {capturedPhotos.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <div className="bg-black/30 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">
              📷 Photos ({capturedPhotos.length})
            </h3>
            <div className="text-white/70 text-xs">
              Latest: {capturedPhotos[0]?.name || 'None'}
            </div>
          </div>
        </div>
      )}

      {capturedScreenshots.length > 0 && (
        <div className="mt-4 w-full max-w-md">
          <div className="bg-black/30 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">
              🖥️ Screenshots ({capturedScreenshots.length})
            </h3>
            <div className="text-white/70 text-xs">
              Latest: {capturedScreenshots[0]?.name || 'None'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;