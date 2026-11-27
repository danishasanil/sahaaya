import { ApplicationFieldKey, LanguageCode } from '../types/sahaaya';

export const APPLICATION_FIELD_ORDER: ApplicationFieldKey[] = [
  'fullName',
  'age',
  'dateOfBirth',
  'gender',
  'state',
  'district',
  'address',
  'mobileNumber',
  'annualIncome',
];

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export interface TranslationBundle {
  brandName: string;
  tagline: string;
  nav: {
    home: string;
    assistant: string;
    form: string;
    review: string;
  };
  textSizeLabel: string;
  languageLabel: string;
  languages: Record<LanguageCode, { name: string; native: string }>;
  welcome: {
    greeting: string;
    description: string;
    demoBadgeText: string;
    startButton: string;
    resumeButton: string;
    directFormLink: string;
    privacyNote: string;
    chooseLanguage: string;
    examplesLabel: string;
    quickCapabilities: string[];
    cardSubtitle: string;
  };
  assistant: {
    title: string;
    subtitle: string;
    generalModeTitle: string;
    generalSubtitle: string;
    generalExamples: string[];
    listening: string;
    processing: string;
    readyToListen: string;
    tapToSpeak: string;
    tapToStop: string;
    transcriptLabel: string;
    liveTranscriptPlaceholder: string;
    typePlaceholder: string;
    sendButton: string;
    repeatButton: string;
    stopButton: string;
    helpButton: string;
    slowSpeechLabel: string;
    openFormButton: string;
    reviewButton: string;
    progressLabel: string;
    capturedSummaryTitle: string;
    emptySummaryHint: string;
    quickExamplesLabel: string;
    speechUnsupportedTitle: string;
    speechUnsupportedBody: string;
    permissionDeniedTitle: string;
    permissionDeniedBody: string;
    noSpeechBody: string;
    networkErrorBody: string;
    missingVoiceNotice: string;
    initialGreeting: string;
    allFieldsDonePrompt: string;
    helpMessage: string;
    stoppedMessage: string;
    updatedFieldReply: (label: string, value: string) => string;
    unrecognizedReply: (fieldLabel: string, example: string) => string;
    startConversation: string;
    endConversation: string;
    conversationActiveHint: string;
    stateLabels: {
      idle: string;
      listening: string;
      processing: string;
      executing: string;
      speaking: string;
      error: string;
    };
    youSaidLabel: string;
    understoodLabel: string;
    sahaayaReplyLabel: string;
    showHistoryLabel: string;
    hideHistoryLabel: string;
    endedMessage: string;
    unexpectedStopNotice: string;
    confirmCard: {
      titleName: string;
      titleDetail: (fieldLabel: string) => string;
      heardLabel: string;
      question: string;
      yesCorrect: string;
      spellName: string;
      editField: string;
      editSave: string;
      editCancel: string;
      spellingTitle: string;
      spellingHint: string;
      spaceKey: string;
      backspaceKey: string;
      clearKey: string;
      doneSpelling: string;
      nameReadbackPrompt: (name: string) => string;
      detailReadbackPrompt: (fieldLabel: string, spokenValue: string) => string;
      spellStartPrompt: string;
      editPrompt: (fieldLabel: string) => string;
    };
    taskInspector: {
      sectionTitle: string;
      emptyHint: string;
      instructionLabel: string;
      detectedTaskLabel: string;
      requiredInfoLabel: string;
      statusLabel: string;
      noneNeeded: string;
      confirmTaskButton: string;
      cancelTaskButton: string;
      openExternalButton: string;
      categoryLabels: Record<
        | 'general_conversation'
        | 'app_launch'
        | 'unknown_app'
        | 'search'
        | 'messaging'
        | 'screen_assistance'
        | 'navigation'
        | 'application_task',
        string
      >;
      statusLabels: Record<
        | 'ready'
        | 'needs_info'
        | 'awaiting_confirmation'
        | 'executing'
        | 'executed_in_web'
        | 'simulated_completed'
        | 'opened_externally'
        | 'requires_permission'
        | 'unavailable_on_web'
        | 'failed'
        | 'cancelled',
        string
      >;
    };
    demoMode: {
      label: string;
      interactiveDemo: string;
      interactiveDemoHint: string;
      realBrowser: string;
      realBrowserHint: string;
      simulatedBadge: string;
      realBadge: string;
      executionPanelTitle: string;
      deviceScreenTitle: string;
      demoSubmissionBanner: string;
    };
    demoGuide: {
      title: string;
      toggleShow: string;
      toggleHide: string;
      platformLabel: string;
      micLabel: string;
      micGranted: string;
      micPrompt: string;
      micDenied: string;
      micUnsupported: string;
      tryCommandsLabel: string;
      examples: string[];
      browserWorksTitle: string;
      browserWorksBody: string;
      androidFutureTitle: string;
      androidFutureBody: string;
      httpsNote: string;
    };
  };
  form: {
    title: string;
    subtitle: string;
    progressText: (filled: number, total: number) => string;
    completedLabel: string;
    pendingLabel: string;
    needsAttentionLabel: string;
    speakFieldLabel: string;
    editFieldLabel: string;
    saveFieldLabel: string;
    backToAssistant: string;
    continueToReview: string;
    clearDraft: string;
    selectOption: string;
    validationSummary: string;
  };
  review: {
    title: string;
    subtitle: string;
    readAloud: string;
    stopReading: string;
    editButton: string;
    confirmationQuestion: string;
    confirmationSubtext: string;
    yesSubmit: string;
    noGoBack: string;
    missingNotice: string;
    notProvided: string;
    readAloudTemplate: (summaryLines: string) => string;
  };
  success: {
    title: string;
    confirmationLabel: string;
    submittedOn: string;
    applicantLabel: string;
    downloadReceipt: string;
    disclaimerTitle: string;
    disclaimerBody: string;
    startNew: string;
    backHome: string;
  };
  fields: Record<
    ApplicationFieldKey,
    {
      label: string;
      placeholder: string;
      voicePrompt: string;
      example: string;
      errorRequired: string;
      errorInvalid: string;
    }
  >;
  genderOptions: {
    Male: string;
    Female: string;
    Other: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationBundle> = {
  en: {
    brandName: 'Sahaaya',
    tagline: 'Your Voice. Your Phone. Your Freedom.',
    nav: {
      home: 'Home',
      assistant: 'Voice Assistant',
      form: 'Application Form',
      review: 'Review',
    },
    textSizeLabel: 'Text size',
    languageLabel: 'Language',
    languages: {
      en: { name: 'English', native: 'English' },
      hi: { name: 'Hindi', native: 'हिन्दी' },
      kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
    },
    welcome: {
      greeting: "Hello! We're here to make things easier.",
      description:
        "Just speak naturally. I can help you open websites, search nearby places, prepare messages, understand what's on screen, or fill out forms.",
      demoBadgeText: 'Voice-First Accessibility Assistant · Interactive Web Demo',
      startButton: 'Start with Sahaaya',
      resumeButton: 'Continue with Sahaaya',
      directFormLink: 'Open Welfare Form Demo',
      privacyNote:
        'Your voice stays private on your device. No API keys or external AI services are needed, and demo forms stay local in your browser.',
      chooseLanguage: 'Choose your comfortable language',
      examplesLabel: 'You can try saying:',
      quickCapabilities: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      cardSubtitle: 'Voice-First Assistant',
    },
    assistant: {
      title: 'Speak with Sahaaya',
      subtitle: 'Answer one question at a time at your own pace, or type below.',
      generalModeTitle: 'General Voice Assistant',
      generalSubtitle:
        'Speak naturally or type below—ask to open a website, search nearby, prepare a message, explain this page, or fill a form.',
      generalExamples: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      listening: 'Listening to you...',
      processing: 'Understanding your answer...',
      readyToListen: 'Ready when you are',
      tapToSpeak: 'Tap Microphone to Speak',
      tapToStop: 'Tap to Stop Listening',
      transcriptLabel: 'Live speech transcript',
      liveTranscriptPlaceholder: 'Your spoken words will appear here clearly as you speak.',
      typePlaceholder: 'Ask Sahaaya anything or type here...',
      sendButton: 'Send',
      repeatButton: 'Repeat',
      stopButton: 'Stop',
      helpButton: 'Help',
      slowSpeechLabel: 'Slower Speech',
      openFormButton: 'View Welfare Form',
      reviewButton: 'Review Application',
      progressLabel: 'Details completed',
      capturedSummaryTitle: 'Welfare Form Progress',
      emptySummaryHint: 'Starts empty (0/9). Only details you provide are filled in.',
      quickExamplesLabel: 'Sample phrases you can tap or say (demo):',
      speechUnsupportedTitle: 'Voice typing is unavailable in this browser',
      speechUnsupportedBody: 'No problem at all. You can type your answers in the box below or fill out the form directly.',
      permissionDeniedTitle: 'Microphone access is paused',
      permissionDeniedBody: 'Please allow microphone access in your browser address bar to speak, or type your answer below.',
      noSpeechBody: "I didn't catch any words that time. Please tap the microphone and speak slowly, or type below.",
      networkErrorBody: 'Voice recognition needs an internet connection in this browser. You can type your answer below anytime.',
      missingVoiceNotice: 'Spoken audio in this language may use your device default voice if a regional voice pack is not installed.',
      initialGreeting:
        "Hello! I'm Sahaaya. How can I help you today? You can ask me to search for something, open a website, prepare a message, or help you with a form.",
      allFieldsDonePrompt: 'Wonderful! All nine details are now filled in. Would you like to review your application together?',
      helpMessage:
        'You can ask me to "Open YouTube", "Search for nearby hospitals", "Prepare a WhatsApp message", "Explain what is on this page", or "Help me fill out a welfare application".',
      stoppedMessage: 'I have paused listening and speaking. Take your time, and tap the microphone whenever you are ready.',
      updatedFieldReply: (label, value) => `Thank you. I have noted your ${label} as "${value}".`,
      unrecognizedReply: (fieldLabel, example) =>
        `I want to make sure I get your ${fieldLabel} right. Could you say it again simply? For example: "${example}".`,
      startConversation: 'Start Conversation',
      endConversation: 'End Conversation',
      conversationActiveHint: 'Conversation active · Listening resumes automatically after Sahaaya speaks.',
      stateLabels: {
        idle: 'Ready to start',
        listening: 'Listening to you',
        processing: 'Processing answer',
        executing: 'Demonstrating action',
        speaking: 'Sahaaya is speaking',
        error: 'Microphone attention needed',
      },
      youSaidLabel: 'What you said',
      understoodLabel: 'What Sahaaya understood',
      sahaayaReplyLabel: 'Sahaaya says',
      showHistoryLabel: 'Show conversation turns',
      hideHistoryLabel: 'Hide conversation turns',
      endedMessage: 'Conversation ended. Tap Start Conversation anytime to continue where you left off.',
      unexpectedStopNotice: 'Voice listening paused briefly. Tap Start Conversation or type your answer below.',
      confirmCard: {
        titleName: 'Confirm Your Name',
        titleDetail: (fieldLabel) => `Confirm Your ${fieldLabel}`,
        heardLabel: 'I heard:',
        question: 'Is this correct?',
        yesCorrect: "Yes, that's correct",
        spellName: 'Spell my name',
        editField: 'Edit',
        editSave: 'Save & Confirm',
        editCancel: 'Back',
        spellingTitle: 'Spell Your Name Letter by Letter',
        spellingHint: 'Speak letters one by one (like "R A M E S H"), tap letters below, or say "Space" and "Done".',
        spaceKey: 'Space',
        backspaceKey: 'Backspace',
        clearKey: 'Clear',
        doneSpelling: 'Confirm Spelled Name',
        nameReadbackPrompt: (name) =>
          `I heard your name as ${name}. Is that correct? You can say Yes, Spell my name, or Edit name.`,
        detailReadbackPrompt: (fieldLabel, spokenValue) =>
          `I noted your ${fieldLabel} as ${spokenValue}. Is that correct? Say Yes to confirm, or Edit to change it.`,
        spellStartPrompt:
          'Sure, let us spell your name letter by letter. Please say each letter slowly, or tap the letters on your screen. Say Done when finished.',
        editPrompt: (fieldLabel) =>
          `Please type or update your ${fieldLabel} in the box on your screen and press Save and Confirm.`,
      },
      taskInspector: {
        sectionTitle: 'Detected Task',
        emptyHint:
          'Try saying "Open YouTube", "Search for nearby hospitals", "Prepare a message", or "Help me fill out a form".',
        instructionLabel: 'Recognised instruction',
        detectedTaskLabel: 'Detected task',
        requiredInfoLabel: 'Required information',
        statusLabel: 'Current task status',
        noneNeeded: 'All details ready',
        confirmTaskButton: 'Yes, Continue',
        cancelTaskButton: 'Cancel',
        openExternalButton: 'Open Website',
        categoryLabels: {
          general_conversation: 'General Conversation',
          app_launch: 'Open Website / App',
          unknown_app: 'Unrecognised App',
          search: 'Web Search',
          messaging: 'Prepare Message',
          screen_assistance: 'Screen Assistance',
          navigation: 'Navigation',
          application_task: 'Welfare Application',
        },
        statusLabels: {
          ready: 'Ready',
          needs_info: 'Waiting for information',
          awaiting_confirmation: 'Waiting for confirmation',
          executing: 'Executing',
          executed_in_web: 'Completed',
          simulated_completed: 'Simulated completion',
          opened_externally: 'Opened externally',
          requires_permission: 'Requires device permission',
          unavailable_on_web: 'Not supported on this platform',
          failed: 'Failed',
          cancelled: 'Cancelled',
        },
      },
      demoMode: {
        label: 'Execution Environment',
        interactiveDemo: 'Interactive Demo Mode',
        interactiveDemoHint: 'Simulated smartphone apps & guided walkthrough',
        realBrowser: 'Real Browser Mode',
        realBrowserHint: 'Opens real websites, geolocation & WhatsApp links',
        simulatedBadge: 'SIMULATED — DEMO MODE',
        realBadge: 'REAL BROWSER EXECUTION',
        executionPanelTitle: 'Task Execution & Steps',
        deviceScreenTitle: 'Interactive Smartphone Preview',
        demoSubmissionBanner: 'DEMO SUBMISSION — No real application was submitted.',
      },
      demoGuide: {
        title: 'Demo Guide & Try Commands',
        toggleShow: 'Show',
        toggleHide: 'Hide',
        platformLabel: 'Browser environment',
        micLabel: 'Microphone',
        micGranted: 'Allowed',
        micPrompt: 'Ask when started',
        micDenied: 'Blocked (use text box or allow in browser)',
        micUnsupported: 'Unavailable (text box active)',
        tryCommandsLabel: 'Tap a real command to try:',
        examples: [
          'Open YouTube.',
          'Search for nearby hospitals.',
          'Prepare a WhatsApp message saying I will reach home by 6.',
          'Read my application.',
          'Explain missing fields.',
        ],
        browserWorksTitle: 'Works in this browser demo',
        browserWorksBody:
          'Continuous voice & text conversation, welfare form filling, screen/application reading, location-assisted Google Maps/Search, official websites (YouTube, Google, WhatsApp Web), and prefilled WhatsApp message links.',
        androidFutureTitle: 'Requires future native Android app',
        androidFutureBody:
          'Controlling third-party mobile apps, reading external app screens, changing device Settings or Camera, and direct hands-free sending.',
        httpsNote:
          'Microphone & location features require Chrome, Edge, or Safari over HTTPS or localhost.',
      },
    },
    form: {
      title: 'Senior Citizen Welfare Application',
      subtitle: 'Check or update any detail below. Tap the microphone beside a field to speak just that answer.',
      progressText: (filled, total) => `${filled} of ${total} details completed`,
      completedLabel: 'Completed',
      pendingLabel: 'Needs detail',
      needsAttentionLabel: 'Check entry',
      speakFieldLabel: 'Speak',
      editFieldLabel: 'Edit',
      saveFieldLabel: 'Done',
      backToAssistant: 'Back to Voice Assistant',
      continueToReview: 'Review Application',
      clearDraft: 'Reset Form',
      selectOption: 'Choose an option',
      validationSummary: 'Please check the highlighted fields before continuing to review.',
    },
    review: {
      title: 'Review Your Application',
      subtitle: 'Please read or listen carefully to make sure every detail is accurate.',
      readAloud: 'Read Aloud',
      stopReading: 'Stop Reading',
      editButton: 'Edit',
      confirmationQuestion: 'Are all of your details correct to complete this simulated application?',
      confirmationSubtext: 'This is a demonstration only. No real government application will be submitted.',
      yesSubmit: 'Yes, Complete Demo Application',
      noGoBack: 'No, I Want to Edit',
      missingNotice: 'Some details are still empty. Please fill in all 9 details before completing.',
      notProvided: 'Not provided yet',
      readAloudTemplate: (summaryLines) =>
        `Here is your Senior Citizen Welfare Application summary. ${summaryLines}. Please confirm if all details are correct.`,
    },
    success: {
      title: 'Your demo application is complete.',
      confirmationLabel: 'Demo Confirmation Number',
      submittedOn: 'Completed on',
      applicantLabel: 'Applicant Name',
      downloadReceipt: 'Download Receipt',
      disclaimerTitle: 'Important Simulation Notice',
      disclaimerBody:
        'This is a simulated application created for the Sahaaya accessibility demonstration. It is not connected to any government portal and does not submit a real welfare application.',
      startNew: 'Start New Demo Application',
      backHome: 'Return to Welcome Screen',
    },
    fields: {
      fullName: {
        label: 'Full Name',
        placeholder: 'Enter your full name',
        voicePrompt: 'What is your full name?',
        example: 'My name is Sample Applicant',
        errorRequired: 'Please enter your full name.',
        errorInvalid: 'Please enter a full name with at least 2 letters.',
      },
      age: {
        label: 'Age (Years)',
        placeholder: 'Enter age in years (50–120)',
        voicePrompt: 'How old are you in years?',
        example: 'I am 65 years old',
        errorRequired: 'Please enter your age.',
        errorInvalid: 'Please enter a valid age between 50 and 120 years.',
      },
      dateOfBirth: {
        label: 'Date of Birth',
        placeholder: 'YYYY-MM-DD',
        voicePrompt: 'What is your date of birth?',
        example: '01 January 1960',
        errorRequired: 'Please select or enter your date of birth.',
        errorInvalid: 'Please provide a valid past date of birth.',
      },
      gender: {
        label: 'Gender',
        placeholder: 'Select gender',
        voicePrompt: 'What is your gender? You can say Male, Female, or Other.',
        example: 'Female',
        errorRequired: 'Please choose your gender.',
        errorInvalid: 'Please select Male, Female, or Other.',
      },
      state: {
        label: 'State',
        placeholder: 'Choose your state',
        voicePrompt: 'Which Indian state do you live in?',
        example: 'Karnataka',
        errorRequired: 'Please choose your state.',
        errorInvalid: 'Please select a valid state.',
      },
      district: {
        label: 'District',
        placeholder: 'Enter your district name',
        voicePrompt: 'Which district do you live in?',
        example: 'My district is Sample District',
        errorRequired: 'Please enter your district.',
        errorInvalid: 'Please enter a valid district name.',
      },
      address: {
        label: 'Full Address',
        placeholder: 'House number, street, locality, PIN code',
        voicePrompt: 'Please tell me your full home address.',
        example: 'House 10, Main Road, Sample City 100001',
        errorRequired: 'Please enter your home address.',
        errorInvalid: 'Please enter a more complete address.',
      },
      mobileNumber: {
        label: 'Mobile Number',
        placeholder: '10-digit mobile number',
        voicePrompt: 'What is your 10-digit mobile number?',
        example: '9000000000',
        errorRequired: 'Please enter your 10-digit mobile number.',
        errorInvalid: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.',
      },
      annualIncome: {
        label: 'Annual Income (₹)',
        placeholder: 'Enter annual household income in ₹',
        voicePrompt: 'What is your approximate annual household income in rupees?',
        example: '100000',
        errorRequired: 'Please enter your annual income.',
        errorInvalid: 'Please enter a valid amount in rupees (0 or higher).',
      },
    },
    genderOptions: {
      Male: 'Male',
      Female: 'Female',
      Other: 'Other',
    },
  },
  hi: {
    brandName: 'सहाय (Sahaaya)',
    tagline: 'आपकी आवाज़। आपका फ़ोन। आपकी आज़ादी।',
    nav: {
      home: 'मुख्य पृष्ठ',
      assistant: 'आवाज़ सहायक',
      form: 'आवेदन पत्र',
      review: 'समीक्षा',
    },
    textSizeLabel: 'अक्षर का आकार',
    languageLabel: 'भाषा',
    languages: {
      en: { name: 'English', native: 'English' },
      hi: { name: 'Hindi', native: 'हिन्दी' },
      kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
    },
    welcome: {
      greeting: 'नमस्ते! हम आपके काम को आसान बनाने के लिए यहाँ हैं।',
      description:
        'बस सहजता से बोलिए। मैं वेबसाइट खोलने, नज़दीकी जानकारी खोजने, संदेश तैयार करने, स्क्रीन समझाने या फ़ॉर्म भरने में आपकी मदद कर सकती हूँ।',
      demoBadgeText: 'आवाज़-आधारित डिजिटल सहायक · इंटरैक्टिव ब्राउज़र डेमो',
      startButton: 'सहाय के साथ शुरू करें',
      resumeButton: 'सहाय के साथ जारी रखें',
      directFormLink: 'कल्याण फ़ॉर्म डेमो खोलें',
      privacyNote:
        'आपकी आवाज़ आपके डिवाइस पर सुरक्षित रहती है। इसके लिए किसी API कुंजी या भुगतान सेवा की आवश्यकता नहीं है।',
      chooseLanguage: 'अपनी पसंदीदा भाषा चुनें',
      examplesLabel: 'आप इस तरह बोलकर शुरू कर सकते हैं:',
      quickCapabilities: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      cardSubtitle: 'आवाज़ सहायक',
    },
    assistant: {
      title: 'सहाय से बात करें',
      subtitle: 'अपनी सुविधा से एक-एक प्रश्न का उत्तर दें, या नीचे लिखें।',
      generalModeTitle: 'सामान्य आवाज़ सहायक',
      generalSubtitle:
        'सहजता से बोलें या लिखें—वेबसाइट खोलें, खोजें, संदेश तैयार करें, पेज समझें या फ़ॉर्म भरें।',
      generalExamples: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      listening: 'मैं सुन रहा हूँ...',
      processing: 'आपकी बात समझ रहा हूँ...',
      readyToListen: 'जब आप तैयार हों, बोलें',
      tapToSpeak: 'बोलने के लिए माइक दबाएँ',
      tapToStop: 'सुनना बंद करें',
      transcriptLabel: 'आपके बोले गए शब्द',
      liveTranscriptPlaceholder: 'जब आप बोलेंगे, तो आपके शब्द यहाँ साफ़ दिखाई देंगे।',
      typePlaceholder: 'सहाय से कुछ भी पूछें या यहाँ लिखें...',
      sendButton: 'भेजें',
      repeatButton: 'दोहराएँ',
      stopButton: 'रुकें',
      helpButton: 'मदद',
      slowSpeechLabel: 'धीमी आवाज़',
      openFormButton: 'कल्याण फ़ॉर्म देखें',
      reviewButton: 'आवेदन जाँचें',
      progressLabel: 'जानकारी पूरी हुई',
      capturedSummaryTitle: 'कल्याण फ़ॉर्म प्रगति (वैकल्पिक डेमो)',
      emptySummaryHint: 'यह फ़ॉर्म खाली (0/9) शुरू होता है। केवल आपके दिए विवरण ही भरे जाते हैं।',
      quickExamplesLabel: 'परीक्षण के लिए नमूना वाक्य (डेमो):',
      speechUnsupportedTitle: 'इस ब्राउज़र में वॉइस टाइपिंग उपलब्ध नहीं है',
      speechUnsupportedBody: 'कोई बात नहीं। आप नीचे दिए बॉक्स में लिखकर या सीधे फ़ॉर्म भरकर आगे बढ़ सकते हैं।',
      permissionDeniedTitle: 'माइक्रोफ़ोन की अनुमति बंद है',
      permissionDeniedBody: 'बोलने के लिए कृपया ब्राउज़र में माइक्रोफ़ोन की अनुमति दें, या नीचे अपना उत्तर लिखें।',
      noSpeechBody: 'मुझे आपकी आवाज़ सुनाई नहीं दी। कृपया माइक दबाकर धीरे से बोलें या नीचे लिखें।',
      networkErrorBody: 'वॉइस पहचान के लिए इंटरनेट की आवश्यकता है। आप नीचे लिखकर भी आसानी से जवाब दे सकते हैं।',
      missingVoiceNotice: 'यदि आपके डिवाइस में हिन्दी आवाज़ पैक नहीं है, तो पढ़ने के लिए डिवाइस की डिफ़ॉल्ट आवाज़ का उपयोग होगा।',
      initialGreeting:
        'नमस्ते! मैं सहाय हूँ। आज मैं आपकी किस तरह मदद कर सकती हूँ? आप मुझसे कुछ खोजने, वेबसाइट खोलने, संदेश तैयार करने या फॉर्म भरने में मदद मांग सकते हैं।',
      allFieldsDonePrompt: 'बहुत बढ़िया! सभी 9 जानकारियाँ भर दी गई हैं। क्या आप अब अपने आवेदन की समीक्षा करना चाहेंगे?',
      helpMessage:
        'आप कह सकते हैं: "Open YouTube", "Search for nearby hospitals", "Prepare a message", "Explain what is on this page", या "Help me fill out a form"।',
      stoppedMessage: 'मैंने सुनना और बोलना रोक दिया है। आराम से समय लें, और तैयार होने पर माइक दबाएँ।',
      updatedFieldReply: (label, value) => `धन्यवाद। मैंने आपका ${label} "${value}" दर्ज कर लिया है।`,
      unrecognizedReply: (fieldLabel, example) =>
        `मैं आपका ${fieldLabel} सही से लिखना चाहता हूँ। कृपया इसे सरल शब्दों में फिर से कहें, जैसे: "${example}"।`,
      startConversation: 'बातचीत शुरू करें',
      endConversation: 'बातचीत समाप्त करें',
      conversationActiveHint: 'बातचीत चालू है · सहाय के बोलने के बाद सुनना अपने आप फिर से शुरू होगा।',
      stateLabels: {
        idle: 'शुरू करने के लिए तैयार',
        listening: 'आपकी बात सुन रहा हूँ',
        processing: 'उत्तर समझ रहा हूँ',
        executing: 'कार्य दिखाया जा रहा है',
        speaking: 'सहाय बोल रहा है',
        error: 'माइक्रोफ़ोन की जाँच आवश्यक',
      },
      youSaidLabel: 'आपने कहा',
      understoodLabel: 'सहाय ने समझा',
      sahaayaReplyLabel: 'सहाय का जवाब',
      showHistoryLabel: 'पिछली बातचीत देखें',
      hideHistoryLabel: 'पिछली बातचीत छिपाएँ',
      endedMessage: 'बातचीत समाप्त हो गई है। आगे बढ़ने के लिए कभी भी बातचीत शुरू करें दबाएँ।',
      unexpectedStopNotice: 'सुनना थोड़ी देर के लिए रुक गया। कृपया बातचीत शुरू करें दबाएँ या नीचे लिखें।',
      confirmCard: {
        titleName: 'अपना नाम पुष्टि करें',
        titleDetail: (fieldLabel) => `${fieldLabel} की पुष्टि करें`,
        heardLabel: 'मैंने सुना:',
        question: 'क्या यह सही है?',
        yesCorrect: 'हाँ, यह सही है',
        spellName: 'नाम की वर्तनी (Spell) बताएँ',
        editField: 'बदलें',
        editSave: 'सहेजें और पुष्टि करें',
        editCancel: 'वापस',
        spellingTitle: 'अपना नाम अक्षर-अक्षर बोलें या चुनें',
        spellingHint: 'एक-एक अक्षर बोलें (जैसे "R A M E S H"), नीचे अक्षर दबाएँ, या "Space" और "Done" कहें।',
        spaceKey: 'स्पेस',
        backspaceKey: 'मिटाएँ',
        clearKey: 'साफ़ करें',
        doneSpelling: 'यह नाम पक्का करें',
        nameReadbackPrompt: (name) =>
          `मैंने आपका नाम ${name} सुना है। क्या यह सही है? आप हाँ, वर्तनी बताएँ, या नाम बदलें कह सकते हैं।`,
        detailReadbackPrompt: (fieldLabel, spokenValue) =>
          `मैंने आपका ${fieldLabel} ${spokenValue} सुना है। क्या यह सही है? हाँ कहें या बदलें चुनें।`,
        spellStartPrompt:
          'ज़रूर, आइए आपका नाम अक्षर-अक्षर लिखते हैं। कृपया एक-एक अक्षर धीरे बोलें या स्क्रीन पर चुनें। पूरा होने पर Done कहें।',
        editPrompt: (fieldLabel) =>
          `कृपया स्क्रीन पर दिए बॉक्स में अपना ${fieldLabel} सुधारें और सहेजें दबाएँ।`,
      },
      taskInspector: {
        sectionTitle: 'पहचाना गया कार्य',
        emptyHint:
          'बोलकर देखें: "Open YouTube", "Search for nearby hospitals", "Prepare a message", या "Help me fill out a form"।',
        instructionLabel: 'समझा गया निर्देश',
        detectedTaskLabel: 'पहचाना गया कार्य',
        requiredInfoLabel: 'आवश्यक जानकारी',
        statusLabel: 'कार्य की स्थिति',
        noneNeeded: 'सभी जानकारी तैयार',
        confirmTaskButton: 'हाँ, आगे बढ़ें',
        cancelTaskButton: 'रद्द करें',
        openExternalButton: 'वेबसाइट खोलें',
        categoryLabels: {
          general_conversation: 'सामान्य बातचीत',
          app_launch: 'वेबसाइट / ऐप खोलना',
          unknown_app: 'अज्ञात ऐप',
          search: 'खोज (Search)',
          messaging: 'संदेश तैयार करना',
          screen_assistance: 'स्क्रीन सहायता',
          navigation: 'नेविगेशन',
          application_task: 'कल्याण आवेदन',
        },
        statusLabels: {
          ready: 'तैयार',
          needs_info: 'आवश्यक जानकारी की प्रतीक्षा',
          awaiting_confirmation: 'आपकी पुष्टि की प्रतीक्षा',
          executing: 'निष्पादित हो रहा है',
          executed_in_web: 'पूरा हुआ',
          simulated_completed: 'सिम्युलेटेड पूर्ण (डेमो)',
          opened_externally: 'बाहरी टैब में खोला गया',
          requires_permission: 'डिवाइस अनुमति आवश्यक',
          unavailable_on_web: 'इस प्लेटफ़ॉर्म पर समर्थित नहीं',
          failed: 'असफल रहा',
          cancelled: 'रद्द किया गया',
        },
      },
      demoMode: {
        label: 'निष्पादन मोड',
        interactiveDemo: 'इंटरैक्टिव डेमो मोड',
        interactiveDemoHint: 'सिम्युलेटेड स्मार्टफोन ऐप और चरणबद्ध प्रदर्शन',
        realBrowser: 'रियल ब्राउज़र मोड',
        realBrowserHint: 'असली वेबसाइट, लोकेशन और WhatsApp लिंक खोलता है',
        simulatedBadge: 'सिम्युलेटेड — डेमो मोड',
        realBadge: 'असली ब्राउज़र निष्पादन',
        executionPanelTitle: 'कार्य निष्पादन चरण',
        deviceScreenTitle: 'इंटरैक्टिव स्मार्टफोन प्रीव्यू',
        demoSubmissionBanner: 'DEMO SUBMISSION — No real application was submitted.',
      },
      demoGuide: {
        title: 'डेमो गाइड और उदाहरण निर्देश',
        toggleShow: 'दिखाएँ',
        toggleHide: 'छिपाएँ',
        platformLabel: 'ब्राउज़र वातावरण',
        micLabel: 'माइक्रोफ़ोन',
        micGranted: 'अनुमति प्राप्त',
        micPrompt: 'शुरू करने पर पूछेगा',
        micDenied: 'रोका गया (लिखकर उत्तर दें या अनुमति दें)',
        micUnsupported: 'उपलब्ध नहीं (टाइपिंग सक्रिय है)',
        tryCommandsLabel: 'आज़माने के लिए किसी निर्देश को दबाएँ:',
        examples: [
          'Open YouTube.',
          'Search for nearby hospitals.',
          'Prepare a WhatsApp message saying I will reach home by 6.',
          'Read my application.',
          'Explain missing fields.',
        ],
        browserWorksTitle: 'इस ब्राउज़र डेमो में क्या चलता है',
        browserWorksBody:
          'लगातार आवाज़ और टेक्स्ट बातचीत, कल्याण आवेदन भरना, स्क्रीन व आवेदन पढ़ना, अनुमति के साथ Google Maps/Search, आधिकारिक वेबसाइट खोलना और तैयार WhatsApp ड्राफ़्ट लिंक।',
        androidFutureTitle: 'भविष्य के Android ऐप की आवश्यकता',
        androidFutureBody:
          'फ़ोन के बाहरी ऐप नियंत्रित करना, दूसरे ऐप की स्क्रीन पढ़ना, सेटिंग्स/कैमरा खोलना और बिना छुए संदेश भेजना।',
        httpsNote:
          'माइक्रोफ़ोन और स्थान सुविधा Chrome, Edge या Safari में HTTPS या localhost पर काम करती है।',
      },
    },
    form: {
      title: 'वरिष्ठ नागरिक कल्याण आवेदन',
      subtitle: 'नीचे दी गई किसी भी जानकारी को जाँचें या बदलें। किसी एक खाने को बोलकर भरने के लिए माइक बटन दबाएँ।',
      progressText: (filled, total) => `${total} में से ${filled} जानकारियाँ भरी गईं`,
      completedLabel: 'पूरा हुआ',
      pendingLabel: 'बाकी है',
      needsAttentionLabel: 'जाँच करें',
      speakFieldLabel: 'बोलें',
      editFieldLabel: 'बदलें',
      saveFieldLabel: 'ठीक है',
      backToAssistant: 'आवाज़ सहायक पर लौटें',
      continueToReview: 'आवेदन की समीक्षा करें',
      clearDraft: 'फ़ॉर्म साफ़ करें',
      selectOption: 'एक विकल्प चुनें',
      validationSummary: 'समीक्षा से पहले कृपया चिह्नित जानकारियों को ठीक करें।',
    },
    review: {
      title: 'अपने आवेदन की समीक्षा करें',
      subtitle: 'कृपया ध्यान से पढ़ें या सुनें कि सभी जानकारियाँ सही हैं।',
      readAloud: 'पढ़कर सुनाएँ',
      stopReading: 'पढ़ना बंद करें',
      editButton: 'बदलें',
      confirmationQuestion: 'क्या आपकी सभी जानकारियाँ सही हैं और क्या आप यह डेमो आवेदन पूरा करना चाहते हैं?',
      confirmationSubtext: 'यह केवल एक डेमो है। कोई वास्तविक सरकारी आवेदन जमा नहीं किया जाएगा।',
      yesSubmit: 'हाँ, डेमो आवेदन पूरा करें',
      noGoBack: 'नहीं, मुझे बदलाव करना है',
      missingNotice: 'कुछ जानकारियाँ अभी खाली हैं। पूरा करने से पहले सभी 9 जानकारियाँ भरें।',
      notProvided: 'अभी नहीं भरा गया',
      readAloudTemplate: (summaryLines) =>
        `यह आपके वरिष्ठ नागरिक कल्याण आवेदन का सारांश है। ${summaryLines}। कृपया पुष्टि करें कि सभी जानकारियाँ सही हैं।`,
    },
    success: {
      title: 'आपका डेमो आवेदन पूरा हो गया है।',
      confirmationLabel: 'डेमो पुष्टि संख्या',
      submittedOn: 'पूर्ण होने की तिथि',
      applicantLabel: 'आवेदक का नाम',
      downloadReceipt: 'रसीद डाउनलोड करें',
      disclaimerTitle: 'महत्वपूर्ण डेमो सूचना',
      disclaimerBody:
        'यह सहाय एक्सेसिबिलिटी डेमो के लिए बनाया गया एक सिम्युलेटेड (नकली) आवेदन है। यह किसी सरकारी वेबसाइट से जुड़ा नहीं है और कोई वास्तविक आवेदन जमा नहीं करता।',
      startNew: 'नया डेमो आवेदन शुरू करें',
      backHome: 'मुख्य पृष्ठ पर लौटें',
    },
    fields: {
      fullName: {
        label: 'पूरा नाम',
        placeholder: 'अपना पूरा नाम लिखें',
        voicePrompt: 'आपका पूरा नाम क्या है?',
        example: 'मेरा नाम नमूना आवेदक है',
        errorRequired: 'कृपया अपना पूरा नाम लिखें।',
        errorInvalid: 'कृपया कम से कम 2 अक्षरों का सही नाम लिखें।',
      },
      age: {
        label: 'उम्र (वर्षों में)',
        placeholder: 'उम्र लिखें (50–120)',
        voicePrompt: 'आपकी उम्र कितने वर्ष है?',
        example: 'मेरी उम्र 65 साल है',
        errorRequired: 'कृपया अपनी उम्र बताएँ।',
        errorInvalid: 'कृपया 50 से 120 के बीच की सही उम्र लिखें।',
      },
      dateOfBirth: {
        label: 'जन्म तिथि',
        placeholder: 'YYYY-MM-DD',
        voicePrompt: 'आपकी जन्म तिथि क्या है?',
        example: '01 जनवरी 1960',
        errorRequired: 'कृपया अपनी जन्म तिथि चुनें।',
        errorInvalid: 'कृपया सही पुरानी जन्म तिथि चुनें।',
      },
      gender: {
        label: 'लिंग',
        placeholder: 'विकल्प चुनें',
        voicePrompt: 'आपका लिंग क्या है? पुरुष, महिला या अन्य कहें।',
        example: 'महिला',
        errorRequired: 'कृपया अपना लिंग चुनें।',
        errorInvalid: 'कृपया पुरुष, महिला या अन्य चुनें।',
      },
      state: {
        label: 'राज्य',
        placeholder: 'अपना राज्य चुनें',
        voicePrompt: 'आप भारत के किस राज्य में रहते हैं?',
        example: 'कर्नाटक',
        errorRequired: 'कृपया अपना राज्य चुनें।',
        errorInvalid: 'कृपया सही राज्य चुनें।',
      },
      district: {
        label: 'ज़िला',
        placeholder: 'अपने ज़िले का नाम लिखें',
        voicePrompt: 'आप किस ज़िले में रहते हैं?',
        example: 'मेरा ज़िला नमूना ज़िला है',
        errorRequired: 'कृपया अपने ज़िले का नाम लिखें।',
        errorInvalid: 'कृपया सही ज़िले का नाम लिखें।',
      },
      address: {
        label: 'पूरा पता',
        placeholder: 'मकान नंबर, गली, मोहल्ला, पिन कोड',
        voicePrompt: 'कृपया अपने घर का पूरा पता बताइए।',
        example: 'मकान 10, मुख्य मार्ग, नमूना शहर 100001',
        errorRequired: 'कृपया अपने घर का पूरा पता लिखें।',
        errorInvalid: 'कृपया थोड़ा और स्पष्ट पूरा पता लिखें।',
      },
      mobileNumber: {
        label: 'मोबाइल नंबर',
        placeholder: '10 अंकों का मोबाइल नंबर',
        voicePrompt: 'आपका 10 अंकों का मोबाइल नंबर क्या है?',
        example: '9000000000',
        errorRequired: 'कृपया अपना 10 अंकों का मोबाइल नंबर लिखें।',
        errorInvalid: 'कृपया 6, 7, 8 या 9 से शुरू होने वाला 10 अंकों का सही नंबर लिखें।',
      },
      annualIncome: {
        label: 'वार्षिक आय (₹)',
        placeholder: 'रुपयों में वार्षिक आय लिखें',
        voicePrompt: 'आपके परिवार की सालाना आय लगभग कितनी है?',
        example: '100000',
        errorRequired: 'कृपया अपनी वार्षिक आय लिखें।',
        errorInvalid: 'कृपया रुपयों में सही राशि लिखें।',
      },
    },
    genderOptions: {
      Male: 'पुरुष (Male)',
      Female: 'महिला (Female)',
      Other: 'अन्य (Other)',
    },
  },
  kn: {
    brandName: 'ಸಹಾಯ (Sahaaya)',
    tagline: 'ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ಫೋನ್. ನಿಮ್ಮ ಸ್ವಾತಂತ್ರ್ಯ.',
    nav: {
      home: 'ಮುಖಪುಟ',
      assistant: 'ಧ್ವನಿ ಸಹಾಯಕ',
      form: 'ಅರ್ಜಿ ನಮೂನೆ',
      review: 'ಪರಿಶೀಲನೆ',
    },
    textSizeLabel: 'ಅಕ್ಷರದ ಗಾತ್ರ',
    languageLabel: 'ಭಾಷೆ',
    languages: {
      en: { name: 'English', native: 'English' },
      hi: { name: 'Hindi', native: 'हिन्दी' },
      kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
    },
    welcome: {
      greeting: 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಕೆಲಸವನ್ನು ಸುಲಭಗೊಳಿಸಲು ನಾವಿದ್ದೇವೆ.',
      description:
        'ಸಹಜವಾಗಿ ಮಾತನಾಡಿ. ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು, ಹತ್ತಿರದ ಮಾಹಿತಿ ಹುಡುಕಲು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು, ಪರದೆ ವಿವರಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
      demoBadgeText: 'ಧ್ವನಿ-ಆಧಾರಿತ ಡಿಜಿಟಲ್ ಸಹಾಯಕ · ಇಂಟರಾಕ್ಟಿವ್ ಬ್ರೌಸರ್ ಡೆಮೊ',
      startButton: 'ಸಹಾಯ ಜೊತೆ ಪ್ರಾರಂಭಿಸಿ',
      resumeButton: 'ಸಹಾಯ ಜೊತೆ ಮುಂದುವರಿಸಿ',
      directFormLink: 'ಕಲ್ಯಾಣ ಅರ್ಜಿ ಡೆಮೊ ತೆರೆಯಿರಿ',
      privacyNote:
        'ನಿಮ್ಮ ಧ್ವನಿ ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿಯೇ ಸುರಕ್ಷಿತವಾಗಿರುತ್ತದೆ. ಯಾವುದೇ API ಕೀ ಅಥವಾ ಪಾವತಿ ಸೇವೆಯ ಅಗತ್ಯವಿಲ್ಲ.',
      chooseLanguage: 'ನಿಮಗೆ ಅನುಕೂಲಕರವಾದ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      examplesLabel: 'ನೀವು ಹೀಗೆ ಹೇಳಿ ಪ್ರಾರಂಭಿಸಬಹುದು:',
      quickCapabilities: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      cardSubtitle: 'ಧ್ವನಿ ಸಹಾಯಕ',
    },
    assistant: {
      title: 'ಸಹಾಯ ಜೊತೆ ಮಾತನಾಡಿ',
      subtitle: 'ನಿಮ್ಮ ವೇಗದಲ್ಲಿ ಒಂದೊಂದೇ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಿ, ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
      generalModeTitle: 'ಸಾಮಾನ್ಯ ಧ್ವನಿ ಸಹಾಯಕ',
      generalSubtitle:
        'ಸಹಜವಾಗಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ—ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಿರಿ, ಹುಡುಕಿ, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಿ, ಪುಟ ವಿವರಿಸಿ ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಿ.',
      generalExamples: [
        'Open YouTube.',
        'Search for nearby hospitals.',
        'Prepare a message.',
        'Help me understand this page.',
        'Help me fill out a form.',
      ],
      listening: 'ನಿಮ್ಮ ಮಾತು ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...',
      processing: 'ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...',
      readyToListen: 'ನೀವು ಸಿದ್ಧರಾದಾಗ ಮಾತನಾಡಿ',
      tapToSpeak: 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿರಿ',
      tapToStop: 'ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
      transcriptLabel: 'ನೀವು ಮಾತನಾಡಿದ ಪದಗಳು',
      liveTranscriptPlaceholder: 'ನೀವು ಮಾತನಾಡುವಾಗ ನಿಮ್ಮ ಪದಗಳು ಇಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣಿಸುತ್ತವೆ.',
      typePlaceholder: 'ಸಹಾಯವನ್ನು ಏನನ್ನಾದರೂ ಕೇಳಿ ಅಥವಾ ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...',
      sendButton: 'ಕಳುಹಿಸಿ',
      repeatButton: 'ಮತ್ತೆ ಹೇಳಿ',
      stopButton: 'ನಿಲ್ಲಿಸಿ',
      helpButton: 'ಸಹಾಯ',
      slowSpeechLabel: 'ನಿಧಾನ ಧ್ವನಿ',
      openFormButton: 'ಕಲ್ಯಾಣ ಅರ್ಜಿ ನೋಡಿ',
      reviewButton: 'ಅರ್ಜಿ ಪರಿಶೀಲಿಸಿ',
      progressLabel: 'ಮಾಹಿತಿ ಪೂರ್ಣಗೊಂಡಿದೆ',
      capturedSummaryTitle: 'ಕಲ್ಯಾಣ ಅರ್ಜಿ ಪ್ರಗತಿ (ಐಚ್ಛಿಕ ಡೆಮೊ)',
      emptySummaryHint: 'ಖಾಲಿ ಅರ್ಜಿಯಿಂದ (0/9) ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ನೀವು ನೀಡಿದ ವಿವರಗಳನ್ನು ಮಾತ್ರ ತುಂಬಲಾಗುತ್ತದೆ.',
      quickExamplesLabel: 'ಪರೀಕ್ಷಿಸಲು ಮಾದರಿ ವಾಕ್ಯಗಳು (ಡೆಮೊ):',
      speechUnsupportedTitle: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಟೈಪಿಂಗ್ ಲಭ್ಯವಿಲ್ಲ',
      speechUnsupportedBody: 'ಚಿಂತಿಸಬೇಡಿ. ನೀವು ಕೆಳಗಿನ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ಟೈಪ್ ಮಾಡಬಹುದು ಅಥವಾ ನೇರವಾಗಿ ಅರ್ಜಿ ಭರ್ತಿ ಮಾಡಬಹುದು.',
      permissionDeniedTitle: 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿಲ್ಲಿಸಲಾಗಿದೆ',
      permissionDeniedBody: 'ಮಾತನಾಡಲು ದಯವಿಟ್ಟು ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
      noSpeechBody: 'ನಿಮ್ಮ ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೈಕ್ ಒತ್ತಿ ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
      networkErrorBody: 'ಧ್ವನಿ ಗುರುತಿಸಲು ಇಂಟರ್ನೆಟ್ ಅಗತ್ಯವಿದೆ. ನೀವು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ ಉತ್ತರಿಸಬಹುದು.',
      missingVoiceNotice: 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಪ್ಯಾಕ್ ಇಲ್ಲದಿದ್ದರೆ, ಓದಲು ಸಾಧನದ ಸಾಮಾನ್ಯ ಧ್ವನಿಯನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.',
      initialGreeting:
        'ನಮಸ್ಕಾರ! ನಾನು ಸಹಾಯಾ. ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನೀವು ಮಾಹಿತಿ ಹುಡುಕಲು, ವೆಬ್ಸೈಟ್ ತೆರೆಯಲು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ನನ್ನನ್ನು ಕೇಳಬಹುದು.',
      allFieldsDonePrompt: 'ತುಂಬಾ ಒಳ್ಳೆಯದು! ಎಲ್ಲಾ 9 ವಿವರಗಳು ಭರ್ತಿಯಾಗಿವೆ. ಈಗ ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸೋಣವೇ?',
      helpMessage:
        'ನೀವು ಹೀಗೆ ಹೇಳಬಹುದು: "Open YouTube", "Search for nearby hospitals", "Prepare a message", "Explain what is on this page", ಅಥವಾ "Help me fill out a form".',
      stoppedMessage: 'ನಾನು ಕೇಳುವುದನ್ನು ಮತ್ತು ಮಾತನಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇನೆ. ನಿಧಾನವಾಗಿ ಸಿದ್ಧರಾದಾಗ ಮೈಕ್ ಒತ್ತಿರಿ.',
      updatedFieldReply: (label, value) => `ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ${label} ಅನ್ನು "${value}" ಎಂದು ನಮೂದಿಸಿದ್ದೇನೆ.`,
      unrecognizedReply: (fieldLabel, example) =>
        `ನಿಮ್ಮ ${fieldLabel} ಸರಿಯಾಗಿ ಬರೆಯಲು ಬಯಸುತ್ತೇನೆ. ದಯವಿಟ್ಟು ಸರಳವಾಗಿ ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ, ಉದಾಹರಣೆಗೆ: "${example}".`,
      startConversation: 'ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ',
      endConversation: 'ಸಂಭಾಷಣೆ ಮುಗಿಸಿ',
      conversationActiveHint: 'ಸಂಭಾಷಣೆ ಚಾಲನೆಯಲ್ಲಿದೆ · ಸಹಾಯ ಮಾತನಾಡಿದ ನಂತರ ಕೇಳುವುದು ತಾನಾಗಿಯೇ ಮುಂದುವರಿಯುತ್ತದೆ.',
      stateLabels: {
        idle: 'ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧವಾಗಿದೆ',
        listening: 'ನಿಮ್ಮ ಮಾತು ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ',
        processing: 'ಉತ್ತರವನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ',
        executing: 'ಕಾರ್ಯವನ್ನು ತೋರಿಸುತ್ತಿದೆ',
        speaking: 'ಸಹಾಯ ಮಾತನಾಡುತ್ತಿದೆ',
        error: 'ಮೈಕ್ರೋಫೋನ್ ಪರಿಶೀಲಿಸಿ',
      },
      youSaidLabel: 'ನೀವು ಹೇಳಿದ್ದು',
      understoodLabel: 'ಸಹಾಯ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದು',
      sahaayaReplyLabel: 'ಸಹಾಯ ಉತ್ತರ',
      showHistoryLabel: 'ಹಿಂದಿನ ಮಾತುಕತೆ ತೋರಿಸಿ',
      hideHistoryLabel: 'ಹಿಂದಿನ ಮಾತುಕತೆ ಮರೆಮಾಡಿ',
      endedMessage: 'ಸಂಭಾಷಣೆ ಮುಗಿದಿದೆ. ಮುಂದುವರಿಸಲು ಯಾವಾಗ ಬೇಕಾದರೂ ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ ಒತ್ತಿರಿ.',
      unexpectedStopNotice: 'ಕೇಳುವುದು ಸ್ವಲ್ಪ ಸಮಯ ನಿಂತಿದೆ. ದಯವಿಟ್ಟು ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ ಒತ್ತಿರಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
      confirmCard: {
        titleName: 'ನಿಮ್ಮ ಹೆಸರನ್ನು ದೃಢಪಡಿಸಿ',
        titleDetail: (fieldLabel) => `${fieldLabel} ದೃಢಪಡಿಸಿ`,
        heardLabel: 'ನಾನು ಕೇಳಿಸಿಕೊಂಡಿದ್ದು:',
        question: 'ಇದು ಸರಿಯಾಗಿದೆಯೇ?',
        yesCorrect: 'ಹೌದು, ಇದು ಸರಿಯಾಗಿದೆ',
        spellName: 'ಹೆಸರಿನ ಅಕ್ಷರ ಹೇಳಿ (Spell)',
        editField: 'ತಿದ್ದುಪಡಿ',
        editSave: 'ಉಳಿಸಿ ಮತ್ತು ದೃಢಪಡಿಸಿ',
        editCancel: 'ಹಿಂದೆ',
        spellingTitle: 'ನಿಮ್ಮ ಹೆಸರನ್ನು ಒಂದೊಂದೇ ಅಕ್ಷರದಲ್ಲಿ ಹೇಳಿ ಅಥವಾ ಒತ್ತಿರಿ',
        spellingHint: 'ಒಂದೊಂದೇ ಅಕ್ಷರ ಹೇಳಿ (ಉದಾ. "R A M E S H"), ಕೆಳಗಿನ ಅಕ್ಷರ ಒತ್ತಿರಿ, ಅಥವಾ "Space" ಮತ್ತು "Done" ಹೇಳಿ.',
        spaceKey: 'ಜಾಗ (Space)',
        backspaceKey: 'ಅಳಿಸಿ',
        clearKey: 'ತೆರವುಗೊಳಿಸಿ',
        doneSpelling: 'ಅಕ್ಷರದ ಹೆಸರನ್ನು ದೃಢಪಡಿಸಿ',
        nameReadbackPrompt: (name) =>
          `ನಿಮ್ಮ ಹೆಸರು ${name} ಎಂದು ಕೇಳಿಸಿತು. ಇದು ಸರಿಯಾಗಿದೆಯೇ? ಹೌದು, ಅಕ್ಷರ ಹೇಳಿ, ಅಥವಾ ತಿದ್ದುಪಡಿ ಎಂದು ಹೇಳಬಹುದು.`,
        detailReadbackPrompt: (fieldLabel, spokenValue) =>
          `ನಿಮ್ಮ ${fieldLabel} ${spokenValue} ಎಂದು ಕೇಳಿಸಿತು. ಇದು ಸರಿಯಾಗಿದೆಯೇ? ಹೌದು ಅಥವಾ ತಿದ್ದುಪಡಿ ಎಂದು ಹೇಳಿ.`,
        spellStartPrompt:
          'ಖಂಡಿತ, ನಿಮ್ಮ ಹೆಸರನ್ನು ಒಂದೊಂದೇ ಅಕ್ಷರದಲ್ಲಿ ಬರೆಯೋಣ. ದಯವಿಟ್ಟು ಒಂದೊಂದೇ ಅಕ್ಷರ ನಿಧಾನವಾಗಿ ಹೇಳಿ ಅಥವಾ ಪರದೆಯ ಮೇಲೆ ಒತ್ತಿರಿ.',
        editPrompt: (fieldLabel) =>
          `ದಯವಿಟ್ಟು ಪರದೆಯ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ನಿಮ್ಮ ${fieldLabel} ಅನ್ನು ಸರಿಪಡಿಸಿ ಉಳಿಸಿ ಒತ್ತಿರಿ.`,
      },
      taskInspector: {
        sectionTitle: 'ಗುರುತಿಸಿದ ಕಾರ್ಯ',
        emptyHint:
          'ಹೀಗೆ ಹೇಳಿ ನೋಡಿ: "Open YouTube", "Search for nearby hospitals", "Prepare a message", ಅಥವಾ "Help me fill out a form".',
        instructionLabel: 'ಗುರುತಿಸಿದ ಸೂಚನೆ',
        detectedTaskLabel: 'ಗುರುತಿಸಿದ ಕಾರ್ಯ',
        requiredInfoLabel: 'ಅಗತ್ಯವಿರುವ ಮಾಹಿತಿ',
        statusLabel: 'ಕಾರ್ಯದ ಸ್ಥಿತಿ',
        noneNeeded: 'ಎಲ್ಲಾ ವಿವರ ಸಿದ್ಧವಾಗಿದೆ',
        confirmTaskButton: 'ಹೌದು, ಮುಂದುವರಿಸಿ',
        cancelTaskButton: 'ರದ್ದುಗೊಳಿಸಿ',
        openExternalButton: 'ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಿರಿ',
        categoryLabels: {
          general_conversation: 'ಸಾಮಾನ್ಯ ಸಂಭಾಷಣೆ',
          app_launch: 'ವೆಬ್‌ಸೈಟ್ / ಆ್ಯಪ್ ತೆರೆಯಿರಿ',
          unknown_app: 'ಅಪರಿಚಿತ ಆ್ಯಪ್',
          search: 'ಹುಡುಕಾಟ (Search)',
          messaging: 'ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಿ',
          screen_assistance: 'ಪರದೆ ಸಹಾಯ',
          navigation: 'ನ್ಯಾವಿಗೇಷನ್',
          application_task: 'ಕಲ್ಯಾಣ ಅರ್ಜಿ',
        },
        statusLabels: {
          ready: 'ಸಿದ್ಧವಾಗಿದೆ',
          needs_info: 'ಅಗತ್ಯ ಮಾಹಿತಿಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
          awaiting_confirmation: 'ನಿಮ್ಮ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ',
          executing: 'ಕಾರ್ಯಗತಗೊಳ್ಳುತ್ತಿದೆ',
          executed_in_web: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
          simulated_completed: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಪೂರ್ಣ (ಡೆಮೊ)',
          opened_externally: 'ಹೊರಗೆ ತೆರೆಯಲಾಗಿದೆ',
          requires_permission: 'ಸಾಧನದ ಅನುಮತಿ ಅಗತ್ಯವಿದೆ',
          unavailable_on_web: 'ಈ ವೇದಿಕೆಯಲ್ಲಿ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ',
          failed: 'ವಿಫಲವಾಗಿದೆ',
          cancelled: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
        },
      },
      demoMode: {
        label: 'ಕಾರ್ಯಗತಗೊಳಿಸುವ ವಿಧಾನ',
        interactiveDemo: 'ಇಂಟರ್ಯಾಕ್ಟಿವ್ ಡೆಮೊ ಮೋಡ್',
        interactiveDemoHint: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಆ್ಯಪ್ ಪ್ರದರ್ಶನ',
        realBrowser: 'ರಿಯಲ್ ಬ್ರೌಸರ್ ಮೋಡ್',
        realBrowserHint: 'ನಿಜವಾದ ವೆಬ್‌ಸೈಟ್, ಸ್ಥಳ ಮತ್ತು WhatsApp ಲಿಂಕ್ ತೆರೆಯುತ್ತದೆ',
        simulatedBadge: 'ಸಿಮ್ಯುಲೇಟೆಡ್ — ಡೆಮೊ ಮೋಡ್',
        realBadge: 'ನಿಜವಾದ ಬ್ರೌಸರ್ ಕಾರ್ಯ',
        executionPanelTitle: 'ಕಾರ್ಯ ಹಂತಗಳು',
        deviceScreenTitle: 'ಇಂಟರ್ಯಾಕ್ಟಿವ್ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಪೂರ್ವವೀಕ್ಷಣೆ',
        demoSubmissionBanner: 'DEMO SUBMISSION — No real application was submitted.',
      },
      demoGuide: {
        title: 'ಡೆಮೊ ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ಉದಾಹರಣೆಗಳು',
        toggleShow: 'ತೋರಿಸಿ',
        toggleHide: 'ಮರೆಮಾಡಿ',
        platformLabel: 'ಬ್ರೌಸರ್ ಪರಿಸರ',
        micLabel: 'ಮೈಕ್ರೋಫೋನ್',
        micGranted: 'ಅನುಮತಿ ನೀಡಲಾಗಿದೆ',
        micPrompt: 'ಪ್ರಾರಂಭಿಸಿದಾಗ ಕೇಳುತ್ತದೆ',
        micDenied: 'ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ (ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಅನುಮತಿ ನೀಡಿ)',
        micUnsupported: 'ಲಭ್ಯವಿಲ್ಲ (ಟೈಪಿಂಗ್ ಸಕ್ರಿಯವಾಗಿದೆ)',
        tryCommandsLabel: 'ಪರೀಕ್ಷಿಸಲು ಒಂದು ಸೂಚನೆಯನ್ನು ಒತ್ತಿರಿ:',
        examples: [
          'Open YouTube.',
          'Search for nearby hospitals.',
          'Prepare a WhatsApp message saying I will reach home by 6.',
          'Read my application.',
          'Explain missing fields.',
        ],
        browserWorksTitle: 'ಈ ಬ್ರೌಸರ್ ಡೆಮೊದಲ್ಲಿ ಲಭ್ಯ',
        browserWorksBody:
          'ನಿರಂತರ ಧ್ವನಿ ಮತ್ತು ಟೈಪಿಂಗ್ ಸಂಭಾಷಣೆ, ಕಲ್ಯಾಣ ಅರ್ಜಿ ಭರ್ತಿ, ಪರದೆ ಮತ್ತು ಅರ್ಜಿ ಓದುವುದು, ಅನುಮತಿಯೊಂದಿಗೆ Google Maps/Search, ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್ ತೆರೆಯುವುದು ಮತ್ತು WhatsApp ಡ್ರಾಫ್ಟ್ ಲಿಂಕ್.',
        androidFutureTitle: 'ಭವಿಷ್ಯದ Android ಆ್ಯಪ್ ಅಗತ್ಯ',
        androidFutureBody:
          'ಫೋನ್‌ನ ಇತರ ಆ್ಯಪ್ ನಿಯಂತ್ರಿಸುವುದು, ಬೇರೆ ಆ್ಯಪ್ ಪರದೆ ಓದುವುದು, ಸೆಟ್ಟಿಂಗ್ಸ್/ಕ್ಯಾಮೆರಾ ಮತ್ತು ನೇರವಾಗಿ ಸಂದೇಶ ಕಳುಹಿಸುವುದು.',
        httpsNote:
          'ಮೈಕ್ರೋಫೋನ್ ಮತ್ತು ಸ್ಥಳ ಸೌಲಭ್ಯಗಳು Chrome, Edge ಅಥವಾ Safari ನಲ್ಲಿ HTTPS ಅಥವಾ localhost ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತವೆ.',
      },
    },
    form: {
      title: 'ಹಿರಿಯ ನಾಗರಿಕರ ಕಲ್ಯಾಣ ಅರ್ಜಿ',
      subtitle: 'ಕೆಳಗಿನ ಯಾವುದೇ ವಿವರವನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಬದಲಾಯಿಸಿ. ಒಂದೇ ವಿವರವನ್ನು ಮಾತನಾಡಿ ಭರ್ತಿ ಮಾಡಲು ಮೈಕ್ ಒತ್ತಿರಿ.',
      progressText: (filled, total) => `${total} ರಲ್ಲಿ ${filled} ವಿವರಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ`,
      completedLabel: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
      pendingLabel: 'ಬಾಕಿ ಇದೆ',
      needsAttentionLabel: 'ಪರಿಶೀಲಿಸಿ',
      speakFieldLabel: 'ಮಾತನಾಡಿ',
      editFieldLabel: 'ತಿದ್ದುಪಡಿ',
      saveFieldLabel: 'ಸರಿ',
      backToAssistant: 'ಧ್ವನಿ ಸಹಾಯಕಕ್ಕೆ ಹಿಂತಿರುಗಿ',
      continueToReview: 'ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
      clearDraft: 'ಅರ್ಜಿ ತೆರವುಗೊಳಿಸಿ',
      selectOption: 'ಆಯ್ಕೆ ಮಾಡಿ',
      validationSummary: 'ಮುಂದುವರಿಯುವ ಮೊದಲು ಗುರುತಿಸಿದ ವಿವರಗಳನ್ನು ಸರಿಪಡಿಸಿ.',
    },
    review: {
      title: 'ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
      subtitle: 'ಎಲ್ಲಾ ವಿವರಗಳು ಸರಿಯಾಗಿವೆಯೇ ಎಂದು ದಯವಿಟ್ಟು ಎಚ್ಚರಿಕೆಯಿಂದ ಓದಿ ಅಥವಾ ಕೇಳಿ.',
      readAloud: 'ಗಟ್ಟಿಯಾಗಿ ಓದಿ',
      stopReading: 'ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ',
      editButton: 'ಬದಲಾಯಿಸಿ',
      confirmationQuestion: 'ನಿಮ್ಮ ಎಲ್ಲಾ ವಿವರಗಳು ಸರಿಯಾಗಿವೆಯೇ ಮತ್ತು ಈ ಡೆಮೊ ಅರ್ಜಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?',
      confirmationSubtext: 'ಇದು ಕೇವಲ ಪ್ರಾಯೋಗಿಕ ಡೆಮೊ. ಯಾವುದೇ ನಿಜವಾದ ಸರ್ಕಾರಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗುವುದಿಲ್ಲ.',
      yesSubmit: 'ಹೌದು, ಡೆಮೊ ಅರ್ಜಿ ಪೂರ್ಣಗೊಳಿಸಿ',
      noGoBack: 'ಇಲ್ಲ, ಬದಲಾವಣೆ ಮಾಡಬೇಕು',
      missingNotice: 'ಕೆಲವು ವಿವರಗಳು ಇನ್ನೂ ಖಾಲಿ ಇವೆ. ಪೂರ್ಣಗೊಳಿಸುವ ಮೊದಲು ಎಲ್ಲಾ 9 ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ.',
      notProvided: 'ಇನ್ನೂ ನೀಡಿಲ್ಲ',
      readAloudTemplate: (summaryLines) =>
        `ನಿಮ್ಮ ಹಿರಿಯ ನಾಗರಿಕರ ಕಲ್ಯಾಣ ಅರ್ಜಿಯ ಸಾರಾಂಶ ಇಲ್ಲಿದೆ. ${summaryLines}. ಎಲ್ಲಾ ವಿವರಗಳು ಸರಿಯಾಗಿವೆಯೇ ಎಂದು ದೃಢಪಡಿಸಿ.`,
    },
    success: {
      title: 'ನಿಮ್ಮ ಡೆಮೊ ಅರ್ಜಿ ಪೂರ್ಣಗೊಂಡಿದೆ.',
      confirmationLabel: 'ಡೆಮೊ ದೃಢೀಕರಣ ಸಂಖ್ಯೆ',
      submittedOn: 'ಪೂರ್ಣಗೊಂಡ ದಿನಾಂಕ',
      applicantLabel: 'ಅರ್ಜಿದಾರರ ಹೆಸರು',
      downloadReceipt: 'ರಸೀದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      disclaimerTitle: 'ಪ್ರಮುಖ ಪ್ರಾಯೋಗಿಕ ಸೂಚನೆ',
      disclaimerBody:
        'ಇದು ಸಹಾಯ ಪ್ರಾಯೋಗಿಕ ಪ್ರದರ್ಶನಕ್ಕಾಗಿ ರಚಿಸಲಾದ ನಕಲಿ (ಸಿಮ್ಯುಲೇಟೆಡ್) ಅರ್ಜಿಯಾಗಿದೆ. ಇದು ಯಾವುದೇ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ಗೆ ಸಂಪರ್ಕ ಹೊಂದಿಲ್ಲ ಮತ್ತು ನಿಜವಾದ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸುವುದಿಲ್ಲ.',
      startNew: 'ಹೊಸ ಡೆಮೊ ಅರ್ಜಿ ಪ್ರಾರಂಭಿಸಿ',
      backHome: 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
    },
    fields: {
      fullName: {
        label: 'ಪೂರ್ಣ ಹೆಸರು',
        placeholder: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
        voicePrompt: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರೇನು?',
        example: 'ನನ್ನ ಹೆಸರು ಮಾದರಿ ಅರ್ಜಿದಾರ',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳ ಸರಿಯಾದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
      },
      age: {
        label: 'ವಯಸ್ಸು (ವರ್ಷಗಳಲ್ಲಿ)',
        placeholder: 'ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ (50–120)',
        voicePrompt: 'ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು ವರ್ಷ?',
        example: 'ನನ್ನ ವಯಸ್ಸು 65 ವರ್ಷ',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು 50 ರಿಂದ 120 ರ ನಡುವಿನ ಸರಿಯಾದ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ.',
      },
      dateOfBirth: {
        label: 'ಜನ್ಮ ದಿನಾಂಕ',
        placeholder: 'YYYY-MM-DD',
        voicePrompt: 'ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಯಾವುದು?',
        example: '01 ಜನವರಿ 1960',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ಹಳೆಯ ಜನ್ಮ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ.',
      },
      gender: {
        label: 'ಲಿಂಗ',
        placeholder: 'ಆಯ್ಕೆ ಮಾಡಿ',
        voicePrompt: 'ನಿಮ್ಮ ಲಿಂಗ ಯಾವುದು? ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ ಎಂದು ಹೇಳಿ.',
        example: 'ಮಹಿಳೆ',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಲಿಂಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಪುರುಷ, ಮಹಿಳೆ ಅಥವಾ ಇತರೆ ಆಯ್ಕೆ ಮಾಡಿ.',
      },
      state: {
        label: 'ರಾಜ್ಯ',
        placeholder: 'ನಿಮ್ಮ ರಾಜ್ಯವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ',
        voicePrompt: 'ನೀವು ಭಾರತದ ಯಾವ ರಾಜ್ಯದಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೀರಿ?',
        example: 'ಕರ್ನಾಟಕ',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ರಾಜ್ಯವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ರಾಜ್ಯವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
      },
      district: {
        label: 'ಜಿಲ್ಲೆ',
        placeholder: 'ನಿಮ್ಮ ಜಿಲ್ಲೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
        voicePrompt: 'ನೀವು ಯಾವ ಜಿಲ್ಲೆಯಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೀರಿ?',
        example: 'ನನ್ನ ಜಿಲ್ಲೆ ಮಾದರಿ ಜಿಲ್ಲೆ',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಜಿಲ್ಲೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ ಜಿಲ್ಲೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
      },
      address: {
        label: 'ಪೂರ್ಣ ವಿಳಾಸ',
        placeholder: 'ಮನೆ ಸಂಖ್ಯೆ, ಬೀದಿ, ಬಡಾವಣೆ, ಪಿನ್ ಕೋಡ್',
        voicePrompt: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮನೆಯ ಪೂರ್ಣ ವಿಳಾಸವನ್ನು ಹೇಳಿ.',
        example: 'ಮನೆ 10, ಮುಖ್ಯ ರಸ್ತೆ, ಮಾದರಿ ನಗರ 100001',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮನೆಯ ಪೂರ್ಣ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ವಿವರವಾದ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ.',
      },
      mobileNumber: {
        label: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        placeholder: '10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        voicePrompt: 'ನಿಮ್ಮ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಯಾವುದು?',
        example: '9000000000',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ 10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು 6, 7, 8 ಅಥವಾ 9 ರಿಂದ ಪ್ರಾರಂಭವಾಗುವ 10 ಅಂಕಿಗಳ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
      },
      annualIncome: {
        label: 'ವಾರ್ಷಿಕ ಆದಾಯ (₹)',
        placeholder: 'ವಾರ್ಷಿಕ ಆದಾಯವನ್ನು ₹ ನಲ್ಲಿ ನಮೂದಿಸಿ',
        voicePrompt: 'ನಿಮ್ಮ ಕುಟುಂಬದ ವಾರ್ಷಿಕ ಆದಾಯ ಸುಮಾರು ಎಷ್ಟು?',
        example: '100000',
        errorRequired: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಾರ್ಷಿಕ ಆದಾಯವನ್ನು ನಮೂದಿಸಿ.',
        errorInvalid: 'ದಯವಿಟ್ಟು ರೂಪಾಯಿಗಳಲ್ಲಿ ಸರಿಯಾದ ಮೊತ್ತವನ್ನು ನಮೂದಿಸಿ.',
      },
    },
    genderOptions: {
      Male: 'ಪುರುಷ (Male)',
      Female: 'ಮಹಿಳೆ (Female)',
      Other: 'ಇತರೆ (Other)',
    },
  },
};
