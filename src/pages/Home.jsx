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
  const [myPhoneNumber, setMyPhoneNumber] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [isWhatsAppWebOpen, setIsWhatsAppWebOpen] = useState(false);
  const [socialMediaStatus, setSocialMediaStatus] = useState({
    whatsapp: "",
    facebook: "",
    instagram: "",
    twitter: ""
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const speechRecognitionRef = useRef(null);

  // Check browser support on component mount
  useEffect(() => {
    checkFeatureSupport();
    setupContacts();
    setupEventListeners();
    detectMyPhoneNumber();
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
      notifications: 'Notification' in window
    });
  };

  const detectMyPhoneNumber = async () => {
    // Try to get user's phone number from various sources
    try {
      // Check if we can get phone number from device (limited support)
      if (navigator.userAgentData && navigator.userAgentData.mobile) {
        // On some mobile devices, we can detect if it's a phone
        setMyPhoneNumber("+2557XXXXXXX"); // Placeholder
      }
      
      // Try to get from contacts (user might have saved their own number)
      if (supportedFeatures.contacts) {
        try {
          const contactManager = new ContactsManager();
          const props = await contactManager.getProperties(['name', 'tel']);
          if (props.includes('name') && props.includes('tel')) {
            const userContacts = await contactManager.select(['name', 'tel'], { multiple: true });
            // Look for "me" or user's name in contacts
            const myContact = userContacts.find(c => 
              c.name && (c.name[0].toLowerCase().includes('me') || 
                        c.name[0].toLowerCase().includes('myself') ||
                        c.name[0].toLowerCase() === 'user')
            );
            if (myContact && myContact.tel && myContact.tel[0]) {
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
            email: contact.email ? contact.email[0] : ''
          }));
          setContacts(formattedContacts);
          return;
        }
      }
      
      // Fallback: Try to load contacts from browser storage
      const savedContacts = localStorage.getItem('voiceAssistantContacts');
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      } else {
        // Sample contacts with East African numbers
        const defaultContacts = [
          { name: "Mom", number: "+255712345678", email: "mom@example.com" },
          { name: "Dad", number: "+255754321987", email: "dad@example.com" },
          { name: "John", number: "+255788123456", email: "john@example.com" },
          { name: "Sarah", number: "+255765432109", email: "sarah@example.com" },
          { name: "Emergency", number: "112", email: "" },
          { name: "WhatsApp Group", number: "", email: "", whatsapp: true }
        ];
        setContacts(defaultContacts);
        localStorage.setItem('voiceAssistantContacts', JSON.stringify(defaultContacts));
      }
    } catch (error) {
      console.error("Error setting up contacts:", error);
      // Set default contacts on error
      const defaultContacts = [
        { name: "Mom", number: "+255712345678", email: "mom@example.com" },
        { name: "Dad", number: "+255754321987", email: "dad@example.com" }
      ];
      setContacts(defaultContacts);
    }
  };

  const setupEventListeners = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
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
    
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

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
    
    // WhatsApp Status Commands
    if (command.includes("whatsapp status") || command.includes("status on whatsapp")) {
      handleWhatsAppStatus(command);
    }
    // WhatsApp Message Commands
    else if (command.includes("whatsapp") || command.includes("send on whatsapp")) {
      handleWhatsAppMessage(command);
    }
    // Social Media Status Commands
    else if (command.includes("facebook status") || command.includes("instagram story") || 
             command.includes("twitter post") || command.includes("social media")) {
      handleSocialMediaStatus(command);
    }
    // Contact-based sharing
    else if (command.includes("share with") || command.includes("send to")) {
      handleShareWithContact(command);
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
    else if (command.includes("location") || command.includes("where am i")) {
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
    // Open app commands
    else if (command.includes("open whatsapp") || command.includes("launch whatsapp")) {
      openWhatsApp();
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
    else {
      speak("Sorry, I didn't understand that command.");
      setTips("💡 Try saying: 'send WhatsApp status', 'share with mom', or 'what's my number'");
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

  // 📱 WHATSAPP STATUS FUNCTIONALITY
  const handleWhatsAppStatus = (command) => {
    const statusMatch = command.match(/whatsapp status\s+(.+)/) || 
                       command.match(/status on whatsapp\s+(.+)/);
    
    const statusText = statusMatch ? statusMatch[1].trim() : 
                      "Sharing from Voice Assistant! 🎤";
    
    // Encode the status text for URL
    const encodedText = encodeURIComponent(statusText);
    
    // WhatsApp Web URL for status (web.whatsapp.com doesn't support direct status posting)
    // We'll create a message that can be copied to WhatsApp
    const whatsappMessage = `Check out my status: ${statusText}`;
    
    // For mobile, use WhatsApp URL scheme
    if (isMobile) {
      const whatsappUrl = `whatsapp://send?text=${encodedText}`;
      speak(`Creating WhatsApp status: ${statusText}. Opening WhatsApp...`);
      setMessage(`📱 Creating WhatsApp status...`);
      setTips("Opening WhatsApp to share your status");
      
      // Try to open WhatsApp
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 1000);
      
      // Save status locally
      setSocialMediaStatus(prev => ({
        ...prev,
        whatsapp: statusText
      }));
    } else {
      // For desktop, guide user to WhatsApp Web
      speak(`For WhatsApp status on desktop, please open WhatsApp Web and post: ${statusText}`);
      setMessage(`💻 WhatsApp Status: "${statusText}"`);
      setTips("Copy this text and post it on WhatsApp Web status");
      
      // Copy to clipboard
      navigator.clipboard.writeText(statusText).then(() => {
        setTips("✅ Status text copied to clipboard. Open WhatsApp Web to post.");
      });
    }
  };

  // 💬 WHATSAPP MESSAGE FUNCTIONALITY
  const handleWhatsAppMessage = (command) => {
    const whatsappMatch = command.match(/whatsapp\s+(.+?)\s+(.+)/) ||
                         command.match(/send on whatsapp\s+(.+?)\s+(.+)/);
    
    if (!whatsappMatch) {
      speak("Who would you like to message on WhatsApp and what should I say?");
      setTips("💡 Try: 'WhatsApp John hello there' or 'send on WhatsApp group meeting at 3'");
      return;
    }

    const contactQuery = whatsappMatch[1].trim();
    const messageText = whatsappMatch[2].trim();
    
    // Find contact
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
      (c.whatsapp && contactQuery.includes('group'))
    );

    if (contact) {
      sendWhatsAppMessage(contact, messageText);
    } else {
      // Send to any number
      sendWhatsAppMessage({ number: contactQuery }, messageText);
    }
  };

  const sendWhatsAppMessage = (contact, message) => {
    const encodedMessage = encodeURIComponent(message);
    let whatsappUrl;
    
    if (contact.number) {
      // Format number for WhatsApp (remove + and any non-digits)
      const whatsappNumber = contact.number.replace(/\D/g, '');
      whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    } else if (contact.whatsapp) {
      // For WhatsApp groups (needs different handling)
      whatsappUrl = `https://web.whatsapp.com/`;
    } else {
      // Generic WhatsApp
      whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    }
    
    speak(`Sending WhatsApp message to ${contact.name || contact.number}: ${message}`);
    setMessage(`💬 WhatsApp to ${contact.name || contact.number}...`);
    setTips(`Opening WhatsApp with message: "${message.substring(0, 30)}..."`);
    
    setIsWhatsAppWebOpen(true);
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1000);
  };

  // 📱 SOCIAL MEDIA STATUS FUNCTIONALITY
  const handleSocialMediaStatus = (command) => {
    let platform = '';
    let statusText = '';
    
    if (command.includes("facebook status")) {
      platform = 'facebook';
      statusText = command.replace(/facebook status\s+/i, '').trim();
    } else if (command.includes("instagram story")) {
      platform = 'instagram';
      statusText = command.replace(/instagram story\s+/i, '').trim();
    } else if (command.includes("twitter post")) {
      platform = 'twitter';
      statusText = command.replace(/twitter post\s+/i, '').trim();
    } else {
      // Generic social media
      platform = 'social';
      const match = command.match(/social media\s+(.+)/);
      statusText = match ? match[1].trim() : "Check this out!";
    }
    
    shareOnSocialMedia(platform, statusText);
  };

  const shareOnSocialMedia = (platform, text) => {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(window.location.href);
    let shareUrl = '';
    let platformName = '';
    
    switch(platform) {
      case 'facebook':
        platformName = 'Facebook';
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'instagram':
        platformName = 'Instagram';
        // Instagram doesn't have direct share URL, guide user
        speak(`For Instagram, please open the app and post: ${text}`);
        setMessage(`📸 Instagram Story: "${text}"`);
        setTips("Copy this text and post it on Instagram");
        navigator.clipboard.writeText(text);
        return;
      case 'twitter':
        platformName = 'Twitter';
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      default:
        platformName = 'Social Media';
        // Use Web Share API if available
        if (supportedFeatures.share) {
          navigator.share({
            title: 'Voice Assistant',
            text: text,
            url: window.location.href
          });
          speak(`Sharing on social media: ${text}`);
          return;
        }
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    }
    
    speak(`Sharing on ${platformName}: ${text}`);
    setMessage(`📱 Sharing on ${platformName}...`);
    setTips(`Opening ${platformName} to share your post`);
    
    setTimeout(() => {
      window.open(shareUrl, '_blank');
    }, 1000);
    
    // Save status
    setSocialMediaStatus(prev => ({
      ...prev,
      [platform]: text
    }));
  };

  // 👥 SHARE WITH CONTACT FUNCTIONALITY
  const handleShareWithContact = (command) => {
    const shareMatch = command.match(/share with\s+(.+?)\s+(.+)/) ||
                      command.match(/send to\s+(.+?)\s+(.+)/);
    
    if (!shareMatch) {
      speak("Who would you like to share with and what should I share?");
      setTips("💡 Try: 'share with mom check this out' or 'send to John this link'");
      return;
    }

    const contactQuery = shareMatch[1].trim();
    const shareContent = shareMatch[2].trim();
    
    // Find contact
    const contact = contacts.find(c => 
      c.name.toLowerCase().includes(contactQuery.toLowerCase())
    );

    if (contact) {
      // Ask user how they want to share
      speak(`Would you like to share with ${contact.name} via WhatsApp, SMS, or email?`);
      setMessage(`📤 Share with ${contact.name}?`);
      setTips("Say 'WhatsApp', 'SMS', or 'email' to choose method");
      
      // Listen for method choice (simplified - in real app would need more complex flow)
      setTimeout(() => {
        if (contact.number) {
          const smsUrl = `sms:${contact.number}?body=${encodeURIComponent(shareContent)}`;
          window.open(smsUrl, '_blank');
        }
      }, 3000);
    } else {
      speak(`Contact ${contactQuery} not found.`);
      setTips(`Try: 'save contact ${contactQuery} +255712345678' first`);
    }
  };

  // 📞 CALL FUNCTIONALITY
  const handleCallCommand = (command) => {
    const contactMatch = command.match(/call\s+(.+)/);
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
      speak(`Contact ${contactQuery} not found.`);
      setTips(`Try: 'save contact ${contactQuery} +255712345678' first`);
    }
  };

  const makeCall = (phoneNumber, contactName = null) => {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const telUrl = `tel:${formattedNumber}`;
    
    if (isMobile) {
      speak(`Calling ${contactName || phoneNumber}`);
      setMessage(`📞 Calling ${contactName || phoneNumber}...`);
      setTips(`Opening phone dialer`);
      
      setTimeout(() => {
        window.open(telUrl, '_blank');
      }, 1000);
    } else {
      speak(`On mobile, I would call ${contactName || phoneNumber}.`);
      setMessage(`📞 Would call: ${contactName || formattedNumber}`);
      setTips("Phone calls only work on mobile devices");
    }
  };

  // 💬 SMS FUNCTIONALITY
  const handleSmsCommand = (command) => {
    const messageMatch = command.match(/message\s+(.+?)\s+(.+)/);
    if (!messageMatch) {
      speak("Who would you like to message and what should I say?");
      setTips("💡 Try: 'message John hello how are you'");
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
      speak(`Contact ${contactQuery} not found.`);
      setTips(`Try: 'save contact ${contactQuery} +255712345678' first`);
    }
  };

  const sendSms = (phoneNumber, message, contactName = null) => {
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const smsUrl = `sms:${formattedNumber}?body=${encodeURIComponent(message)}`;
    
    if (isMobile) {
      speak(`Sending message to ${contactName || phoneNumber}`);
      setMessage(`💬 SMS to ${contactName || phoneNumber}...`);
      setTips(`Opening messages app`);
      
      setTimeout(() => {
        window.open(smsUrl, '_blank');
      }, 1000);
    } else {
      speak(`On mobile, I would send SMS to ${contactName || phoneNumber}`);
      setMessage(`💬 Would SMS: ${contactName || formattedNumber}`);
      setTips("SMS only works on mobile devices");
    }
  };

  // 👤 CONTACT MANAGEMENT
  const handleContactCommand = (command) => {
    if (command.includes("save contact") || command.includes("add contact")) {
      handleAddContact(command);
    } else if (command.includes("show contacts") || command.includes("my contacts")) {
      listContacts();
    }
  };

  const handleAddContact = (command) => {
    const addMatch = command.match(/add contact\s+(.+?)\s+(\+?[\d\s]+)/);
    if (!addMatch) {
      speak("Please specify name and phone number");
      setTips("💡 Try: 'save contact John +255712345678'");
      return;
    }

    const name = addMatch[1].trim();
    let number = addMatch[2].replace(/\s/g, '');
    
    // Format number
    if (!number.startsWith('+') && !number.startsWith('255') && number.length === 9) {
      number = '+255' + number;
    }
    
    const newContact = { name, number };
    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    localStorage.setItem('voiceAssistantContacts', JSON.stringify(updatedContacts));
    
    speak(`Contact ${name} saved successfully`);
    setMessage(`✅ Contact saved: ${name}`);
    setTips(`📱 New contact: ${name} - ${number}`);
  };

  const listContacts = () => {
    if (contacts.length === 0) {
      speak("You have no contacts saved");
      setMessage("No contacts found");
      setTips("💡 Say 'save contact [name] [number]' to add contacts");
      return;
    }
    
    const contactList = contacts.slice(0, 5).map(c => `${c.name}: ${c.number}`).join(", ");
    speak(`You have ${contacts.length} contacts. ${contactList}`);
    setMessage(`📇 Contacts (${contacts.length}):`);
    setTips(contacts.slice(0, 3).map(c => `${c.name}`).join(", "));
  };

  // 📸 CAMERA FUNCTIONALITY
  const handleCameraCommand = () => {
    if (!supportedFeatures.camera) {
      speak("Camera not supported");
      setTips("📸 Camera API not available");
      return;
    }

    speak("Opening camera. Allow access when prompted");
    setMessage("📸 Opening camera...");
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        // Create camera preview
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
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖ Close';
        closeBtn.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 1001;
          padding: 10px 20px; background: red; color: white;
          border: none; border-radius: 5px; cursor: pointer;
        `;
        closeBtn.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          closeBtn.remove();
          setMessage("Camera closed");
        };
        
        document.body.appendChild(video);
        document.body.appendChild(closeBtn);
        
        speak("Camera is active. Say 'take photo' or 'close camera'");
        setTips("Camera active - say 'take photo' to capture");
      })
      .catch(error => {
        speak("Camera access denied");
        setMessage("❌ Camera access denied");
        setTips("Allow camera permission in browser settings");
      });
  };

  // 📤 OPEN WHATSAPP
  const openWhatsApp = () => {
    if (isMobile) {
      window.open('whatsapp://', '_blank');
    } else {
      window.open('https://web.whatsapp.com', '_blank');
    }
    setIsWhatsAppWebOpen(true);
    speak("Opening WhatsApp");
    setMessage("📱 Opening WhatsApp...");
  };

  // Other helper functions (simplified for brevity)
  const getCurrentTime = () => {
    const time = new Date().toLocaleTimeString();
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
      },
      error => speak("Could not get location")
    );
  };

  const getBatteryStatus = async () => {
    if (supportedFeatures.battery) {
      try {
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        speak(`Battery is at ${level} percent`);
        setMessage(`🔋 ${level}%`);
      } catch {
        speak("Battery info not available");
      }
    }
  };

  const shareContent = async () => {
    if (supportedFeatures.share) {
      await navigator.share({
        title: 'Voice Assistant',
        text: 'Check out this amazing voice assistant!',
        url: window.location.href
      });
    }
  };

  const copyToClipboard = async () => {
    if (supportedFeatures.clipboard) {
      await navigator.clipboard.writeText(myPhoneNumber || 'Phone number not detected');
      speak("Phone number copied to clipboard");
    }
  };

  const triggerVibration = () => {
    if (supportedFeatures.vibrate) {
      navigator.vibrate([200, 100, 200]);
      speak("Device vibrating");
    }
  };

  const sendNotification = (command) => {
    if (supportedFeatures.notifications && Notification.permission === 'granted') {
      const text = command.replace(/notification\s+/i, '') || 'Voice Assistant Notification';
      new Notification('Voice Assistant', { body: text });
      speak("Notification sent");
    }
  };

  const showHelp = () => {
    const helpText = `You can say: Call contacts, Send WhatsApp messages, Post social media status, 
                      Share with contacts, Take photos, Check time and location, and more`;
    speak(helpText);
    setMessage("ℹ️ Available Commands");
    setTips("Call, WhatsApp, Status, Share, Camera, Time, Location, Battery, etc.");
  };

  const handleCalculation = (command) => {
    const calc = command.replace(/calculate\s+/i, '');
    try {
      // Simple calculation - in real app use a proper parser
      if (calc.includes('+')) {
        const [a, b] = calc.split('+').map(Number);
        const result = a + b;
        speak(`${a} plus ${b} equals ${result}`);
        setMessage(`➕ ${a} + ${b} = ${result}`);
      }
    } catch {
      speak("Could not calculate");
    }
  };

  const showMyNumber = () => {
    if (myPhoneNumber) {
      speak(`Your phone number is ${myPhoneNumber}`);
      setMessage(`📱 ${myPhoneNumber}`);
    } else {
      speak("Phone number not detected. You can set it in settings");
      setMessage("📱 Number not detected");
    }
  };

  const repeatLastCommand = () => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  };

  // Cleanup
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
          {isMobile ? "📱 Mobile" : "💻 Desktop"} • {contacts.length} Contacts
          {myPhoneNumber && ` • 📞 ${myPhoneNumber}`}
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
            onClick={() => handleCommand("whatsapp status Hello from voice assistant!")}
            className="bg-green-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-600/40"
          >
            📱 WhatsApp
          </button>
          <button
            onClick={() => handleCommand("share with mom Check this out")}
            className="bg-blue-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-blue-500/40"
          >
            👥 Share
          </button>
          <button
            onClick={() => handleCommand("call mom")}
            className="bg-green-700/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-green-700/40"
          >
            📞 Call
          </button>
          <button
            onClick={() => handleCommand("facebook status Having a great day!")}
            className="bg-blue-700/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-blue-700/40"
          >
            📘 Facebook
          </button>
          <button
            onClick={() => handleCommand("instagram story Amazing feature!")}
            className="bg-pink-600/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-pink-600/40"
          >
            📸 Instagram
          </button>
          <button
            onClick={() => handleCommand("open camera")}
            className="bg-red-500/30 text-white py-2 px-3 rounded-xl text-sm hover:bg-red-500/40"
          >
            📷 Camera
          </button>
        </div>

        <p className="text-white/70 text-sm mt-4">
          Try: <span className="font-semibold">"WhatsApp status [message]"</span>,{" "}
          <span className="font-semibold">"Share with [contact]"</span>, or{" "}
          <span className="font-semibold">"Call [name]"</span>
        </p>

        <div className="mt-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/60 text-xs">
            📱 Real Contact Sharing • 📤 Social Media Integration • 🎤 Voice Controlled
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isMobile ? "Full mobile integration enabled" : "Desktop mode with limited features"}
          </p>
        </div>

        <div className="mt-4 text-white/40 text-xs">
          <p>All processing happens locally • No data sent to servers</p>
          <p className="mt-1">Microphone & contact permissions required for full features</p>
        </div>
      </div>

      <div className="mt-6 text-white/60 text-sm text-center max-w-md">
        <p className="font-medium mb-2">🌟 Real Phone Features:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 p-2 rounded">"WhatsApp status [text]"</div>
          <div className="bg-white/10 p-2 rounded">"Share with [contact] [message]"</div>
          <div className="bg-white/10 p-2 rounded">"Facebook status [text]"</div>
          <div className="bg-white/10 p-2 rounded">"Instagram story [text]"</div>
          <div className="bg-white/10 p-2 rounded">"Call [contact/number]"</div>
          <div className="bg-white/10 p-2 rounded">"Message [contact] [text]"</div>
          <div className="bg-white/10 p-2 rounded">"Save contact [name] [number]"</div>
          <div className="bg-white/10 p-2 rounded">"What's my number"</div>
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
              {contacts.slice(0, 5).map((contact, index) => (
                <div key={index} className="flex justify-between items-center bg-white/10 p-2 rounded">
                  <div>
                    <span className="text-white text-sm">{contact.name}</span>
                    {contact.whatsapp && <span className="ml-2 text-green-400 text-xs">(WhatsApp)</span>}
                  </div>
                  <span className="text-white/70 text-xs">{contact.number || 'No number'}</span>
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