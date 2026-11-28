import assert from 'node:assert/strict';
import {
  EMPTY_APPLICATION_DATA,
  formatValueForSpeech,
  getCompletionStats,
  parseConfirmationReply,
  parseSpelledInput,
  parseVoiceInput,
  requiresExplicitConfirmation,
  validateAllFields,
} from '../src/utils/applicationLogic';
import { TRANSLATIONS } from '../src/i18n/translations';
import {
  advanceTaskConversation,
  buildGeneralFallbackResponse,
  classifyPendingConfirmationReply,
  parseNaturalCommand,
} from '../src/utils/commandIntentEngine';
import {
  detectPlatformCapabilities,
  queryMicrophonePermission,
} from '../src/utils/platformCapabilities';
import {
  buildApplicationReadout,
  buildMissingFieldsExplanation,
  executeConfirmedTask,
  PlatformExecutionAdapter,
  prepareTaskForPlatform,
} from '../src/utils/platformExecutor';
import { DEMO_APP_REGISTRY, resolveDemoAppId } from '../src/utils/demoAppRegistry';
import { DemoAppId } from '../src/types/demoExecution';
import { evaluateMathExpression } from '../src/utils/calculatorEngine';
import {
  buildCalendarMonthGrid,
  extractCalendarCommand,
  formatIsoDate,
  updateDemoCalendarEventInStore,
} from '../src/utils/calendarEngine';
import {
  LastTaskContext,
  parseContextualFollowUp,
  resolveTaskContextTurn,
} from '../src/utils/conversationTaskManager';
import {
  advanceDemoAnimationStage,
  advanceDemoSimulatorPhase,
  buildDemoConfirmationPrompt,
  cancelDemoSession,
  createDemoSessionForTask,
  evaluatePendingTaskTurn,
  getSimulatorTimeline,
  runDemoExecution,
} from '../src/utils/demoExecutionEngine';
import {
  SpeechEnvironment,
  SpeechRecognitionInstance,
  SpeechSessionController,
  SpeechSynthesisLike,
  SpeechSynthesisUtteranceLike,
} from '../src/utils/speechSessionController';
import {
  buildLowConfidenceClarificationReply,
  detectSpokenLanguage,
} from '../src/utils/pronunciationAndLanguageEngine';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockSpeechEnv() {
  const instances: MockRecognition[] = [];
  const spokenUtterances: MockUtterance[] = [];
  let cancelCount = 0;

  class MockRecognition implements SpeechRecognitionInstance {
    lang = 'en-IN';
    continuous = false;
    interimResults = true;
    maxAlternatives = 1;
    onstart: (() => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    aborted = false;
    stopped = false;

    constructor() {
      instances.push(this);
    }

    start() {
      this.started = true;
      this.onstart?.();
    }

    stop() {
      this.stopped = true;
    }

    abort() {
      this.aborted = true;
    }

    emitFinal(transcript: string) {
      this.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript, confidence: 0.96 },
          },
        },
      });
      this.onend?.();
    }

    emitResult(items: Array<{ transcript: string; isFinal: boolean }>) {
      const resultsObj: Record<number, unknown> & { length: number } = {
        length: items.length,
      };
      items.forEach((item, idx) => {
        resultsObj[idx] = {
          isFinal: item.isFinal,
          length: 1,
          0: { transcript: item.transcript, confidence: 0.95 },
        };
      });
      this.onresult?.({
        resultIndex: 0,
        results: resultsObj,
      });
    }

    emitUnexpectedEnd() {
      this.onend?.();
    }

    emitError(error: string) {
      this.onerror?.({ error });
    }
  }

  class MockUtterance implements SpeechSynthesisUtteranceLike {
    lang = 'en-IN';
    rate = 1;
    pitch = 1;
    voice = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }

  const synth: SpeechSynthesisLike = {
    cancel: () => {
      cancelCount += 1;
    },
    speak: (u) => {
      const mu = u as MockUtterance;
      spokenUtterances.push(mu);
      mu.onstart?.();
    },
    getVoices: () => [{ lang: 'en-IN' } as SpeechSynthesisVoice],
    onvoiceschanged: null,
  };

  const env: SpeechEnvironment = {
    getRecognitionCtor: () => MockRecognition,
    getSynthesis: () => synth,
    createUtterance: (text) => new MockUtterance(text),
  };

  return {
    env,
    instances,
    spokenUtterances,
    getCancelCount: () => cancelCount,
  };
}

async function runTests() {
  let passed = 0;

  // Test 1-4 & 8: Start conversation -> First answer -> Assistant speech (echo-safe) -> Automatic listening restart -> End conversation
  {
    const mock = createMockSpeechEnv();
    const transcripts: string[] = [];

    const ctrl = new SpeechSessionController({
      lang: 'en',
      env: mock.env,
      onFinalTranscript: (t) => transcripts.push(t),
      onStateChange: () => {},
    });

    // 1. Start conversation
    ctrl.startConversation();
    assert.equal(ctrl.getSnapshot().isConversationActive, true);
    assert.equal(ctrl.getSnapshot().sessionState, 'listening');
    assert.equal(mock.instances.length, 1);

    // 2. First answer captured -> enters processing
    mock.instances[0].emitFinal('My name is Ramesh Kulkarni');
    assert.deepEqual(transcripts, ['My name is Ramesh Kulkarni']);
    assert.equal(ctrl.getSnapshot().sessionState, 'processing');

    // 3. Assistant speaks -> stops recognition, prevents overlapping utterances
    ctrl.speak('I heard your name as Ramesh Kulkarni. Is that correct?');
    assert.equal(ctrl.getSnapshot().sessionState, 'speaking');
    assert.equal(mock.spokenUtterances.length, 1);

    // Speak again immediately -> cancels prior utterance cleanly without overlap
    ctrl.speak('I heard your name as Ramesh Kulkarni. Is that correct? Say Yes or Spell.');
    assert.ok(mock.getCancelCount() >= 2);
    assert.equal(mock.spokenUtterances.length, 2);

    // 4. After assistant finishes speaking -> listening resumes automatically
    mock.spokenUtterances[1].onend?.();
    await wait(320);
    assert.equal(ctrl.getSnapshot().sessionState, 'listening');
    assert.equal(ctrl.getSnapshot().isConversationActive, true);
    assert.equal(mock.instances.length, 2);

    // 8. End conversation explicitly
    ctrl.endConversation();
    assert.equal(ctrl.getSnapshot().isConversationActive, false);
    assert.equal(ctrl.getSnapshot().sessionState, 'idle');
    assert.equal(mock.instances[1].aborted, true);

    ctrl.destroy();
    passed += 5; // Tests 1, 2, 3, 4, 8
  }

  // Test 5 & 6: Smart Personal Name Recognition, Confirmation, Letter-by-Letter Spelling & Critical Field Confirmations
  {
    let data = { ...EMPTY_APPLICATION_DATA };
    const nameOutcome = parseVoiceInput('My name is Ramesh Kulkarni', 'fullName', data);
    assert.equal(nameOutcome.type, 'field_updated');
    if (nameOutcome.type === 'field_updated') {
      assert.equal(nameOutcome.value, 'Ramesh Kulkarni');
      assert.equal(requiresExplicitConfirmation('fullName'), true);
    }

    // Confirm reply detection
    assert.equal(parseConfirmationReply("Yes, that's correct"), 'confirm');
    assert.equal(parseConfirmationReply('Spell my name'), 'spell');
    assert.equal(parseConfirmationReply('Edit name'), 'edit');
    assert.equal(parseConfirmationReply('हाँ, यह सही है'), 'confirm');
    assert.equal(parseConfirmationReply('ಹೌದು'), 'confirm');

    // Letter-by-letter spelling flow
    let tokens: string[] = [];
    const step1 = parseSpelledInput('R A M E S H', tokens);
    assert.equal(step1.action, 'update');
    if (step1.action === 'update') {
      tokens = step1.tokens;
      assert.equal(step1.constructedName, 'Ramesh');
    }
    const step2 = parseSpelledInput('space', tokens);
    if (step2.action === 'update') tokens = step2.tokens;
    const step3 = parseSpelledInput('R A O', tokens);
    if (step3.action === 'update') {
      tokens = step3.tokens;
      assert.equal(step3.constructedName, 'Ramesh Rao');
    }
    const stepDone = parseSpelledInput('done', tokens);
    assert.equal(stepDone.action, 'done');

    // Mobile number, DOB, Annual Income validation + speech-friendly readback
    assert.equal(requiresExplicitConfirmation('mobileNumber'), true);
    assert.equal(requiresExplicitConfirmation('dateOfBirth'), true);
    assert.equal(requiresExplicitConfirmation('annualIncome'), true);
    assert.equal(
      formatValueForSpeech('mobileNumber', '9845012345', 'en'),
      '9 8 4 5 0, 1 2 3 4 5'
    );
    assert.equal(
      formatValueForSpeech('annualIncome', '120000', 'en'),
      '1,20,000 rupees'
    );

    // Full 9-field completion check
    data = {
      fullName: 'Ramesh Rao',
      age: '68',
      dateOfBirth: '1958-08-15',
      gender: 'Male',
      state: 'Karnataka',
      district: 'Mysuru',
      address: '24 Gandhi Nagar, Mysuru 570001',
      mobileNumber: '9845012345',
      annualIncome: '120000',
    };
    assert.deepEqual(validateAllFields(data, 'en'), {});
    passed += 2; // Tests 5, 6
  }

  // Test 7: Manual text fallback when SpeechRecognition is unsupported
  {
    const unsupportedEnv: SpeechEnvironment = {
      getRecognitionCtor: () => null,
      getSynthesis: () => null,
      createUtterance: (text) =>
        ({
          text,
          lang: 'en-IN',
          rate: 1,
          pitch: 1,
          voice: null,
          onstart: null,
          onend: null,
          onerror: null,
        }) as unknown as SpeechSynthesisUtteranceLike,
    };

    const ctrl = new SpeechSessionController({
      lang: 'en',
      env: unsupportedEnv,
      onFinalTranscript: () => {},
      onStateChange: () => {},
    });

    assert.equal(ctrl.getSnapshot().capabilities.recognitionSupported, false);
    ctrl.startConversation();
    assert.equal(ctrl.getSnapshot().sessionState, 'error');
    assert.equal(ctrl.getSnapshot().speechError, 'not-supported');

    // Pure text parser still works seamlessly as fallback
    const ageRes = parseVoiceInput('I am 68 years old', 'age', EMPTY_APPLICATION_DATA);
    assert.equal(ageRes.type, 'field_updated');
    ctrl.destroy();
    passed += 1; // Test 7
  }

  // Test 9: Microphone permission denial
  {
    const mock = createMockSpeechEnv();

    const ctrl = new SpeechSessionController({
      lang: 'en',
      env: mock.env,
      onFinalTranscript: () => {},
      onStateChange: () => {},
    });

    ctrl.startConversation();
    mock.instances[0].emitError('not-allowed');
    assert.equal(ctrl.getSnapshot().sessionState, 'error');
    assert.equal(ctrl.getSnapshot().speechError, 'permission-denied');
    assert.equal(ctrl.getSnapshot().isConversationActive, false);

    // Ensure it does NOT auto-restart after permission denial
    await wait(350);
    assert.equal(mock.instances.length, 1);
    ctrl.destroy();
    passed += 1; // Test 9
  }

  // Test 10: Unexpected speech-recognition termination recovery
  {
    const mock = createMockSpeechEnv();

    const ctrl = new SpeechSessionController({
      lang: 'en',
      env: mock.env,
      onFinalTranscript: () => {},
      onStateChange: () => {},
    });

    ctrl.startConversation();
    assert.equal(mock.instances.length, 1);

    // Unexpected onend without transcript during active session -> restarts automatically
    mock.instances[0].emitUnexpectedEnd();
    await wait(350);
    assert.equal(mock.instances.length, 2);
    assert.equal(ctrl.getSnapshot().sessionState, 'listening');
    assert.equal(ctrl.getSnapshot().isConversationActive, true);

    ctrl.destroy();
    passed += 1; // Test 10
  }

  // Test 11: Open YouTube
  {
    const res = parseNaturalCommand('Open YouTube.', 'en');
    assert.equal(res.matched, true);
    assert.equal(res.task?.intent, 'app_launch');
    assert.equal(res.task?.application, 'YouTube');
    assert.equal(res.task?.executionStatus, 'unavailable_on_web');
    assert.match(res.replyText, /cannot launch external mobile apps/i);
    passed += 1;
  }

  // Test 12: Open WhatsApp
  {
    const res = parseNaturalCommand('Open WhatsApp', 'en');
    assert.equal(res.matched, true);
    assert.equal(res.task?.intent, 'app_launch');
    assert.equal(res.task?.application, 'WhatsApp');
    assert.equal(res.task?.executionStatus, 'unavailable_on_web');
    passed += 1;
  }

  // Test 13: Search for nearby hospitals
  {
    const res = parseNaturalCommand('Search for hospitals near me.', 'en');
    assert.equal(res.matched, true);
    assert.equal(res.task?.intent, 'search');
    assert.equal(res.task?.target, 'hospitals near me');
    assert.equal(res.task?.confirmationRequired, true);
    assert.equal(res.task?.executionStatus, 'awaiting_confirmation');
    passed += 1;
  }

  // Test 14: Compose a message (including recipient extraction & WhatsApp)
  {
    const msgRahul = parseNaturalCommand('I want to message Rahul.', 'en');
    assert.equal(msgRahul.matched, true);
    assert.equal(msgRahul.task?.intent, 'messaging');
    assert.equal(msgRahul.task?.target, 'Rahul');
    assert.deepEqual(msgRahul.task?.missingParameters, ['messageContent']);
    assert.equal(msgRahul.task?.executionStatus, 'needs_info');

    const msgWa = parseNaturalCommand('Help me compose a WhatsApp message', 'en');
    assert.equal(msgWa.matched, true);
    assert.equal(msgWa.task?.intent, 'messaging');
    assert.equal(msgWa.task?.application, 'WhatsApp');
    assert.deepEqual(msgWa.task?.missingParameters, ['recipient', 'messageContent']);
    passed += 1;
  }

  // Test 15: Read screen request (in-app vs external app safety boundary)
  {
    const inAppRead = parseNaturalCommand('Read my screen.', 'en');
    assert.equal(inAppRead.matched, true);
    assert.equal(inAppRead.task?.intent, 'screen_assistance');
    assert.equal(inAppRead.task?.executionStatus, 'executed_in_web');
    assert.equal(inAppRead.webAction?.type, 'read_screen');

    const extRead = parseNaturalCommand('Read my WhatsApp screen', 'en');
    assert.equal(extRead.matched, true);
    assert.equal(extRead.task?.intent, 'screen_assistance');
    assert.equal(extRead.task?.executionStatus, 'unavailable_on_web');
    assert.match(extRead.replyText, /cannot read WhatsApp/i);
    passed += 1;
  }

  // Test 16: Go back
  {
    const navRes = parseNaturalCommand('Go back.', 'en');
    assert.equal(navRes.matched, true);
    assert.equal(navRes.task?.intent, 'navigation');
    assert.equal(navRes.task?.action, 'go_back');
    assert.equal(navRes.task?.executionStatus, 'executed_in_web');
    assert.equal(navRes.webAction?.type, 'go_back');
    passed += 1;
  }

  // Test 17: Incomplete commands & multi-turn slot filling
  {
    const step1 = parseNaturalCommand('Send a message.', 'en');
    assert.equal(step1.matched, true);
    assert.equal(step1.task?.executionStatus, 'needs_info');
    assert.equal(step1.replyText, 'Who would you like to message?');

    const step2 = advanceTaskConversation(step1.task!, 'My daughter.', 'en');
    assert.equal(step2.task.target, 'My daughter');
    assert.equal(step2.task.executionStatus, 'needs_info');
    assert.equal(step2.replyText, 'What would you like the message to say?');

    const step3 = advanceTaskConversation(step2.task, "I'll reach home by six.", 'en');
    assert.equal(step3.task.messageContent, "I'll reach home by six.");
    assert.equal(step3.task.executionStatus, 'awaiting_confirmation');
    assert.match(step3.replyText, /I'll reach home by six/i);
    assert.match(step3.replyText, /Would you like to continue\?/i);

    const incompleteSearch = parseNaturalCommand('Search', 'en');
    assert.equal(incompleteSearch.task?.intent, 'search');
    assert.equal(incompleteSearch.task?.executionStatus, 'needs_info');
    assert.equal(incompleteSearch.replyText, 'What would you like me to search for?');
    passed += 1;
  }

  // Test 18: Unknown applications
  {
    const unknownApp = parseNaturalCommand('Open Zomato', 'en');
    assert.equal(unknownApp.matched, true);
    assert.equal(unknownApp.task?.intent, 'unknown_app');
    assert.equal(unknownApp.task?.application, 'Zomato');
    assert.equal(unknownApp.task?.executionStatus, 'unavailable_on_web');
    assert.match(unknownApp.replyText, /Zomato/i);
    passed += 1;
  }

  // Test 19: Sensitive-action confirmation (confirm vs cancel, never claiming WhatsApp sent)
  {
    const draft = parseNaturalCommand(
      'Send a WhatsApp message to Rahul saying Reach safely',
      'en'
    );
    assert.equal(draft.task?.executionStatus, 'awaiting_confirmation');
    assert.equal(draft.task?.confirmationRequired, true);

    const confirmed = advanceTaskConversation(draft.task!, 'Yes, continue', 'en');
    assert.equal(confirmed.task.executionStatus, 'unavailable_on_web');
    assert.match(confirmed.replyText, /cannot send WhatsApp messages directly/i);

    const cancelled = advanceTaskConversation(draft.task!, 'Cancel', 'en');
    assert.equal(cancelled.task.executionStatus, 'cancelled');
    passed += 1;
  }

  // Test 20: Desktop browser capability detection
  {
    const desktopCaps = detectPlatformCapabilities({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
      platform: 'Win32',
      isSecureContext: true,
      hasSpeechRecognition: true,
      hasSpeechSynthesis: true,
      hasGeolocation: true,
    });
    assert.equal(desktopCaps.platform, 'desktop');
    assert.equal(desktopCaps.browser, 'chrome');
    assert.equal(desktopCaps.isMobile, false);
    assert.equal(desktopCaps.canControlExternalApps, false);
    assert.equal(desktopCaps.canReadExternalScreens, false);
    assert.equal(desktopCaps.canSendMessagesDirectly, false);
    passed += 1;
  }

  // Test 21: Android mobile browser capability detection & mic permission query
  {
    const androidCaps = detectPlatformCapabilities({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      isSecureContext: true,
      hasSpeechRecognition: true,
      hasSpeechSynthesis: true,
      hasGeolocation: true,
    });
    assert.equal(androidCaps.platform, 'android');
    assert.equal(androidCaps.browser, 'chrome');
    assert.equal(androidCaps.isMobile, true);
    const perm = await queryMicrophonePermission({
      hasSpeechRecognition: true,
      permissionsQuery: async () => ({ state: 'granted' }),
    });
    assert.equal(perm, 'granted');
    passed += 1;
  }

  // Test 22: iOS Safari capability detection & permission query fallback
  {
    const iosCaps = detectPlatformCapabilities({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      isSecureContext: true,
      hasSpeechRecognition: true,
      hasSpeechSynthesis: true,
      hasGeolocation: true,
    });
    assert.equal(iosCaps.platform, 'ios');
    assert.equal(iosCaps.browser, 'safari');
    assert.equal(iosCaps.isMobile, true);
    const fallbackPerm = await queryMicrophonePermission({
      hasSpeechRecognition: true,
      permissionsQuery: async () => {
        throw new TypeError('microphone not supported in Permissions API');
      },
    });
    assert.equal(fallbackPerm, 'prompt');
    passed += 1;
  }

  // Test 23: Unsupported speech recognition detection + text fallback continuity
  {
    const noSttCaps = detectPlatformCapabilities({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      platform: 'Linux x86_64',
      hasSpeechRecognition: false,
      hasSpeechSynthesis: true,
      hasGeolocation: true,
    });
    assert.equal(noSttCaps.browser, 'firefox');
    assert.equal(noSttCaps.speechRecognitionSupported, false);
    assert.equal(noSttCaps.microphonePermission, 'unsupported');
    const perm = await queryMicrophonePermission({ hasSpeechRecognition: false });
    assert.equal(perm, 'unsupported');
    passed += 1;
  }

  // Test 24: YouTube browser navigation opens official website after confirmation
  {
    const desktopCaps = detectPlatformCapabilities({
      userAgent: 'Mozilla/5.0 Chrome/126.0',
      platform: 'Win32',
      hasSpeechRecognition: true,
      hasSpeechSynthesis: true,
      hasGeolocation: true,
    });
    const parsed = parseNaturalCommand('Open YouTube.', 'en');
    const prepared = prepareTaskForPlatform(parsed.task!, desktopCaps, 'en');
    assert.equal(prepared.task.executionStatus, 'awaiting_confirmation');
    assert.equal(prepared.task.confirmationRequired, true);
    assert.equal(prepared.task.externalUrl, 'https://www.youtube.com');

    const openedUrls: string[] = [];
    const adapter: PlatformExecutionAdapter = {
      openExternalUrl: (url) => {
        openedUrls.push(url);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    };
    const executed = await executeConfirmedTask(prepared.task, desktopCaps, 'en', adapter);
    assert.equal(executed.task.executionStatus, 'opened_externally');
    assert.deepEqual(openedUrls, ['https://www.youtube.com']);
    assert.match(executed.replyText, /official YouTube website/i);
    assert.match(executed.replyText, /not a native mobile app/i);
    passed += 1;
  }

  // Test 25: WhatsApp Web (desktop) vs mobile URL handling
  {
    const desktopCaps = detectPlatformCapabilities({
      userAgent: 'Mozilla/5.0 Chrome/126.0',
      platform: 'Win32',
    });
    const androidCaps = detectPlatformCapabilities({
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile',
      platform: 'Linux',
    });
    const parsed = parseNaturalCommand('Open WhatsApp', 'en');
    const desktopPrep = prepareTaskForPlatform(parsed.task!, desktopCaps, 'en');
    const androidPrep = prepareTaskForPlatform(parsed.task!, androidCaps, 'en');
    assert.equal(desktopPrep.task.externalUrl, 'https://web.whatsapp.com');
    assert.equal(androidPrep.task.externalUrl, 'https://wa.me/');

    const opened: string[] = [];
    const executed = await executeConfirmedTask(desktopPrep.task, desktopCaps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(executed.task.executionStatus, 'opened_externally');
    assert.deepEqual(opened, ['https://web.whatsapp.com']);
    passed += 1;
  }

  // Test 26: Open Google official website after confirmation
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'MacIntel' });
    const parsed = parseNaturalCommand('Open Google.', 'en');
    assert.equal(parsed.task?.application, 'Google');
    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en');
    assert.equal(prepared.task.executionStatus, 'awaiting_confirmation');
    assert.equal(prepared.task.externalUrl, 'https://www.google.com');
    const opened: string[] = [];
    const executed = await executeConfirmedTask(prepared.task, caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(executed.task.executionStatus, 'opened_externally');
    assert.deepEqual(opened, ['https://www.google.com']);
    passed += 1;
  }

  // Test 27: Nearby hospital search with granted geolocation permission
  {
    const caps = detectPlatformCapabilities({
      userAgent: 'Chrome/126.0',
      platform: 'Win32',
      hasGeolocation: true,
    });
    const parsed = parseNaturalCommand('Search for nearby hospitals.', 'en');
    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en');
    assert.equal(prepared.task.requiresLocation, true);
    assert.equal(prepared.task.executionStatus, 'awaiting_confirmation');

    const opened: string[] = [];
    const executed = await executeConfirmedTask(prepared.task, caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ latitude: 12.2958, longitude: 76.6394 }),
    });
    assert.equal(executed.task.executionStatus, 'opened_externally');
    assert.equal(executed.task.locationStatus, 'granted');
    assert.equal(opened.length, 1);
    assert.match(opened[0], /12\.29580/);
    assert.match(opened[0], /76\.63940/);
    passed += 1;
  }

  // Test 28: Nearby hospital search when geolocation is denied (never invents location)
  {
    const caps = detectPlatformCapabilities({
      userAgent: 'Chrome/126.0',
      platform: 'Win32',
      hasGeolocation: true,
    });
    const parsed = parseNaturalCommand('Search for nearby hospitals.', 'en');
    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en');

    const opened: string[] = [];
    const executed = await executeConfirmedTask(prepared.task, caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'denied' }),
    });
    assert.equal(executed.task.executionStatus, 'requires_permission');
    assert.equal(executed.task.locationStatus, 'denied');
    assert.equal(opened.length, 0);
    assert.match(executed.replyText, /city or area/i);
    assert.ok(executed.task.externalUrl?.includes('google.com/maps/search'));
    passed += 1;
  }

  // Test 29: Nearby hospital search when geolocation API is unavailable
  {
    const caps = detectPlatformCapabilities({
      userAgent: 'Chrome/126.0',
      platform: 'Win32',
      hasGeolocation: false,
    });
    const parsed = parseNaturalCommand('Search for nearby hospitals.', 'en');
    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en');
    const executed = await executeConfirmedTask(prepared.task, caps, 'en', {
      openExternalUrl: () => true,
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(executed.task.executionStatus, 'requires_permission');
    assert.equal(executed.task.locationStatus, 'unavailable');
    assert.match(executed.replyText, /unavailable/i);
    passed += 1;
  }

  // Test 30: "Prepare a WhatsApp message saying I will reach home by 6." asks missing recipient
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const step1 = parseNaturalCommand(
      'Prepare a WhatsApp message saying I will reach home by 6.',
      'en'
    );
    assert.equal(step1.matched, true);
    assert.equal(step1.task?.intent, 'messaging');
    assert.equal(step1.task?.application, 'WhatsApp');
    assert.equal(step1.task?.messageContent, 'I will reach home by 6.');
    assert.deepEqual(step1.task?.missingParameters, ['recipient']);
    assert.equal(step1.task?.executionStatus, 'needs_info');
    assert.equal(step1.replyText, 'Who would you like to message?');

    const step2 = advanceTaskConversation(step1.task!, 'My daughter', 'en');
    assert.equal(step2.task.target, 'My daughter');
    assert.equal(step2.task.executionStatus, 'awaiting_confirmation');
    const prepared = prepareTaskForPlatform(step2.task, caps, 'en');
    assert.ok(
      prepared.task.externalUrl?.startsWith(
        'https://wa.me/?text=I%20will%20reach%20home%20by%206.'
      )
    );
    passed += 1;
  }

  // Test 31: Confirming WhatsApp draft opens wa.me link without claiming message was sent
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const draft = parseNaturalCommand(
      'Prepare a WhatsApp message to My daughter saying I will reach home by 6.',
      'en'
    );
    const prepared = prepareTaskForPlatform(draft.task!, caps, 'en');
    assert.equal(prepared.task.executionStatus, 'awaiting_confirmation');

    const opened: string[] = [];
    const executed = await executeConfirmedTask(prepared.task, caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(executed.task.executionStatus, 'opened_externally');
    assert.equal(opened.length, 1);
    assert.match(opened[0], /^https:\/\/wa\.me\/\?text=/);
    assert.match(executed.replyText, /has not sent this message/i);
    assert.match(executed.replyText, /press Send yourself/i);
    passed += 1;
  }

  // Test 32: Confirmation required before external navigation or geolocation occurs
  {
    const caps = detectPlatformCapabilities({
      userAgent: 'Chrome/126.0',
      platform: 'Win32',
      hasGeolocation: true,
    });
    let externalCalls = 0;
    let geoCalls = 0;

    const yt = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      caps,
      'en'
    );
    const search = prepareTaskForPlatform(
      parseNaturalCommand('Search for nearby hospitals.', 'en').task!,
      caps,
      'en'
    );
    const msg = prepareTaskForPlatform(
      parseNaturalCommand('Send a WhatsApp message to Rahul saying Hello', 'en').task!,
      caps,
      'en'
    );

    assert.equal(yt.task.executionStatus, 'awaiting_confirmation');
    assert.equal(search.task.executionStatus, 'awaiting_confirmation');
    assert.equal(msg.task.executionStatus, 'awaiting_confirmation');
    assert.equal(externalCalls, 0);
    assert.equal(geoCalls, 0);

    // Explicitly check cancellation before any external call
    const cancelled = advanceTaskConversation(yt.task, 'No, cancel', 'en');
    assert.equal(cancelled.task.executionStatus, 'cancelled');
    assert.equal(externalCalls, 0);
    assert.equal(geoCalls, 0);
    passed += 1;
  }

  // Test 33: Unsupported native device apps & unknown apps report honest limits
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const cam = prepareTaskForPlatform(
      parseNaturalCommand('Open Camera', 'en').task!,
      caps,
      'en'
    );
    assert.equal(cam.task.executionStatus, 'unavailable_on_web');
    assert.equal(cam.task.externalUrl, null);
    assert.match(cam.replyOverride || '', /device-level feature/i);

    const zomato = prepareTaskForPlatform(
      parseNaturalCommand('Open Zomato', 'en').task!,
      caps,
      'en'
    );
    assert.equal(zomato.task.executionStatus, 'unavailable_on_web');
    assert.ok(zomato.task.externalUrl?.includes('google.com/search?q=Zomato'));
    passed += 1;
  }

  // Test 34: External navigation failure & in-app application/missing-field reading
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const yt = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      caps,
      'en'
    );
    const failedExec = await executeConfirmedTask(yt.task, caps, 'en', {
      openExternalUrl: () => false,
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(failedExec.task.executionStatus, 'failed');
    assert.equal(failedExec.task.externalUrl, 'https://www.youtube.com');
    assert.match(failedExec.replyText, /prevented the tab from opening/i);

    const partialData = {
      ...EMPTY_APPLICATION_DATA,
      fullName: 'Lakshmi Devi',
      age: '68',
    };
    const readCmd = parseNaturalCommand('Read my application.', 'en');
    assert.equal(readCmd.webAction?.type, 'read_application');
    const readout = buildApplicationReadout(partialData, 'en');
    assert.match(readout, /2 of 9 details completed/i);
    assert.match(readout, /Lakshmi Devi/);

    const missingCmd = parseNaturalCommand('Explain missing fields.', 'en');
    assert.equal(missingCmd.webAction?.type, 'explain_missing_fields');
    const missingText = buildMissingFieldsExplanation(partialData, 'en');
    assert.match(missingText, /7 missing fields/i);
    assert.match(missingText, /Mobile Number/);
    passed += 1;
  }

  // Test 35: New conversation starts in general mode without welfare or name prompts
  {
    const enGreeting = TRANSLATIONS.en.assistant.initialGreeting;
    assert.ok(!/welfare|senior citizen application|applicant|full name/i.test(enGreeting));
    assert.match(enGreeting, /search for something|open a website|prepare a message|help you with a form/i);
    assert.equal(TRANSLATIONS.en.welcome.quickCapabilities.length, 5);
    assert.equal(TRANSLATIONS.en.assistant.generalExamples.length, 5);
    passed += 1;
  }

  // Test 36: Default greeting is general-purpose across English, Hindi, and Kannada
  {
    assert.equal(
      TRANSLATIONS.en.assistant.initialGreeting,
      "Hello! I'm Sahaaya. How can I help you today? You can ask me to search for something, open a website, prepare a message, or help you with a form."
    );
    assert.equal(
      TRANSLATIONS.hi.assistant.initialGreeting,
      'नमस्ते! मैं सहाय हूँ। आज मैं आपकी किस तरह मदद कर सकती हूँ? आप मुझसे कुछ खोजने, वेबसाइट खोलने, संदेश तैयार करने या फॉर्म भरने में मदद मांग सकते हैं।'
    );
    assert.equal(
      TRANSLATIONS.kn.assistant.initialGreeting,
      'ನಮಸ್ಕಾರ! ನಾನು ಸಹಾಯಾ. ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನೀವು ಮಾಹಿತಿ ಹುಡುಕಲು, ವೆಬ್ಸೈಟ್ ತೆರೆಯಲು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ನನ್ನನ್ನು ಕೇಳಬಹುದು.'
    );
    passed += 1;
  }

  // Test 37: Website opening commands ("Open YouTube", "Open Google", "Open Google Maps")
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytParsed = parseNaturalCommand('Open YouTube.', 'en');
    assert.equal(ytParsed.matched, true);
    assert.equal(ytParsed.task?.intent, 'app_launch');
    assert.equal(ytParsed.task?.application, 'YouTube');
    const ytPrep = prepareTaskForPlatform(ytParsed.task!, caps, 'en');
    assert.equal(ytPrep.task.executionStatus, 'awaiting_confirmation');

    const opened: string[] = [];
    const ytExec = await executeConfirmedTask(ytPrep.task, caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(ytExec.task.executionStatus, 'opened_externally');
    assert.equal(opened[0], 'https://www.youtube.com');

    const googlePrep = prepareTaskForPlatform(
      parseNaturalCommand('Open Google.', 'en').task!,
      caps,
      'en'
    );
    assert.equal(googlePrep.task.executionStatus, 'awaiting_confirmation');
    assert.equal(googlePrep.task.externalUrl, 'https://www.google.com');

    const mapsPrep = prepareTaskForPlatform(
      parseNaturalCommand('Open Google Maps.', 'en').task!,
      caps,
      'en'
    );
    assert.equal(mapsPrep.task.executionStatus, 'awaiting_confirmation');
    assert.equal(mapsPrep.task.externalUrl, 'https://maps.google.com');
    passed += 1;
  }

  // Test 38: Search commands ("Search for nearby hospitals", "Find a pharmacy", "Search for information about pensions", "I want to search for something")
  {
    const hospitals = parseNaturalCommand('Search for nearby hospitals.', 'en');
    assert.equal(hospitals.matched, true);
    assert.equal(hospitals.task?.intent, 'search');
    assert.equal(hospitals.task?.executionStatus, 'awaiting_confirmation');
    assert.match(hospitals.task?.target || '', /nearby hospitals/i);

    const pharmacy = parseNaturalCommand('Find a pharmacy.', 'en');
    assert.equal(pharmacy.matched, true);
    assert.equal(pharmacy.task?.intent, 'search');
    assert.equal(pharmacy.task?.executionStatus, 'awaiting_confirmation');
    assert.match(pharmacy.task?.target || '', /pharmacy/i);

    const pensions = parseNaturalCommand('Search for information about pensions.', 'en');
    assert.equal(pensions.matched, true);
    assert.equal(pensions.task?.intent, 'search');
    assert.equal(pensions.task?.executionStatus, 'awaiting_confirmation');
    assert.match(pensions.task?.target || '', /pensions/i);

    const vague = parseNaturalCommand('I want to search for something.', 'en');
    assert.equal(vague.matched, true);
    assert.equal(vague.task?.intent, 'search');
    assert.equal(vague.task?.executionStatus, 'needs_info');
    assert.equal(vague.task?.target, null);
    assert.match(vague.replyText, /what would you like me to search for/i);
    passed += 1;
  }

  // Test 39: Messaging preparation commands without premature send claims
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const bare = parseNaturalCommand('Prepare a WhatsApp message', 'en');
    assert.equal(bare.matched, true);
    assert.equal(bare.task?.intent, 'messaging');
    assert.equal(bare.task?.executionStatus, 'needs_info');
    assert.match(bare.replyText, /who would you like to message/i);

    const forDaughter = parseNaturalCommand('Prepare a WhatsApp message for my daughter.', 'en');
    assert.equal(forDaughter.matched, true);
    assert.equal(forDaughter.task?.intent, 'messaging');
    assert.equal(forDaughter.task?.target, 'my daughter');
    assert.equal(forDaughter.task?.executionStatus, 'needs_info');
    assert.match(forDaughter.replyText, /what would you like the message to say/i);

    const writeBody = parseNaturalCommand(
      'Help me write a message saying I will reach home by 6.',
      'en'
    );
    assert.equal(writeBody.matched, true);
    assert.equal(writeBody.task?.intent, 'messaging');
    assert.equal(writeBody.task?.target, null);
    assert.match(writeBody.task?.messageContent || '', /reach home by 6/i);
    assert.equal(writeBody.task?.executionStatus, 'needs_info');

    const withRecipient = advanceTaskConversation(writeBody.task!, 'My son', 'en');
    assert.equal(withRecipient.task.executionStatus, 'awaiting_confirmation');
    const prepped = prepareTaskForPlatform(withRecipient.task, caps, 'en');
    const exec = await executeConfirmedTask(prepped.task, caps, 'en', {
      openExternalUrl: () => true,
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(exec.task.executionStatus, 'opened_externally');
    assert.match(exec.replyText, /has not sent this message/i);
    passed += 1;
  }

  // Test 40: General conversation intents ("What can you help me with?", "Hello, how are you?", "Who are you?", "I need some help", "I don't know how to use this phone")
  {
    const prompts = [
      'Hello, how are you?',
      'Who are you?',
      'What can you help me with?',
      'I need some help.',
      "I don't know how to use this phone.",
    ];
    for (const p of prompts) {
      const res = parseNaturalCommand(p, 'en');
      assert.equal(res.matched, true, `Expected match for: ${p}`);
      assert.equal(res.task?.intent, 'general_conversation', `Expected general_conversation for: ${p}`);
      assert.equal(res.task?.executionStatus, 'executed_in_web');
      assert.ok(res.replyText.length > 20);
      assert.ok(!/full name/i.test(res.replyText));
    }
    passed += 1;
  }

  // Test 41: Explicit welfare application triggers enter welfare workflow cleanly
  {
    const triggers = [
      'Help me fill out a welfare application.',
      'I want to apply for a government scheme.',
      'Help me complete this form.',
      'Help me fill out a form.',
    ];
    for (const phrase of triggers) {
      const res = parseNaturalCommand(phrase, 'en');
      assert.equal(res.matched, true, `Expected welfare match for: ${phrase}`);
      assert.equal(res.task?.intent, 'application_task');
      assert.equal(res.webAction?.type, 'start_application');
    }
    passed += 1;
  }

  // Test 42: Screen assistance and unmatched utterances never trigger welfare or name capture
  {
    const explainPage = parseNaturalCommand('Explain what is on this page.', 'en');
    assert.equal(explainPage.matched, true);
    assert.equal(explainPage.task?.intent, 'screen_assistance');
    assert.equal(explainPage.webAction?.type, 'explain_page');

    const explainButtons = parseNaturalCommand('Help me understand these buttons.', 'en');
    assert.equal(explainButtons.matched, true);
    assert.equal(explainButtons.task?.intent, 'screen_assistance');
    assert.equal(explainButtons.webAction?.type, 'explain_controls');

    const unmatched = parseNaturalCommand('Can you play classical bhajans from my radio', 'en');
    assert.equal(unmatched.matched, false);
    const fallback = buildGeneralFallbackResponse('Can you play classical bhajans from my radio', 'en');
    assert.ok(!/I heard your name as/i.test(fallback));
    assert.match(fallback, /open websites|search for nearby|prepare a WhatsApp message/i);
    passed += 1;
  }

  // Test 43: Name confirmation & critical field confirmation remain intact in welfare mode
  {
    const nameOutcome = parseVoiceInput('My name is Ramesh Kulkarni', 'fullName', EMPTY_APPLICATION_DATA);
    assert.equal(nameOutcome.type, 'field_updated');
    if (nameOutcome.type === 'field_updated') {
      assert.equal(nameOutcome.field, 'fullName');
      assert.equal(nameOutcome.value, 'Ramesh Kulkarni');
    }
    assert.equal(requiresExplicitConfirmation('fullName'), true);
    assert.equal(parseConfirmationReply('Yes, correct'), 'confirm');
    const spelled = parseSpelledInput('R A M E S H', []);
    assert.equal(spelled.action, 'update');
    if (spelled.action === 'update') {
      assert.equal(spelled.constructedName, 'Ramesh');
    }

    const mobileOutcome = parseVoiceInput('9876543210', 'mobileNumber', EMPTY_APPLICATION_DATA);
    assert.equal(mobileOutcome.type, 'field_updated');
    assert.equal(requiresExplicitConfirmation('mobileNumber'), true);
    assert.equal(requiresExplicitConfirmation('dateOfBirth'), true);
    assert.equal(requiresExplicitConfirmation('annualIncome'), true);
    passed += 1;
  }

  // Test 44: Zero paid APIs / zero LLM network calls required across core routing and execution
  {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    (globalThis as any).fetch = () => {
      fetchCalled = true;
      throw new Error('Network fetch must not be called for local Sahaaya NLU');
    };
    try {
      assert.equal(process.env.GEMINI_API_KEY, undefined);
      const r1 = parseNaturalCommand('What can you help me with?', 'en');
      const r2 = parseNaturalCommand('Search for nearby hospitals.', 'en');
      const r3 = parseNaturalCommand('Open YouTube.', 'hi');
      const r4 = buildGeneralFallbackResponse('Weather tomorrow', 'kn');
      assert.equal(r1.matched, true);
      assert.equal(r2.matched, true);
      assert.equal(r3.matched, true);
      assert.ok(r4.length > 10);
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
    passed += 1;
  }

  // Test 45: WhatsApp recipient extraction ("Send Son a WhatsApp message telling him to get my medicine.")
  {
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.intent, 'messaging');
    assert.equal(parsed.task?.application, 'WhatsApp');
    assert.equal(parsed.task?.target, 'Son');
    passed += 1;
  }

  // Test 46: WhatsApp message-body extraction
  {
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    assert.equal(parsed.task?.messageContent, 'Get my medicine.');
    assert.equal(parsed.task?.executionStatus, 'awaiting_confirmation');
    passed += 1;
  }

  // Test 47: WhatsApp confirmation prompt displays Recipient, Message, and asks to proceed
  {
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    const prompt = buildDemoConfirmationPrompt(parsed.task!, 'interactive_demo', 'en');
    assert.ok(prompt);
    assert.match(prompt!, /Recipient:\s*Son/);
    assert.match(prompt!, /Message:\s*"Get my medicine\."/);
    assert.match(prompt!, /Your WhatsApp message is ready\. Would you like me to proceed\?/);
    passed += 1;
  }

  // Test 48: Simulated WhatsApp message execution in Interactive Demo Mode
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    const res = await runDemoExecution(parsed.task!, 'interactive_demo', caps, 'en');
    assert.equal(res.session.appId, 'whatsapp');
    assert.equal(res.session.status, 'simulated_completion');
    assert.equal(res.task.executionStatus, 'simulated_completed');
    assert.equal(res.session.payload.whatsAppState?.sentInDemo, true);
    assert.equal(res.session.payload.whatsAppState?.messages.length, 1);
    assert.equal(res.session.payload.whatsAppState?.messages[0].text, 'Get my medicine.');
    passed += 1;
  }

  // Test 49: No actual WhatsApp message sent in Demo Mode (zero external navigation & honest notice)
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    let externalOpens = 0;
    const res = await runDemoExecution(parsed.task!, 'interactive_demo', caps, 'en', {
      openExternalUrl: () => {
        externalOpens += 1;
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(externalOpens, 0);
    assert.match(res.replyText, /Your message has been sent in the Sahaaya demonstration/i);
    assert.match(res.replyText, /no real WhatsApp message was sent/i);
    assert.match(res.session.honestNotice, /SIMULATED — DEMO MODE/i);
    passed += 1;
  }

  // Test 50: YouTube search and video demonstration ("Play Hanuman Chalisa", "Play relaxing music", "Search for cooking videos")
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const hanuman = parseNaturalCommand('Play Hanuman Chalisa.', 'en');
    assert.equal(hanuman.matched, true);
    assert.equal(hanuman.task?.application, 'YouTube');
    assert.equal(hanuman.task?.action, 'play_video');
    assert.equal(hanuman.task?.target, 'Hanuman Chalisa');

    const res = await runDemoExecution(hanuman.task!, 'interactive_demo', caps, 'en');
    assert.equal(res.session.appId, 'youtube');
    assert.equal(res.session.status, 'simulated_completion');
    assert.equal(res.session.payload.youTubeState?.isPlaying, true);
    assert.equal(res.session.payload.youTubeState?.isSimulatedPreview, true);
    assert.match(
      res.session.payload.youTubeState?.watchUrl || '',
      /^https:\/\/www\.youtube\.com\/results\?search_query=Hanuman%20Chalisa/
    );

    const relaxing = parseNaturalCommand('Play relaxing music.', 'en');
    assert.equal(relaxing.task?.target, 'relaxing music');

    const cooking = parseNaturalCommand('Search for cooking videos.', 'en');
    assert.equal(cooking.task?.intent, 'search');
    assert.equal(cooking.task?.application, 'YouTube');
    assert.equal(cooking.task?.target, 'cooking videos');
    passed += 1;
  }

  // Test 51: Google Chrome search demonstration
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const chromeOpen = parseNaturalCommand('Open Google Chrome.', 'en');
    assert.equal(chromeOpen.matched, true);
    assert.equal(chromeOpen.task?.application, 'Chrome');
    assert.equal(resolveDemoAppId(chromeOpen.task!), 'chrome');

    const schemeSearch = parseNaturalCommand(
      'Search for information about government schemes.',
      'en'
    );
    const res = await runDemoExecution(schemeSearch.task!, 'interactive_demo', caps, 'en');
    assert.equal(res.session.appId, 'chrome');
    assert.equal(res.session.status, 'simulated_completion');
    assert.ok((res.session.payload.chromeState?.results.length || 0) >= 2);
    assert.equal(res.session.payload.chromeState?.results[0].isExample, true);
    passed += 1;
  }

  // Test 52: Google Maps demonstration ("Open Google Maps", "Show directions to Apollo Hospital", "Find a pharmacy near me")
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const dirs = parseNaturalCommand('Show directions to Apollo Hospital.', 'en');
    assert.equal(dirs.matched, true);
    assert.equal(dirs.task?.application, 'Google Maps');
    assert.equal(dirs.task?.action, 'directions');
    assert.equal(dirs.task?.target, 'Apollo Hospital');
    assert.equal(dirs.task?.requiresLocation, true);

    const pharmacy = parseNaturalCommand('Find a pharmacy near me.', 'en');
    assert.equal(resolveDemoAppId(pharmacy.task!), 'maps');
    const res = await runDemoExecution(pharmacy.task!, 'interactive_demo', caps, 'en');
    assert.equal(res.session.appId, 'maps');
    assert.equal(res.session.status, 'simulated_completion');
    assert.ok((res.session.payload.mapsState?.places.length || 0) >= 1);
    assert.equal(res.session.payload.mapsState?.places[0].isExample, true);
    passed += 1;
  }

  // Test 53: Location permission handling in Demo Mode (never invents real user coordinates)
  {
    const caps = detectPlatformCapabilities({
      userAgent: 'Chrome/126.0',
      platform: 'Win32',
      hasGeolocation: true,
    });
    const parsed = parseNaturalCommand('Find nearby hospitals.', 'en');
    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en');

    // Denied -> example demo area clearly marked isRealLocation: false
    const deniedRes = await runDemoExecution(
      prepared.task,
      'interactive_demo',
      caps,
      'en',
      {
        openExternalUrl: () => true,
        getCurrentPosition: async () => ({ error: 'denied' }),
      }
    );
    assert.equal(deniedRes.session.payload.mapsState?.isRealLocation, false);
    assert.equal(deniedRes.session.payload.mapsState?.coordinates, null);

    // Granted -> uses permitted coordinates and marks isRealLocation: true
    const grantedRes = await runDemoExecution(
      prepared.task,
      'interactive_demo',
      caps,
      'en',
      {
        openExternalUrl: () => true,
        getCurrentPosition: async () => ({ latitude: 12.9716, longitude: 77.5946 }),
      }
    );
    assert.equal(grantedRes.session.payload.mapsState?.isRealLocation, true);
    assert.equal(grantedRes.session.payload.mapsState?.coordinates?.latitude, 12.9716);
    passed += 1;
  }

  // Test 54: Welfare form visual population tracking
  {
    const triggers = [
      'Fill out this application.',
      'Help me enter my details.',
      'Complete the form with my information.',
    ];
    for (const phrase of triggers) {
      const cmd = parseNaturalCommand(phrase, 'en');
      assert.equal(cmd.matched, true, `Expected welfare match for: ${phrase}`);
      assert.equal(cmd.webAction?.type, 'start_application');
    }

    const sampleData = {
      ...EMPTY_APPLICATION_DATA,
      fullName: 'Sita Devi',
      age: '68',
    };
    const task = parseNaturalCommand('Help me fill out a welfare application.', 'en').task!;
    const formSession = createDemoSessionForTask(task, 'interactive_demo', 'en', {
      applicationData: sampleData,
      activeField: 'dateOfBirth',
    });
    assert.equal(formSession.appId, 'welfare_form');
    assert.equal(formSession.payload.formState?.filledCount, 2);
    assert.equal(formSession.payload.formState?.totalCount, 9);
    assert.equal(formSession.payload.formState?.activeField, 'dateOfBirth');
    passed += 1;
  }

  // Test 55: Simulated welfare form submission disclaimer across languages
  {
    assert.equal(
      TRANSLATIONS.en.assistant.demoMode.demoSubmissionBanner,
      'DEMO SUBMISSION — No real application was submitted.'
    );
    assert.equal(
      TRANSLATIONS.hi.assistant.demoMode.demoSubmissionBanner,
      'DEMO SUBMISSION — No real application was submitted.'
    );
    assert.equal(
      TRANSLATIONS.kn.assistant.demoMode.demoSubmissionBanner,
      'DEMO SUBMISSION — No real application was submitted.'
    );
    passed += 1;
  }

  // Test 56: Native Camera simulation in Interactive Demo Mode
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const cam = parseNaturalCommand('Open Camera.', 'en');
    assert.equal(cam.matched, true);
    assert.equal(cam.task?.application, 'Camera');
    const res = await runDemoExecution(cam.task!, 'interactive_demo', caps, 'en');
    assert.equal(res.session.appId, 'camera');
    assert.equal(res.session.isSimulated, true);
    assert.equal(res.session.status, 'simulated_completion');
    assert.equal(res.session.payload.deviceAppState?.appId, 'camera');
    passed += 1;
  }

  // Test 57: Native Settings & Calculator simulation in Interactive Demo Mode
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const settings = parseNaturalCommand('Open Settings.', 'en');
    const resSettings = await runDemoExecution(
      settings.task!,
      'interactive_demo',
      caps,
      'en'
    );
    assert.equal(resSettings.session.appId, 'settings');
    assert.equal(resSettings.session.isSimulated, true);
    assert.equal(resSettings.session.status, 'simulated_completion');
    assert.ok((resSettings.session.payload.deviceAppState?.items.length || 0) >= 3);

    const calc = parseNaturalCommand('Open Calculator.', 'en');
    assert.equal(calc.matched, true);
    assert.equal(calc.task?.application, 'Calculator');
    const resCalc = await runDemoExecution(calc.task!, 'interactive_demo', caps, 'en');
    assert.equal(resCalc.session.appId, 'calculator');
    assert.equal(resCalc.session.status, 'simulated_completion');
    passed += 1;
  }

  // Test 58: Real browser execution via runDemoExecution in real_browser mode
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const yt = prepareTaskForPlatform(
      parseNaturalCommand('Play relaxing music.', 'en').task!,
      caps,
      'en'
    );
    const opened: string[] = [];
    const realRes = await runDemoExecution(yt.task, 'real_browser', caps, 'en', {
      openExternalUrl: (u) => {
        opened.push(u);
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(realRes.session.isSimulated, false);
    assert.equal(realRes.session.status, 'completed');
    assert.equal(realRes.task.executionStatus, 'opened_externally');
    assert.equal(opened.length, 1);
    assert.match(opened[0], /^https:\/\/www\.youtube\.com\/results\?search_query=/);
    passed += 1;
  }

  // Test 59: Demo Mode switching changes behavior cleanly for the same AssistantTask
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const msgTask = prepareTaskForPlatform(
      parseNaturalCommand(
        'Send Son a WhatsApp message telling him to get my medicine.',
        'en'
      ).task!,
      caps,
      'en'
    ).task;

    let realOpens = 0;
    const demoExec = await runDemoExecution(msgTask, 'interactive_demo', caps, 'en', {
      openExternalUrl: () => {
        realOpens += 1;
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(demoExec.session.isSimulated, true);
    assert.equal(realOpens, 0);

    const browserExec = await runDemoExecution(msgTask, 'real_browser', caps, 'en', {
      openExternalUrl: () => {
        realOpens += 1;
        return true;
      },
      getCurrentPosition: async () => ({ error: 'unavailable' }),
    });
    assert.equal(browserExec.session.isSimulated, false);
    assert.equal(browserExec.session.status, 'completed');
    assert.equal(realOpens, 1);
    passed += 1;
  }

  // Test 60: Cancellation during interactive demonstration
  {
    const parsed = parseNaturalCommand('Play Hanuman Chalisa.', 'en');
    const session = createDemoSessionForTask(parsed.task!, 'interactive_demo', 'en');
    assert.equal(session.status, 'waiting_for_confirmation');

    const preparing = advanceDemoAnimationStage(session, 'preparing_application', 'en');
    assert.equal(preparing.status, 'preparing_application');

    const cancelled = cancelDemoSession(preparing, 'en');
    assert.equal(cancelled.session.status, 'cancelled');
    assert.ok(cancelled.session.steps.some((s) => s.status === 'cancelled'));
    assert.match(cancelled.replyText, /cancelled/i);
    passed += 1;
  }

  // Test 61: Honest reporting of simulated actions across sessions
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const searchTask = parseNaturalCommand('Search for nearby hospitals.', 'en').task!;
    const res = await runDemoExecution(searchTask, 'interactive_demo', caps, 'en');
    assert.equal(res.session.isSimulated, true);
    assert.equal(res.session.status, 'simulated_completion');
    assert.equal(res.task.executionStatus, 'simulated_completed');
    assert.match(res.session.honestNotice, /SIMULATED — DEMO MODE/i);
    passed += 1;
  }

  // Test 62: General-purpose command routing ("Read this page", "Explain these buttons", "Open an application")
  {
    const readPage = parseNaturalCommand('Read this page.', 'en');
    assert.equal(readPage.matched, true);
    assert.equal(readPage.webAction?.type, 'read_screen');

    const explainBtns = parseNaturalCommand('Explain these buttons.', 'en');
    assert.equal(explainBtns.matched, true);
    assert.equal(explainBtns.webAction?.type, 'explain_controls');

    const openApp = parseNaturalCommand('Open an application.', 'en');
    assert.equal(openApp.matched, true);
    assert.equal(openApp.task?.intent, 'app_launch');
    assert.equal(openApp.task?.executionStatus, 'needs_info');

    const followUp = advanceTaskConversation(openApp.task!, 'Camera', 'en');
    assert.equal(followUp.task.application, 'Camera');
    assert.equal(followUp.task.executionStatus, 'awaiting_confirmation');
    passed += 1;
  }

  // Test 63: Context-aware natural affirmative confirmation phrases ("Yes, please open", "Do it", "Open it", etc.)
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytPrepared = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytPrepared, 'interactive_demo', 'en');
    assert.equal(ytPrepared.executionStatus, 'awaiting_confirmation');
    assert.equal(ytSession.status, 'waiting_for_confirmation');

    const affirmativePhrases = [
      'Yes',
      'Yes, please',
      'Yes, please open',
      'yes please open',
      'YES, PLEASE OPEN!',
      'Yes, go ahead',
      'Sure',
      'Sure, do it',
      'Okay',
      'Okay, continue',
      'Proceed',
      'Continue',
      'Do it',
      'Please do',
      'Open it',
      "That's right",
      'Correct',
    ];

    for (const phrase of affirmativePhrases) {
      assert.equal(
        classifyPendingConfirmationReply(phrase),
        'confirm',
        `Expected confirm for "${phrase}"`
      );
      const turn = evaluatePendingTaskTurn(
        phrase,
        ytPrepared,
        ytSession,
        'interactive_demo',
        'en'
      );
      assert.equal(turn.handled, true, `Expected handled=true for "${phrase}"`);
      assert.equal(turn.action, 'execute', `Expected execute for "${phrase}"`);
    }

    // Verify advanceTaskConversation also confirms app_launch & search cleanly
    const ytAdv = advanceTaskConversation(ytPrepared, 'Yes, please open', 'en');
    assert.equal(ytAdv.task.executionStatus, 'unavailable_on_web');
    assert.match(ytAdv.replyText, /Confirmed opening YouTube/i);

    const searchTask = prepareTaskForPlatform(
      parseNaturalCommand('Search for nearby hospitals.', 'en').task!,
      caps,
      'en'
    ).task;
    const searchTurn = evaluatePendingTaskTurn(
      'Yes, please open',
      searchTask,
      createDemoSessionForTask(searchTask, 'interactive_demo', 'en'),
      'interactive_demo',
      'en'
    );
    assert.equal(searchTurn.action, 'execute');
    passed += 1;
  }

  // Test 64: Context-aware negative/cancel responses ("No", "No thanks", "Cancel", "Don't do it", "Stop")
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytPrepared = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytPrepared, 'interactive_demo', 'en');

    const negativePhrases = ['No', 'No thanks', 'Cancel', "Don't do it", 'Stop'];
    for (const phrase of negativePhrases) {
      assert.equal(
        classifyPendingConfirmationReply(phrase),
        'cancel',
        `Expected cancel for "${phrase}"`
      );
      const turn = evaluatePendingTaskTurn(
        phrase,
        ytPrepared,
        ytSession,
        'interactive_demo',
        'en'
      );
      assert.equal(turn.handled, true, `Expected handled=true for "${phrase}"`);
      assert.equal(turn.action, 'cancel', `Expected cancel for "${phrase}"`);
      if (turn.action === 'cancel') {
        assert.equal(turn.task?.executionStatus, 'cancelled');
        assert.equal(turn.session?.status, 'cancelled');
        assert.match(turn.replyText, /cancelled/i);
      }
    }
    passed += 1;
  }

  // Test 65: Safety guard — affirmative phrases do NOT execute anything when no confirmation is pending
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const completedRes = await runDemoExecution(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      'interactive_demo',
      caps,
      'en'
    );

    const safetyInputs = ['Yes, please open', 'Open it', 'Do it', 'Sure', 'Proceed'];
    for (const input of safetyInputs) {
      // No active task or session
      const emptyTurn = evaluatePendingTaskTurn(input, null, null, 'interactive_demo', 'en');
      assert.equal(emptyTurn.handled, false);
      assert.equal(emptyTurn.action, 'none');

      // Already completed task/session
      const completedTurn = evaluatePendingTaskTurn(
        input,
        completedRes.task,
        completedRes.session,
        'interactive_demo',
        'en'
      );
      assert.equal(completedTurn.handled, false);
      assert.equal(completedTurn.action, 'none');

      // Cancelled task/session
      const cancelled = cancelDemoSession(completedRes.session, 'en').session;
      const cancelledTurn = evaluatePendingTaskTurn(
        input,
        { ...completedRes.task, executionStatus: 'cancelled' },
        cancelled,
        'interactive_demo',
        'en'
      );
      assert.equal(cancelledTurn.handled, false);
      assert.equal(cancelledTurn.action, 'none');
    }

    // parseNaturalCommand itself must NOT treat "Yes, please open" as an app launch
    const parsedStandalone = parseNaturalCommand('Yes, please open', 'en');
    assert.equal(parsedStandalone.matched, false);
    passed += 1;
  }

  // Test 66: Full confirmation -> execution flow in Interactive Demo & Real Browser modes + demoSession recovery + reprompt
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytPrepared = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytPrepared, 'interactive_demo', 'en');

    // Interactive Demo Mode execution after "Yes, please open"
    const confirmDemoTurn = evaluatePendingTaskTurn(
      'Yes, please open',
      ytPrepared,
      ytSession,
      'interactive_demo',
      'en'
    );
    assert.equal(confirmDemoTurn.action, 'execute');
    if (confirmDemoTurn.action === 'execute') {
      const demoRes = await runDemoExecution(
        confirmDemoTurn.task,
        'interactive_demo',
        caps,
        'en'
      );
      assert.equal(demoRes.session.status, 'simulated_completion');
      assert.equal(demoRes.task.executionStatus, 'simulated_completed');
    }

    // Real Browser Mode execution after "Yes, please open"
    const openedUrls: string[] = [];
    const confirmRealTurn = evaluatePendingTaskTurn(
      'Yes, please open',
      ytPrepared,
      createDemoSessionForTask(ytPrepared, 'real_browser', 'en'),
      'real_browser',
      'en'
    );
    assert.equal(confirmRealTurn.action, 'execute');
    if (confirmRealTurn.action === 'execute') {
      const realRes = await runDemoExecution(
        confirmRealTurn.task,
        'real_browser',
        caps,
        'en',
        {
          openExternalUrl: (url) => {
            openedUrls.push(url);
            return true;
          },
          getCurrentPosition: async () => ({ error: 'unavailable' }),
        }
      );
      assert.equal(realRes.session.status, 'completed');
      assert.equal(realRes.task.executionStatus, 'opened_externally');
      assert.deepEqual(openedUrls, ['https://www.youtube.com']);
    }

    // Pending demoSession alone (even if activeTask is null) still confirms safely
    const sessionOnlyTurn = evaluatePendingTaskTurn(
      'Yes, please open',
      null,
      ytSession,
      'interactive_demo',
      'en'
    );
    assert.equal(sessionOnlyTurn.action, 'execute');

    // Ambiguous answer while awaiting confirmation re-prompts cleanly (never falls back to "not able to perform")
    const ambiguousTurn = evaluatePendingTaskTurn(
      'hmm maybe',
      ytPrepared,
      ytSession,
      'interactive_demo',
      'en'
    );
    assert.equal(ambiguousTurn.handled, true);
    assert.equal(ambiguousTurn.action, 'reprompt');
    if (ambiguousTurn.action === 'reprompt') {
      assert.ok(!/not able to perform that exact request/i.test(ambiguousTurn.replyText));
    }

    // Explicit new command while awaiting confirmation yields cleanly so user can switch tasks
    const newCmdTurn = evaluatePendingTaskTurn(
      'Open Google Maps',
      ytPrepared,
      ytSession,
      'interactive_demo',
      'en'
    );
    assert.equal(newCmdTurn.handled, false);
    passed += 1;
  }

  // Test 67: Compound voice commands ("Open Chrome and search...", "Open YouTube and play...", "Open Maps and find...")
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });

    const chromeCmd = parseNaturalCommand('Open Chrome and search for hospitals near me.', 'en');
    assert.equal(chromeCmd.matched, true);
    assert.equal(chromeCmd.task?.intent, 'search');
    assert.equal(chromeCmd.task?.application, 'Chrome');
    assert.equal(chromeCmd.task?.target, 'hospitals near me');
    const chromePrep = prepareTaskForPlatform(chromeCmd.task!, caps, 'en');
    assert.equal(chromePrep.task.application, 'Chrome');
    assert.equal(resolveDemoAppId(chromePrep.task), 'chrome');

    const ytCmd = parseNaturalCommand('Open YouTube and play Hanuman Chalisa.', 'en');
    assert.equal(ytCmd.matched, true);
    assert.equal(ytCmd.task?.intent, 'app_launch');
    assert.equal(ytCmd.task?.application, 'YouTube');
    assert.equal(ytCmd.task?.target, 'Hanuman Chalisa');
    assert.equal(resolveDemoAppId(ytCmd.task!), 'youtube');

    const mapsCmd = parseNaturalCommand('Open Maps and find a pharmacy nearby.', 'en');
    assert.equal(mapsCmd.matched, true);
    assert.equal(mapsCmd.task?.intent, 'search');
    assert.equal(mapsCmd.task?.application, 'Google Maps');
    assert.match(mapsCmd.task?.target || '', /pharmacy nearby/i);
    assert.equal(resolveDemoAppId(mapsCmd.task!), 'maps');
    passed += 1;
  }

  // Test 68: Multi-stage smartphone simulator timelines & payload progression for Chrome, WhatsApp, YouTube, and Maps
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });

    // Chrome 7-stage timeline
    const chromeTask = prepareTaskForPlatform(
      parseNaturalCommand('Open Chrome and search for hospitals near me.', 'en').task!,
      caps,
      'en'
    ).task;
    const chromeInit = createDemoSessionForTask(chromeTask, 'interactive_demo', 'en');
    const chromeTimeline = getSimulatorTimeline('chrome');
    assert.deepEqual(
      chromeTimeline.map((s) => s.simPhase),
      [
        'home_screen',
        'selecting_app',
        'opening_app',
        'activating_search',
        'typing_input',
        'submitting_search',
        'showing_results',
      ]
    );
    const chromeTyping = advanceDemoSimulatorPhase(
      chromeInit,
      'typing_input',
      'performing_action',
      'en'
    );
    assert.equal(chromeTyping.payload.chromeState?.typedQuery, 'hospitals near me');
    const chromeLoading = advanceDemoSimulatorPhase(
      chromeTyping,
      'submitting_search',
      'performing_action',
      'en'
    );
    assert.equal(chromeLoading.payload.chromeState?.isLoading, true);

    // WhatsApp contact list -> selecting contact -> typing -> pressing send
    const waTask = prepareTaskForPlatform(
      parseNaturalCommand('Send Son a WhatsApp message telling him to get my medicine.', 'en').task!,
      caps,
      'en'
    ).task;
    const waInit = createDemoSessionForTask(waTask, 'interactive_demo', 'en');
    assert.ok((waInit.payload.whatsAppState?.contacts?.length || 0) >= 3);
    const waContactList = advanceDemoSimulatorPhase(
      waInit,
      'contact_list',
      'opening_application',
      'en'
    );
    assert.equal(waContactList.payload.whatsAppState?.selectedContact, null);
    const waSendPress = advanceDemoSimulatorPhase(
      waContactList,
      'pressing_send',
      'performing_action',
      'en'
    );
    assert.equal(waSendPress.payload.whatsAppState?.sendPressed, true);
    assert.equal(waSendPress.payload.whatsAppState?.sentInDemo, false);
    const waDone = await runDemoExecution(waTask, 'interactive_demo', caps, 'en');
    assert.equal(waDone.session.simPhase, 'completed');
    assert.equal(waDone.session.payload.whatsAppState?.sentInDemo, true);
    assert.match(waDone.session.resultSummary, /No real WhatsApp message was sent/i);

    // YouTube results list before player opens
    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube and play Hanuman Chalisa.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytInit = createDemoSessionForTask(ytTask, 'interactive_demo', 'en');
    assert.ok((ytInit.payload.youTubeState?.searchResults?.length || 0) >= 2);
    const ytResultsPhase = advanceDemoSimulatorPhase(
      ytInit,
      'showing_results',
      'performing_action',
      'en'
    );
    assert.equal(ytResultsPhase.payload.youTubeState?.playerOpen, false);
    const ytCompleted = advanceDemoSimulatorPhase(
      ytResultsPhase,
      'completed',
      'simulated_completion',
      'en'
    );
    assert.equal(ytCompleted.payload.youTubeState?.playerOpen, true);
    assert.equal(ytCompleted.payload.youTubeState?.isPlaying, true);

    // Maps location permission check stage
    const mapsTask = prepareTaskForPlatform(
      parseNaturalCommand('Open Maps and find a pharmacy nearby.', 'en').task!,
      caps,
      'en'
    ).task;
    const mapsInit = createDemoSessionForTask(mapsTask, 'interactive_demo', 'en');
    const mapsLocCheck = advanceDemoSimulatorPhase(
      mapsInit,
      'requesting_location',
      'performing_action',
      'en'
    );
    assert.equal(mapsLocCheck.payload.mapsState?.locationPromptVisible, true);
    passed += 1;
  }

  // Test 69: BUG 1 regression — "Can you open a YouTube video that shows the recipe of how to prepare a Chicken curry?"
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const cmdText =
      'Can you open a YouTube video that shows the recipe of how to prepare a Chicken curry?';
    const parsed = parseNaturalCommand(cmdText, 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.intent, 'app_launch');
    assert.equal(parsed.task?.action, 'play_video');
    assert.equal(parsed.task?.target, 'recipe of how to prepare a Chicken curry');
    assert.equal(parsed.task?.rawInstruction, cmdText);
    assert.notEqual(parsed.task?.intent, 'messaging');

    const prepared = prepareTaskForPlatform(parsed.task!, caps, 'en').task;
    assert.equal(resolveDemoAppId(prepared), 'youtube');
    const ytSession = createDemoSessionForTask(prepared, 'interactive_demo', 'en');
    assert.equal(ytSession.appId, 'youtube');
    assert.equal(ytSession.payload.whatsAppState, undefined);
    assert.equal(ytSession.payload.youTubeState?.query, 'recipe of how to prepare a Chicken curry');

    const ytTimeline = getSimulatorTimeline('youtube');
    assert.deepEqual(
      ytTimeline.map((s) => s.simPhase),
      [
        'home_screen',
        'selecting_app',
        'opening_app',
        'activating_search',
        'typing_input',
        'showing_results',
        'selecting_result',
      ]
    );
    const ytDone = await runDemoExecution(prepared, 'interactive_demo', caps, 'en');
    assert.equal(ytDone.session.simPhase, 'completed');
    assert.equal(ytDone.session.payload.youTubeState?.playerOpen, true);
    assert.equal(ytDone.session.payload.youTubeState?.isPlaying, true);
    passed += 1;
  }

  // Test 70: Regression — "Open YouTube and play Hanuman Chalisa."
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand('Open YouTube and play Hanuman Chalisa.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.target, 'Hanuman Chalisa');
    const done = await runDemoExecution(parsed.task!, 'interactive_demo', caps, 'en');
    assert.equal(done.session.appId, 'youtube');
    assert.equal(done.session.payload.youTubeState?.query, 'Hanuman Chalisa');
    assert.equal(done.session.payload.youTubeState?.isPlaying, true);
    passed += 1;
  }

  // Test 71: Regression — "Open Chrome and search for hospitals near me."
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand('Open Chrome and search for hospitals near me.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'Chrome');
    assert.equal(parsed.task?.intent, 'search');
    assert.equal(parsed.task?.target, 'hospitals near me');
    const done = await runDemoExecution(parsed.task!, 'interactive_demo', caps, 'en');
    assert.equal(done.session.appId, 'chrome');
    assert.equal(done.session.payload.chromeState?.typedQuery, 'hospitals near me');
    passed += 1;
  }

  // Test 72: Regression — "Send Son a WhatsApp message telling him to get my medicine."
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand(
      'Send Son a WhatsApp message telling him to get my medicine.',
      'en'
    );
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.intent, 'messaging');
    assert.equal(parsed.task?.application, 'WhatsApp');
    assert.equal(parsed.task?.target, 'Son');
    assert.match(parsed.task?.messageContent || '', /get my medicine/i);
    const done = await runDemoExecution(parsed.task!, 'interactive_demo', caps, 'en');
    assert.equal(done.session.appId, 'whatsapp');
    assert.equal(done.session.payload.whatsAppState?.sentInDemo, true);
    passed += 1;
  }

  // Test 73: BUG 2 & BUG 5 regression — Complete WhatsApp demo, then immediately request YouTube (no stale WhatsApp state)
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const waTask = prepareTaskForPlatform(
      parseNaturalCommand('Send Son a WhatsApp message telling him to get my medicine.', 'en').task!,
      caps,
      'en'
    ).task;
    const waDone = await runDemoExecution(waTask, 'interactive_demo', caps, 'en');
    assert.equal(waDone.task.executionStatus, 'simulated_completed');

    const ytText =
      'Can you open a YouTube video that shows the recipe of how to prepare a Chicken curry?';
    const pendingCheck = evaluatePendingTaskTurn(
      ytText,
      waDone.task,
      waDone.session,
      'interactive_demo',
      'en'
    );
    assert.equal(pendingCheck.handled, false);

    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand(ytText, 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytTask, 'interactive_demo', 'en');
    assert.notEqual(ytSession.taskId, waDone.session.taskId);
    assert.equal(ytSession.appId, 'youtube');
    assert.equal(ytSession.payload.whatsAppState, undefined);
    assert.ok(ytSession.payload.youTubeState);
    passed += 1;
  }

  // Test 74: BUG 2 & BUG 5 regression — Complete YouTube demo, then immediately request Chrome
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube and play Hanuman Chalisa.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytDone = await runDemoExecution(ytTask, 'interactive_demo', caps, 'en');
    assert.equal(ytDone.task.executionStatus, 'simulated_completed');

    const chromeText = 'Open Chrome and search for hospitals near me.';
    const pendingCheck = evaluatePendingTaskTurn(
      chromeText,
      ytDone.task,
      ytDone.session,
      'interactive_demo',
      'en'
    );
    assert.equal(pendingCheck.handled, false);

    const chromeTask = prepareTaskForPlatform(
      parseNaturalCommand(chromeText, 'en').task!,
      caps,
      'en'
    ).task;
    const chromeSession = createDemoSessionForTask(chromeTask, 'interactive_demo', 'en');
    assert.notEqual(chromeSession.taskId, ytDone.session.taskId);
    assert.equal(chromeSession.appId, 'chrome');
    assert.equal(chromeSession.payload.youTubeState, undefined);
    assert.ok(chromeSession.payload.chromeState);
    passed += 1;
  }

  // Test 75: Regression — Pending confirmation still works for affirmative phrasing
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand('Open YouTube and play Hanuman Chalisa.', 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytTask, 'interactive_demo', 'en');
    assert.equal(ytTask.executionStatus, 'awaiting_confirmation');

    for (const yesPhrase of ['Yes, please open', 'Open it', 'Yes, go ahead']) {
      const turn = evaluatePendingTaskTurn(
        yesPhrase,
        ytTask,
        ytSession,
        'interactive_demo',
        'en'
      );
      assert.equal(turn.handled, true);
      assert.equal(turn.action, 'execute');
    }
    passed += 1;
  }

  // Test 76: Regression — Affirmative response with NO pending confirmation (or completed WhatsApp) does NOT execute an action
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const waDone = await runDemoExecution(
      parseNaturalCommand('Send Son a WhatsApp message telling him to get my medicine.', 'en').task!,
      'interactive_demo',
      caps,
      'en'
    );
    for (const phrase of ['Yes, please open', 'Yes', 'Sure', 'Do it']) {
      const noTaskTurn = evaluatePendingTaskTurn(phrase, null, null, 'interactive_demo', 'en');
      assert.equal(noTaskTurn.handled, false);
      assert.equal(noTaskTurn.action, 'none');

      const completedWaTurn = evaluatePendingTaskTurn(
        phrase,
        waDone.task,
        waDone.session,
        'interactive_demo',
        'en'
      );
      assert.equal(completedWaTurn.handled, false);
      assert.equal(completedWaTurn.action, 'none');
    }
    passed += 1;
  }

  // Test 77: BUG 3 regression — Full utterance preserved in SpeechSessionController & fallback response without truncation
  {
    const { env, instances } = createMockSpeechEnv();
    const finals: string[] = [];
    const interims: string[] = [];

    const ctrl = new SpeechSessionController({
      lang: 'en',
      env,
      onStateChange: (snapshot) => {
        if (snapshot.interimTranscript) interims.push(snapshot.interimTranscript);
      },
      onFinalTranscript: (t: string) => finals.push(t),
    });

    ctrl.startConversation();
    const rec = instances[0];

    // Multi-segment interim must keep earlier finalized words + latest interim, without firing final callback early
    rec.emitResult([
      { transcript: 'Can you open a YouTube video', isFinal: true },
      { transcript: 'that shows the recipe of how', isFinal: false },
    ]);
    assert.equal(finals.length, 0);
    assert.equal(
      interims[interims.length - 1],
      'Can you open a YouTube video that shows the recipe of how'
    );

    // Next segment completes the sentence and ends recognition cleanly
    rec.emitResult([
      { transcript: 'Can you open a YouTube video', isFinal: true },
      { transcript: 'that shows the recipe of how to prepare a Chicken curry?', isFinal: false },
    ]);
    rec.emitUnexpectedEnd();

    assert.equal(finals.length, 1);
    assert.equal(
      finals[0],
      'Can you open a YouTube video that shows the recipe of how to prepare a Chicken curry?'
    );

    const longSentence =
      'Please tell me everything about senior citizen bus pass discounts available in my neighbourhood today';
    const fallback = buildGeneralFallbackResponse(longSentence, 'en');
    assert.ok(fallback.includes(longSentence), 'Fallback response must not truncate utterance');
    ctrl.destroy();
    passed += 1;
  }

  // Test 78: BUG 4 regression — Welfare form values consistent across stats, validation, readout, and missing explanation
  {
    const userEntered = {
      ...EMPTY_APPLICATION_DATA,
      fullName: 'Anita Sharma',
      mobileNumber: '9876543210',
      district: 'Bengaluru Urban',
    };
    const stats = getCompletionStats(userEntered);
    assert.equal(stats.filledCount, 3);
    assert.equal(stats.totalCount, 9);

    const errs = validateAllFields(userEntered, 'en');
    assert.equal(errs.fullName, undefined);
    assert.equal(errs.mobileNumber, undefined);
    assert.equal(errs.district, undefined);

    const readout = buildApplicationReadout(userEntered, 'en');
    assert.match(readout, /Anita Sharma/);
    assert.match(readout, /98765\s?43210/);
    assert.match(readout, /Bengaluru Urban/);

    const missing = buildMissingFieldsExplanation(userEntered, 'en');
    assert.match(missing, /6 missing fields/i);
    passed += 1;
  }

  // Test 79: BUG 4 regression — Resetting welfare form clears all fields cleanly
  {
    const cleared = { ...EMPTY_APPLICATION_DATA };
    const stats = getCompletionStats(cleared);
    assert.equal(stats.filledCount, 0);
    for (const val of Object.values(cleared)) {
      assert.equal(val, '');
    }
    passed += 1;
  }

  // Test 80: BUG 4 regression — No hardcoded personal-looking names, addresses, birth dates, phone numbers, or sample defaults
  {
    for (const val of Object.values(EMPTY_APPLICATION_DATA)) {
      assert.equal(val, '');
    }
    const serializedTranslations = JSON.stringify([
      TRANSLATIONS.en.fields,
      TRANSLATIONS.hi.fields,
      TRANSLATIONS.kn.fields,
    ]);
    assert.ok(!/Ramesh|Kulkarni|रमेश|ರಮೇಶ|Gandhi Nagar|9845012345|1958|120000/i.test(serializedTranslations));
    passed += 1;
  }

  // Test 81: "Can you open a video of chicken curry recipe?" -> YouTube + query "chicken curry recipe"
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const parsed = parseNaturalCommand('Can you open a video of chicken curry recipe?', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.intent, 'app_launch');
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.action, 'play_video');
    assert.equal(parsed.task?.target, 'chicken curry recipe');
    assert.equal(parsed.task?.searchQuery, 'chicken curry recipe');
    assert.notEqual(parsed.task?.intent, 'unknown_app');

    const prep = prepareTaskForPlatform(parsed.task!, caps, 'en');
    assert.equal(prep.task.executionStatus, 'awaiting_confirmation');
    assert.equal(resolveDemoAppId(prep.task), 'youtube');
    const done = await runDemoExecution(prep.task, 'interactive_demo', caps, 'en');
    assert.equal(done.session.appId, 'youtube');
    assert.equal(done.session.payload.youTubeState?.query, 'chicken curry recipe');
    assert.equal(done.session.payload.youTubeState?.playerOpen, true);
    passed += 1;
  }

  // Test 82: "Find a video showing how to make dosa." -> YouTube + "how to make dosa"
  {
    const parsed = parseNaturalCommand('Find a video showing how to make dosa.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.target, 'how to make dosa');
    assert.equal(parsed.task?.searchQuery, 'how to make dosa');
    passed += 1;
  }

  // Test 83: "Play a gardening tutorial." -> YouTube + "gardening tutorial"
  {
    const parsed = parseNaturalCommand('Play a gardening tutorial.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.target, 'gardening tutorial');
    assert.equal(parsed.task?.searchQuery, 'gardening tutorial');
    passed += 1;
  }

  // Test 84: "Search YouTube for English lessons." -> YouTube + "English lessons"
  {
    const parsed = parseNaturalCommand('Search YouTube for English lessons.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'YouTube');
    assert.equal(parsed.task?.action, 'search_youtube');
    assert.equal(parsed.task?.target, 'English lessons');
    assert.equal(parsed.task?.searchQuery, 'English lessons');
    assert.equal(resolveDemoAppId(parsed.task!), 'youtube');
    passed += 1;
  }

  // Test 85: "Find restaurants near me." -> Google Maps + "restaurants" + locationIntent: "nearby"
  {
    const parsed = parseNaturalCommand('Find restaurants near me.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.intent, 'search');
    assert.equal(parsed.task?.application, 'Google Maps');
    assert.equal(parsed.task?.target, 'restaurants');
    assert.equal(parsed.task?.searchQuery, 'restaurants');
    assert.equal(parsed.task?.locationIntent, 'nearby');
    assert.equal(parsed.task?.requiresLocation, true);
    passed += 1;
  }

  // Test 86: "I would like to search for restaurants near me." (and "a restaurants near me") -> "restaurants"
  {
    for (const phrase of [
      'I would like to search for restaurants near me.',
      'I would like to search for a restaurants near me.',
    ]) {
      const parsed = parseNaturalCommand(phrase, 'en');
      assert.equal(parsed.matched, true);
      assert.equal(parsed.task?.application, 'Google Maps');
      assert.equal(parsed.task?.target, 'restaurants');
      assert.equal(parsed.task?.searchQuery, 'restaurants');
      assert.equal(parsed.task?.locationIntent, 'nearby');
      assert.equal(parsed.task?.requiresLocation, true);
    }
    passed += 1;
  }

  // Test 87: "Find a pharmacy nearby." -> Google Maps + "pharmacy" + locationIntent: "nearby"
  {
    const parsed = parseNaturalCommand('Find a pharmacy nearby.', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'Google Maps');
    assert.equal(parsed.task?.target, 'pharmacy');
    assert.equal(parsed.task?.searchQuery, 'pharmacy');
    assert.equal(parsed.task?.locationIntent, 'nearby');
    assert.equal(parsed.task?.requiresLocation, true);
    passed += 1;
  }

  // Test 88: "Where is the nearest hospital?" -> Google Maps + "hospital" + locationIntent: "nearby"
  {
    const parsed = parseNaturalCommand('Where is the nearest hospital?', 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.application, 'Google Maps');
    assert.equal(parsed.task?.target, 'hospital');
    assert.equal(parsed.task?.searchQuery, 'hospital');
    assert.equal(parsed.task?.locationIntent, 'nearby');
    assert.equal(parsed.task?.requiresLocation, true);
    passed += 1;
  }

  // Test 89: "Yeah sure" and full affirmative variations with a pending YouTube confirmation
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand('Can you open a video of chicken curry recipe?', 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytTask, 'interactive_demo', 'en');

    for (const yesPhrase of [
      'Yeah sure',
      'Yes.',
      'Yes, please.',
      'Yes, go ahead.',
      'Yeah.',
      'Sure.',
      'Okay.',
      'Absolutely.',
      'Please continue.',
      'Do that.',
      'Go ahead and open it.',
    ]) {
      const turn = evaluatePendingTaskTurn(
        yesPhrase,
        ytTask,
        ytSession,
        'interactive_demo',
        'en'
      );
      assert.equal(turn.handled, true, `Expected handled for "${yesPhrase}"`);
      assert.equal(turn.action, 'execute', `Expected execute for "${yesPhrase}"`);
      if (turn.action === 'execute') {
        assert.equal(turn.task.application, 'YouTube');
        assert.equal(turn.task.target, 'chicken curry recipe');
      }
    }

    for (const noPhrase of ['No.', 'No thanks.', 'Not now.', 'Cancel.', 'Stop.']) {
      const turn = evaluatePendingTaskTurn(
        noPhrase,
        ytTask,
        ytSession,
        'interactive_demo',
        'en'
      );
      assert.equal(turn.handled, true, `Expected handled for "${noPhrase}"`);
      assert.equal(turn.action, 'cancel', `Expected cancel for "${noPhrase}"`);
    }
    passed += 1;
  }

  // Test 90: "Yes, go ahead" with a pending Chrome confirmation
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const chromeTask = prepareTaskForPlatform(
      parseNaturalCommand('Open Chrome and search for senior pension benefits.', 'en').task!,
      caps,
      'en'
    ).task;
    const chromeSession = createDemoSessionForTask(chromeTask, 'interactive_demo', 'en');
    assert.equal(chromeTask.executionStatus, 'awaiting_confirmation');

    const turn = evaluatePendingTaskTurn(
      'Yes, go ahead',
      chromeTask,
      chromeSession,
      'interactive_demo',
      'en'
    );
    assert.equal(turn.handled, true);
    assert.equal(turn.action, 'execute');
    if (turn.action === 'execute') {
      const res = await runDemoExecution(turn.task, 'interactive_demo', caps, 'en');
      assert.equal(res.session.appId, 'chrome');
      assert.equal(res.session.payload.chromeState?.query, 'senior pension benefits');
    }
    passed += 1;
  }

  // Test 91: "Sure" with no pending action must NOT execute any action
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const turnNoTask = evaluatePendingTaskTurn('Sure', null, null, 'interactive_demo', 'en');
    assert.equal(turnNoTask.handled, false);
    assert.equal(turnNoTask.action, 'none');

    const parsedStandalone = parseNaturalCommand('Sure', 'en');
    assert.equal(parsedStandalone.matched, false);

    // Also after a completed Maps session
    const mapsDone = await runDemoExecution(
      prepareTaskForPlatform(
        parseNaturalCommand('Find restaurants near me.', 'en').task!,
        caps,
        'en'
      ).task,
      'interactive_demo',
      caps,
      'en'
    );
    const turnCompletedMaps = evaluatePendingTaskTurn(
      'Sure',
      mapsDone.task,
      mapsDone.session,
      'interactive_demo',
      'en'
    );
    assert.equal(turnCompletedMaps.handled, false);
    assert.equal(turnCompletedMaps.action, 'none');
    passed += 1;
  }

  // Test 92: Switching from a completed Maps workflow to a new YouTube workflow
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const mapsTask = prepareTaskForPlatform(
      parseNaturalCommand('Find restaurants near me.', 'en').task!,
      caps,
      'en'
    ).task;
    const mapsDone = await runDemoExecution(mapsTask, 'interactive_demo', caps, 'en');
    assert.equal(mapsDone.session.appId, 'maps');
    assert.equal(mapsDone.task.executionStatus, 'simulated_completed');

    const ytUtterance = 'Can you open a video of chicken curry recipe?';
    const pendingCheck = evaluatePendingTaskTurn(
      ytUtterance,
      mapsDone.task,
      mapsDone.session,
      'interactive_demo',
      'en'
    );
    assert.equal(pendingCheck.handled, false);

    const ytTask = prepareTaskForPlatform(
      parseNaturalCommand(ytUtterance, 'en').task!,
      caps,
      'en'
    ).task;
    const ytSession = createDemoSessionForTask(ytTask, 'interactive_demo', 'en');
    assert.notEqual(ytSession.taskId, mapsDone.session.taskId);
    assert.equal(ytSession.appId, 'youtube');
    assert.equal(ytSession.payload.mapsState, undefined);
    assert.equal(ytSession.payload.youTubeState?.query, 'chicken curry recipe');
    passed += 1;
  }

  // Test 93: Clean search-query extraction without conversational filler across diverse natural phrasing
  {
    const cases: Array<{ input: string; app: string; query: string }> = [
      {
        input: 'Can you show me a video about making chicken curry?',
        app: 'YouTube',
        query: 'making chicken curry',
      },
      {
        input: 'Play a chicken curry cooking video.',
        app: 'YouTube',
        query: 'chicken curry cooking',
      },
      {
        input: 'I want to watch a gardening tutorial.',
        app: 'YouTube',
        query: 'gardening tutorial',
      },
      {
        input: 'Show me how to repair a mobile phone.',
        app: 'YouTube',
        query: 'how to repair a mobile phone',
      },
      {
        input: 'Can you play Hanuman Chalisa?',
        app: 'YouTube',
        query: 'Hanuman Chalisa',
      },
      {
        input: 'Search for pharmacies nearby.',
        app: 'Google Maps',
        query: 'pharmacies',
      },
      {
        input: 'Find an ATM near me.',
        app: 'Google Maps',
        query: 'ATM',
      },
      {
        input: 'Show grocery stores nearby.',
        app: 'Google Maps',
        query: 'grocery stores',
      },
      {
        input: 'Find petrol pumps close to me.',
        app: 'Google Maps',
        query: 'petrol pumps',
      },
    ];

    for (const c of cases) {
      const res = parseNaturalCommand(c.input, 'en');
      assert.equal(res.matched, true, `Expected match for "${c.input}"`);
      assert.equal(res.task?.application, c.app, `Expected app ${c.app} for "${c.input}"`);
      assert.equal(res.task?.searchQuery, c.query, `Expected query "${c.query}" for "${c.input}"`);
      assert.equal(res.task?.target, c.query);
    }
    passed += 1;
  }

  // Test 94: Preservation of the complete original utterance while separating normalized & extracted fields
  {
    const rawUtterance =
      'Hey Sahaaya, could you please help me search for a restaurants near me?';
    const parsed = parseNaturalCommand(rawUtterance, 'en');
    assert.equal(parsed.matched, true);
    assert.equal(parsed.task?.rawInstruction, rawUtterance);
    assert.equal(parsed.task?.normalizedInstruction, 'search for a restaurants near me?');
    assert.equal(parsed.task?.application, 'Google Maps');
    assert.equal(parsed.task?.action, 'web_search');
    assert.equal(parsed.task?.searchQuery, 'restaurants');
    assert.equal(parsed.task?.locationIntent, 'nearby');

    const session = createDemoSessionForTask(parsed.task!, 'interactive_demo', 'en');
    assert.equal(session.recognisedCommand, rawUtterance);
    assert.equal(session.payload.mapsState?.query, 'restaurants');
    passed += 1;
  }

  // Test 95: Incomplete WhatsApp task interrupted by Calculator command abandons cleanly
  {
    const waStart = parseNaturalCommand('I want to wish my friend a happy birthday.', 'en');
    assert.equal(waStart.matched, true);
    assert.equal(waStart.task?.application, 'WhatsApp');
    assert.equal(waStart.task?.executionStatus, 'needs_info');

    const interruption = 'Open Calculator and calculate 250 + 350.';
    const turn = resolveTaskContextTurn(
      interruption,
      waStart.task!,
      null,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(turn.outcome, 'pass_to_new_command');
    if (turn.outcome === 'pass_to_new_command') {
      assert.equal(turn.abandonedPrevious, true);
    }

    const calcParsed = parseNaturalCommand(interruption, 'en');
    assert.equal(calcParsed.matched, true);
    assert.equal(calcParsed.task?.application, 'Calculator');
    assert.equal(calcParsed.task?.mathResult, '600');
    assert.notEqual(calcParsed.task?.application, 'WhatsApp');
    passed += 1;
  }

  // Test 96: Cancelling pending WhatsApp or Search confirmation avoids stuck confirmation loops
  {
    const waReady = parseNaturalCommand(
      'Send a WhatsApp message to Rahul saying Happy Birthday!',
      'en'
    );
    assert.equal(waReady.matched, true);
    assert.equal(waReady.task?.executionStatus, 'awaiting_confirmation');
    const waSession = createDemoSessionForTask(waReady.task!, 'interactive_demo', 'en');

    for (const phrase of ['Forget that', "Let's do something else", 'Never mind', 'Cancel']) {
      const cancelTurn = resolveTaskContextTurn(
        phrase,
        waReady.task!,
        waSession,
        null,
        'interactive_demo',
        'en'
      );
      assert.equal(cancelTurn.outcome, 'cancelled_pending', `Expected cancel for "${phrase}"`);

      // Subsequent "Yes" with cleared state must NOT re-execute the cancelled task
      const postCancelYes = evaluatePendingTaskTurn('Yes', null, null, 'interactive_demo', 'en');
      assert.equal(postCancelYes.handled, false);
    }
    passed += 1;
  }

  // Test 97: Unrelated question during needs_info WhatsApp prompt yields instead of becoming message body
  {
    const waIncomplete = parseNaturalCommand('Send a WhatsApp message to Meena.', 'en');
    assert.equal(waIncomplete.matched, true);
    assert.equal(waIncomplete.task?.executionStatus, 'needs_info');

    const question = 'What is 450 divided by 5?';
    const turn = resolveTaskContextTurn(
      question,
      waIncomplete.task!,
      null,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(turn.outcome, 'pass_to_new_command');
    if (turn.outcome === 'pass_to_new_command') {
      assert.equal(turn.abandonedPrevious, true);
    }

    const calcParsed = parseNaturalCommand(question, 'en');
    assert.equal(calcParsed.matched, true);
    assert.equal(calcParsed.task?.application, 'Calculator');
    assert.equal(calcParsed.task?.mathResult, '90');
    passed += 1;
  }

  // Test 98: Natural YouTube video triggers without naming YouTube
  {
    const cases: Array<{ input: string; expectedQuery: string }> = [
      { input: 'Can you help me find a yoga video?', expectedQuery: 'yoga' },
      { input: 'I want to learn yoga.', expectedQuery: 'yoga' },
      { input: 'Show me a chicken curry recipe.', expectedQuery: 'chicken curry recipe' },
      { input: 'Find videos teaching English.', expectedQuery: 'English' },
      { input: 'Open YouTube and show me the yoga video.', expectedQuery: 'yoga' },
    ];
    for (const c of cases) {
      const res = parseNaturalCommand(c.input, 'en');
      assert.equal(res.matched, true, `Expected match for "${c.input}"`);
      assert.equal(res.task?.application, 'YouTube', `Expected YouTube for "${c.input}"`);
      assert.equal(
        res.task?.searchQuery?.toLowerCase(),
        c.expectedQuery.toLowerCase(),
        `Expected query "${c.expectedQuery}" for "${c.input}"`
      );
    }
    passed += 1;
  }

  // Test 99: Natural Google Search and Google Maps phrasing without naming the app
  {
    const searchCases = [
      'Find information about hospitals in Mangalore.',
      'Search for beginner Java tutorials.',
    ];
    for (const s of searchCases) {
      const res = parseNaturalCommand(s, 'en');
      assert.equal(res.matched, true, `Expected match for "${s}"`);
      assert.equal(res.task?.application, 'Google Search', `Expected Google Search for "${s}"`);
      assert.ok((res.task?.searchQuery || '').length >= 4);
    }

    const mapsCases = [
      'Where is the nearest hospital?',
      'Find an ATM close to me.',
      'Where can I find a petrol pump?',
    ];
    for (const m of mapsCases) {
      const res = parseNaturalCommand(m, 'en');
      assert.equal(res.matched, true, `Expected match for "${m}"`);
      assert.equal(res.task?.application, 'Google Maps', `Expected Google Maps for "${m}"`);
    }
    passed += 1;
  }

  // Test 100: Natural WhatsApp phrasing extracts recipient & message body and never auto-sends real WhatsApp
  {
    const cases: Array<{ input: string; recipient: string; bodyFragment: string }> = [
      {
        input: 'Send my son a message asking him to buy medicine.',
        recipient: 'son',
        bodyFragment: 'buy medicine',
      },
      {
        input: 'Tell my daughter I will reach home at 6.',
        recipient: 'daughter',
        bodyFragment: 'reach home at 6',
      },
      {
        input: 'Prepare a message for my friend saying I miss her.',
        recipient: 'my friend',
        bodyFragment: 'miss her',
      },
    ];
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    for (const c of cases) {
      const res = parseNaturalCommand(c.input, 'en');
      assert.equal(res.matched, true, `Expected match for "${c.input}"`);
      assert.equal(res.task?.intent, 'messaging');
      assert.ok((res.task?.application || '').includes('WhatsApp'));
      assert.equal(res.task?.executionStatus, 'awaiting_confirmation');
      assert.ok((res.task?.recipient || '').toLowerCase().includes(c.recipient));
      assert.ok((res.task?.messageContent || '').toLowerCase().includes(c.bodyFragment));

      const demoExec = await runDemoExecution(res.task!, 'interactive_demo', demoCaps, 'en');
      assert.equal(demoExec.session.appId, 'whatsapp');
      assert.ok(
        demoExec.replyText.toLowerCase().includes('not sent') ||
          demoExec.replyText.toLowerCase().includes('demo'),
        'Demo mode must clearly indicate message is not actually sent'
      );
    }
    passed += 1;
  }

  // Test 101: WhatsApp birthday draft editing via resolveTaskContextTurn preserves confirmation gate
  {
    const initial = parseNaturalCommand(
      'Send a WhatsApp message to Rahul saying Happy Birthday!',
      'en'
    );
    assert.equal(initial.matched, true);
    assert.equal(initial.task?.application, 'WhatsApp');
    assert.equal(initial.task?.executionStatus, 'awaiting_confirmation');

    let currentTask = initial.task!;
    let currentSession = createDemoSessionForTask(currentTask, 'interactive_demo', 'en');

    const personalEdit = resolveTaskContextTurn(
      'Make it more personal.',
      currentTask,
      currentSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(personalEdit.outcome, 'updated_whatsapp_draft');
    if (personalEdit.outcome === 'updated_whatsapp_draft') {
      currentTask = personalEdit.task;
      currentSession = personalEdit.session!;
      assert.equal(currentTask.executionStatus, 'awaiting_confirmation');
      assert.ok((currentTask.messageContent || '').length > 15);
    }

    const shorterEdit = resolveTaskContextTurn(
      'Make it shorter.',
      currentTask,
      currentSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(shorterEdit.outcome, 'updated_whatsapp_draft');
    if (shorterEdit.outcome === 'updated_whatsapp_draft') {
      currentTask = shorterEdit.task;
      currentSession = shorterEdit.session!;
      assert.equal(currentTask.executionStatus, 'awaiting_confirmation');
    }

    const msgEdit = resolveTaskContextTurn(
      'Change the message to Wishing you good health today!',
      currentTask,
      currentSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(msgEdit.outcome, 'updated_whatsapp_draft');
    if (msgEdit.outcome === 'updated_whatsapp_draft') {
      currentTask = msgEdit.task;
      currentSession = msgEdit.session!;
      assert.equal(currentTask.messageContent, 'Wishing you good health today!');
    }

    const recEdit = resolveTaskContextTurn(
      'Change recipient to Meena',
      currentTask,
      currentSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(recEdit.outcome, 'updated_whatsapp_draft');
    if (recEdit.outcome === 'updated_whatsapp_draft') {
      currentTask = recEdit.task;
      assert.equal(currentTask.recipient, 'Meena');
      assert.equal(currentTask.executionStatus, 'awaiting_confirmation');
    }

    const confirmTurn = resolveTaskContextTurn(
      'Yes, continue.',
      currentTask,
      currentSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(confirmTurn.outcome, 'execute_pending');
    passed += 1;
  }

  // Test 102: Scholarship discovery asks education level when missing and never hijacks welfare application
  {
    const genericScholar = parseNaturalCommand('Find a scholarship for me.', 'en');
    assert.equal(genericScholar.matched, true);
    assert.equal(genericScholar.task?.application, 'Google Search');
    assert.notEqual(genericScholar.task?.intent, 'application_task');
    assert.equal(genericScholar.task?.executionStatus, 'needs_info');

    const followTurn = resolveTaskContextTurn(
      'engineering',
      genericScholar.task!,
      null,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(followTurn.outcome, 'advanced_needs_info');
    if (followTurn.outcome === 'advanced_needs_info') {
      assert.equal(followTurn.task.executionStatus, 'awaiting_confirmation');
      assert.ok((followTurn.task.searchQuery || '').toLowerCase().includes('engineering'));
      assert.ok((followTurn.task.searchQuery || '').toLowerCase().includes('scholarship'));
    }

    const specificScholar = parseNaturalCommand(
      'Find scholarships for engineering students.',
      'en'
    );
    assert.equal(specificScholar.matched, true);
    assert.equal(specificScholar.task?.application, 'Google Search');
    assert.equal(specificScholar.task?.executionStatus, 'awaiting_confirmation');

    // Welfare form remains intact
    const welfare = parseNaturalCommand('Fill my senior citizen application', 'en');
    assert.equal(welfare.matched, true);
    assert.equal(welfare.task?.intent, 'application_task');
    passed += 1;
  }

  // Test 103: Contextual "Give me the link." uses real lastTaskContext URL and never invents URLs when null
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const scholar = parseNaturalCommand('Find scholarships for engineering students.', 'en');
    assert.equal(scholar.matched, true);
    const done = await runDemoExecution(scholar.task!, 'interactive_demo', demoCaps, 'en');
    const ctx: LastTaskContext = {
      task: scholar.task!,
      session: done.session,
      selectedIndex: 0,
    };

    const linkFollow = parseContextualFollowUp('Give me the link.', ctx, 'en');
    assert.equal(linkFollow.matched, true);
    if (linkFollow.matched) {
      assert.equal(linkFollow.action, 'provide_link');
      assert.ok((linkFollow.url || '').startsWith('https://'));
      assert.ok(linkFollow.replyText.includes('https://'));
    }

    const noCtxFollow = parseContextualFollowUp('Give me the link.', null, 'en');
    assert.equal(noCtxFollow.matched, true);
    if (noCtxFollow.matched) {
      assert.equal(noCtxFollow.action, 'no_prior_context');
      assert.equal(noCtxFollow.url ?? null, null);
      assert.equal(/https?:\/\//i.test(noCtxFollow.replyText), false);
    }
    passed += 1;
  }

  // Test 104: Deterministic Calculator engine (no eval) & voice calculator commands
  {
    assert.equal(evaluateMathExpression('250 + 350').formattedValue, '600');
    assert.equal(evaluateMathExpression('450 / 5').formattedValue, '90');
    assert.equal(evaluateMathExpression('25 * 8').formattedValue, '200');
    assert.equal(evaluateMathExpression('15 percent of 200').formattedValue, '30');

    const divZero = evaluateMathExpression('50 / 0');
    assert.equal(divZero.ok, false);
    assert.ok((divZero.error || '').toLowerCase().includes('zero'));

    const subCmd = parseNaturalCommand('Subtract 150 from 500.', 'en');
    assert.equal(subCmd.matched, true);
    assert.equal(subCmd.task?.application, 'Calculator');
    assert.equal(subCmd.task?.mathResult, '350');

    const mulCmd = parseNaturalCommand('Open the calculator and multiply 25 by 8.', 'en');
    assert.equal(mulCmd.matched, true);
    assert.equal(mulCmd.task?.application, 'Calculator');
    assert.equal(mulCmd.task?.mathResult, '200');

    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const execCalc = await runDemoExecution(mulCmd.task!, 'interactive_demo', demoCaps, 'en');
    assert.equal(execCalc.session.appId, 'calculator');
    assert.equal(execCalc.session.payload.calculatorState?.result, '200');
    passed += 1;
  }

  // Test 105: Calendar month grid accuracy & multi-turn appointment creation with simulated disclaimer
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const refDate = new Date(2026, 10, 15);
    const grid = buildCalendarMonthGrid(2026, 10, refDate);
    assert.equal(grid.cells.length % 7, 0);
    assert.ok(grid.cells.some((c) => c.isToday && c.dayNumber === 15 && c.inCurrentMonth));

    const directCal = extractCalendarCommand("Add a doctor's appointment tomorrow at 10 AM.", refDate);
    assert.equal(directCal.matched, true);
    assert.equal(directCal.subAction, 'add_event');
    assert.equal(directCal.missingSlots.includes('time'), false);
    assert.ok((directCal.time || '').includes('10'));

    const missingTime = parseNaturalCommand('Remind me about my meeting on Monday.', 'en');
    assert.equal(missingTime.matched, true);
    assert.equal(missingTime.task?.application, 'Calendar');
    assert.equal(missingTime.task?.executionStatus, 'needs_info');

    const timeTurn = resolveTaskContextTurn(
      '10 AM',
      missingTime.task!,
      null,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(timeTurn.outcome, 'advanced_needs_info');
    if (timeTurn.outcome === 'advanced_needs_info') {
      assert.equal(timeTurn.executeImmediately, true);
      const calExec = await runDemoExecution(timeTurn.task, 'interactive_demo', demoCaps, 'en');
      assert.equal(calExec.session.appId, 'calendar');
      assert.ok(calExec.session.payload.calendarState?.events.length);
      assert.ok(
        calExec.replyText.toLowerCase().includes('simulated') ||
          calExec.replyText.toLowerCase().includes('no real phone calendar'),
        'Calendar reply must state no real phone calendar event or alarm was created'
      );
    }
    passed += 1;
  }

  // Test 106: Calendar view, upcoming events, and event deletion commands
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    for (const phrase of ['Open Calendar.', 'Show my calendar.', 'Show my upcoming events.']) {
      const res = parseNaturalCommand(phrase, 'en');
      assert.equal(res.matched, true, `Expected match for "${phrase}"`);
      assert.equal(res.task?.application, 'Calendar');
      const exec = await runDemoExecution(res.task!, 'interactive_demo', demoCaps, 'en');
      assert.equal(exec.session.appId, 'calendar');
    }

    const del = parseNaturalCommand('Delete my appointment.', 'en');
    assert.equal(del.matched, true);
    assert.equal(del.task?.application, 'Calendar');
    assert.equal(del.task?.action, 'delete_calendar_event');
    passed += 1;
  }

  // Test 107: Spotify music commands vs preserved YouTube "Play relaxing music." compatibility
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const spotifyCases = [
      'Open Spotify.',
      'Search for relaxing music.',
      'Find devotional songs.',
      'Play meditation music.',
      'Search for Kannada songs.',
      'Find Hindi songs.',
    ];
    for (const s of spotifyCases) {
      const res = parseNaturalCommand(s, 'en');
      assert.equal(res.matched, true, `Expected match for "${s}"`);
      assert.equal(res.task?.application, 'Spotify', `Expected Spotify for "${s}"`);
      const exec = await runDemoExecution(res.task!, 'interactive_demo', demoCaps, 'en');
      assert.equal(exec.session.appId, 'spotify');
      assert.ok(exec.session.payload.spotifyState?.tracks.length);
      assert.ok((exec.session.payload.spotifyState?.spotifyUrl || '').includes('open.spotify.com'));
    }

    // Preserve backward-compatible YouTube route for "Play relaxing music."
    const ytMusic = parseNaturalCommand('Play relaxing music.', 'en');
    assert.equal(ytMusic.matched, true);
    assert.equal(ytMusic.task?.application, 'YouTube');
    passed += 1;
  }

  // Test 108: Contextual YouTube, Chrome, and Maps follow-ups ("Open the first video.", "Show me another video.", "Give me directions.")
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytParsed = parseNaturalCommand('Show me a yoga video.', 'en');
    const ytDone = await runDemoExecution(ytParsed.task!, 'interactive_demo', demoCaps, 'en');
    const ytCtx: LastTaskContext = { task: ytParsed.task!, session: ytDone.session, selectedIndex: 0 };

    const firstVid = resolveTaskContextTurn('Open the first video.', null, null, ytCtx, 'interactive_demo', 'en');
    assert.equal(firstVid.outcome, 'contextual_follow_up');
    if (firstVid.outcome === 'contextual_follow_up') {
      assert.equal(firstVid.result.action, 'select_item');
      assert.equal(firstVid.result.updatedContext?.session.payload.youTubeState?.playerOpen, true);
    }

    const anotherVid = resolveTaskContextTurn('Show me another video.', null, null, ytCtx, 'interactive_demo', 'en');
    assert.equal(anotherVid.outcome, 'contextual_follow_up');
    if (anotherVid.outcome === 'contextual_follow_up') {
      assert.equal(anotherVid.result.action, 'next_item');
      assert.equal(anotherVid.result.updatedContext?.selectedIndex, 1);
    }

    const chromeParsed = parseNaturalCommand('Find scholarships for engineering students.', 'en');
    const chromeDone = await runDemoExecution(chromeParsed.task!, 'interactive_demo', demoCaps, 'en');
    const chromeCtx: LastTaskContext = { task: chromeParsed.task!, session: chromeDone.session, selectedIndex: 0 };
    const secondRes = resolveTaskContextTurn('Show me the second result.', null, null, chromeCtx, 'interactive_demo', 'en');
    assert.equal(secondRes.outcome, 'contextual_follow_up');
    if (secondRes.outcome === 'contextual_follow_up') {
      assert.equal(secondRes.result.updatedContext?.selectedIndex, 1);
      assert.equal(secondRes.result.updatedContext?.session.payload.chromeState?.selectedResultIndex, 1);
    }

    const mapsParsed = parseNaturalCommand('Find nearby hospitals.', 'en');
    const mapsDone = await runDemoExecution(mapsParsed.task!, 'interactive_demo', demoCaps, 'en');
    const mapsCtx: LastTaskContext = { task: mapsParsed.task!, session: mapsDone.session, selectedIndex: 0 };
    const dirFollow = resolveTaskContextTurn('Give me directions.', null, null, mapsCtx, 'interactive_demo', 'en');
    assert.equal(dirFollow.outcome, 'contextual_follow_up');
    if (dirFollow.outcome === 'contextual_follow_up') {
      assert.equal(dirFollow.result.action, 'directions');
      assert.ok((dirFollow.result.url || '').includes('google.com/maps'));
    }

    const newSearch = resolveTaskContextTurn('Search for something else.', null, null, chromeCtx, 'interactive_demo', 'en');
    assert.equal(newSearch.outcome, 'contextual_follow_up');
    if (newSearch.outcome === 'contextual_follow_up') {
      assert.equal(newSearch.result.action, 'ask_new_search');
    }
    passed += 1;
  }

  // Test 109: Hindi commands across YouTube, Maps, Scholarship Search, Calculator, Calendar, WhatsApp, and Link follow-up
  {
    const ytHi = parseNaturalCommand('चिकन करी रेसिपी का वीडियो दिखाओ।', 'hi');
    assert.equal(ytHi.matched, true);
    assert.equal(ytHi.task?.application, 'YouTube');

    const mapsHi = parseNaturalCommand('नज़दीकी अस्पताल ढूँढो।', 'hi');
    assert.equal(mapsHi.matched, true);
    assert.equal(mapsHi.task?.application, 'Google Maps');

    const schHi = parseNaturalCommand('मेरे लिए छात्रवृत्ति ढूँढो।', 'hi');
    assert.equal(schHi.matched, true);
    assert.equal(schHi.task?.application, 'Google Search');

    const calcHi = parseNaturalCommand('250 और 350 जोड़ो।', 'hi');
    assert.equal(calcHi.matched, true);
    assert.equal(calcHi.task?.application, 'Calculator');
    assert.equal(calcHi.task?.mathResult, '600');

    const calHi = parseNaturalCommand('कैलेंडर खोलो।', 'hi');
    assert.equal(calHi.matched, true);
    assert.equal(calHi.task?.application, 'Calendar');

    const waHi = parseNaturalCommand('राहुल को व्हाट्सएप संदेश भेजो।', 'hi');
    assert.equal(waHi.matched, true);
    assert.equal(waHi.task?.application, 'WhatsApp');

    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const doneSch = await runDemoExecution(schHi.task!, 'interactive_demo', demoCaps, 'hi');
    const linkHi = parseContextualFollowUp(
      'मुझे इसका लिंक दो।',
      { task: schHi.task!, session: doneSch.session, selectedIndex: 0 },
      'hi'
    );
    assert.equal(linkHi.matched, true);
    if (linkHi.matched) assert.equal(linkHi.action, 'provide_link');
    passed += 1;
  }

  // Test 110: Kannada commands across YouTube, Maps, Scholarship Search, Calculator, Calendar, WhatsApp, and Link follow-up
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytKn = parseNaturalCommand('ಚಿಕನ್ ಕರಿ ರೆಸಿಪಿ ವೀಡಿಯೊ ತೋರಿಸಿ.', 'kn');
    assert.equal(ytKn.matched, true);
    assert.equal(ytKn.task?.application, 'YouTube');

    const mapsKn = parseNaturalCommand('ಹತ್ತಿರದ ಔಷಧಾಲಯ ಹುಡುಕಿ.', 'kn');
    assert.equal(mapsKn.matched, true);
    assert.equal(mapsKn.task?.application, 'Google Maps');

    const schKn = parseNaturalCommand('ನನಗೆ ವಿದ್ಯಾರ್ಥಿವೇತನ ಹುಡುಕಿ.', 'kn');
    assert.equal(schKn.matched, true);
    assert.equal(schKn.task?.application, 'Google Search');

    const calcKn = parseNaturalCommand('450 ಭಾಗಿಸು 5.', 'kn');
    assert.equal(calcKn.matched, true);
    assert.equal(calcKn.task?.application, 'Calculator');
    assert.equal(calcKn.task?.mathResult, '90');

    const calKn = parseNaturalCommand('ಕ್ಯಾಲೆಂಡರ್ ತೆರೆಯಿರಿ.', 'kn');
    assert.equal(calKn.matched, true);
    assert.equal(calKn.task?.application, 'Calendar');

    const waKn = parseNaturalCommand('ರಾಹುಲ್‌ಗೆ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ಕಳುಹಿಸಿ.', 'kn');
    assert.equal(waKn.matched, true);
    assert.equal(waKn.task?.application, 'WhatsApp');

    const doneSchKn = await runDemoExecution(schKn.task!, 'interactive_demo', demoCaps, 'kn');
    const linkKn = parseContextualFollowUp(
      'ಇದರ ಲಿಂಕ್ ಕೊಡಿ.',
      { task: schKn.task!, session: doneSchKn.session, selectedIndex: 0 },
      'kn'
    );
    assert.equal(linkKn.matched, true);
    if (linkKn.matched) assert.equal(linkKn.action, 'provide_link');
    passed += 1;
  }

  // Test 111: Unified 11-app home screen registry verification
  {
    const homeAppIds: DemoAppId[] = [
      'phone',
      'messages',
      'whatsapp',
      'chrome',
      'youtube',
      'maps',
      'camera',
      'settings',
      'calculator',
      'calendar',
      'spotify',
    ];
    for (const appId of homeAppIds) {
      assert.ok(DEMO_APP_REGISTRY[appId], `Missing registry entry for ${appId}`);
      const parsed = parseNaturalCommand(`Open ${DEMO_APP_REGISTRY[appId].name}.`, 'en');
      assert.equal(parsed.matched, true, `Expected app launch match for ${appId}`);
      const session = createDemoSessionForTask(parsed.task!, 'interactive_demo', 'en');
      assert.equal(session.appId, appId, `Expected session.appId=${appId}`);
    }
    passed += 1;
  }

  // Test 112: Messages SMS app launches distinctly from WhatsApp
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const msgCmd = parseNaturalCommand('Open Messages.', 'en');
    assert.equal(msgCmd.matched, true);
    assert.equal(msgCmd.task?.application, 'Messages');
    const exec = await runDemoExecution(msgCmd.task!, 'interactive_demo', demoCaps, 'en');
    assert.equal(exec.session.appId, 'messages');
    assert.ok(exec.session.payload.messagesState?.inbox.length);
    passed += 1;
  }

  // Test 113: "Open calculator and calculate ..." and percentage math expressions
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const pct = parseNaturalCommand('Calculate 15 percent of 200.', 'en');
    assert.equal(pct.matched, true);
    assert.equal(pct.task?.application, 'Calculator');
    assert.equal(pct.task?.mathResult, '30');

    const divZeroVoice = parseNaturalCommand('Calculate 100 divided by 0.', 'en');
    assert.equal(divZeroVoice.matched, true);
    assert.equal(divZeroVoice.task?.application, 'Calculator');
    const execDivZero = await runDemoExecution(divZeroVoice.task!, 'interactive_demo', demoCaps, 'en');
    assert.ok((execDivZero.session.payload.calculatorState?.error || '').length > 0);
    passed += 1;
  }

  // Test 114: Pending WhatsApp edit does not override unrelated new explicit commands
  {
    const waReady = parseNaturalCommand('Send a WhatsApp message to Meena saying Hello!', 'en');
    const waSession = createDemoSessionForTask(waReady.task!, 'interactive_demo', 'en');
    const turn = resolveTaskContextTurn(
      'Open Spotify.',
      waReady.task!,
      waSession,
      null,
      'interactive_demo',
      'en'
    );
    assert.equal(turn.outcome, 'pass_to_new_command');
    passed += 1;
  }

  // Test 115: Switching between Calculator, Calendar, and Spotify clears stale app payloads cleanly
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const calcTask = parseNaturalCommand('Calculate 12 times 12.', 'en').task!;
    const calcDone = await runDemoExecution(calcTask, 'interactive_demo', demoCaps, 'en');
    assert.equal(calcDone.session.appId, 'calculator');

    const calTask = parseNaturalCommand('Open Calendar.', 'en').task!;
    const calDone = await runDemoExecution(calTask, 'interactive_demo', demoCaps, 'en');
    assert.equal(calDone.session.appId, 'calendar');
    assert.equal(calDone.session.payload.calculatorState, undefined);

    const spTask = parseNaturalCommand('Search for devotional songs.', 'en').task!;
    const spDone = await runDemoExecution(spTask, 'interactive_demo', demoCaps, 'en');
    assert.equal(spDone.session.appId, 'spotify');
    assert.equal(spDone.session.payload.calendarState, undefined);
    passed += 1;
  }

  // Test 116: Contextual link follow-up for YouTube, Maps, and Spotify returns real official URLs
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const ytTask = parseNaturalCommand('Show me a yoga video.', 'en').task!;
    const ytDone = await runDemoExecution(ytTask, 'interactive_demo', demoCaps, 'en');
    const ytLink = parseContextualFollowUp(
      'Give me the link.',
      { task: ytTask, session: ytDone.session, selectedIndex: 0 },
      'en'
    );
    assert.equal(ytLink.matched, true);
    if (ytLink.matched) {
      assert.ok((ytLink.url || '').includes('youtube.com'));
    }

    const spTask = parseNaturalCommand('Search for Kannada songs.', 'en').task!;
    const spDone = await runDemoExecution(spTask, 'interactive_demo', demoCaps, 'en');
    const spLink = parseContextualFollowUp(
      'Send me the link.',
      { task: spTask, session: spDone.session, selectedIndex: 0 },
      'en'
    );
    assert.equal(spLink.matched, true);
    if (spLink.matched) {
      assert.ok((spLink.url || '').includes('open.spotify.com'));
    }
    passed += 1;
  }

  // Test 117 (Bug 1): Calendar month-day parsing & 3-turn scheduling ("30th November" -> "10 AM." -> "Project presentation.")
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const step1 = parseNaturalCommand(
      'Can you schedule a meeting in the calendar on 30th November?',
      'en'
    );
    assert.equal(step1.matched, true);
    assert.equal(step1.task?.application, 'Calendar');
    assert.equal(step1.task?.action, 'add_calendar_event');
    assert.equal(step1.task?.executionStatus, 'needs_info');
    assert.ok(step1.task?.calendarDraft?.date?.endsWith('-11-30'));
    assert.equal(step1.task?.calendarDraft?.needsTitle, true);
    assert.match(step1.replyText, /what time/i);

    // Must NOT be hijacked into unavailable_on_web in Interactive Demo Mode
    const prepDemo = prepareTaskForPlatform(step1.task!, demoCaps, 'en', 'interactive_demo');
    assert.equal(prepDemo.task.executionStatus, 'needs_info');
    assert.equal(prepDemo.replyOverride, undefined);

    // Real Browser Mode must honestly disclose browser limitation without claiming native calendar modification
    const prepReal = prepareTaskForPlatform(step1.task!, demoCaps, 'en', 'real_browser');
    assert.equal(prepReal.task.executionStatus, 'unavailable_on_web');
    assert.match(prepReal.replyOverride || '', /Interactive Demo Mode/i);

    // Turn 2: user gives time -> asks for meeting title
    const turn2 = resolveTaskContextTurn(
      '10 AM.',
      prepDemo.task,
      createDemoSessionForTask(prepDemo.task, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(turn2.outcome, 'advanced_needs_info');
    if (turn2.outcome === 'advanced_needs_info') {
      assert.equal(turn2.task.executionStatus, 'needs_info');
      assert.equal(turn2.task.calendarDraft?.time, '10:00 AM');
      assert.match(turn2.replyText, /name the meeting/i);

      // Turn 3: user gives title -> ready & executes immediately into demo Calendar
      const turn3 = resolveTaskContextTurn(
        'Project presentation.',
        turn2.task,
        turn2.session,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(turn3.outcome, 'advanced_needs_info');
      if (turn3.outcome === 'advanced_needs_info') {
        assert.equal(turn3.task.executionStatus, 'ready');
        assert.equal(turn3.executeImmediately, true);
        assert.equal(turn3.task.calendarDraft?.title, 'Project presentation');

        const calDone = await runDemoExecution(
          turn3.task,
          'interactive_demo',
          demoCaps,
          'en'
        );
        assert.equal(calDone.session.appId, 'calendar');
        assert.match(calDone.replyText, /Project presentation/i);
        assert.match(calDone.replyText, /10:00 AM/i);
        assert.match(calDone.replyText, /no real phone calendar/i);
      }
    }
    passed += 1;
  }

  // Test 118: Calendar inline store edit and voice edit_calendar_event action
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const edited = updateDemoCalendarEventInStore(
      'ev-1',
      { title: 'Doctor Follow-Up', time: '11:30 AM' },
      [
        {
          id: 'ev-1',
          title: 'Project presentation',
          date: '2026-11-30',
          time: '10:00 AM',
          simulated: true,
          createdAt: '2026-11-27T00:00:00.000Z',
        },
      ]
    );
    assert.equal(edited.updated?.title, 'Doctor Follow-Up');
    assert.equal(edited.updated?.time, '11:30 AM');

    const editCmd = parseNaturalCommand('Edit the meeting time to 11 AM.', 'en');
    assert.equal(editCmd.matched, true);
    assert.equal(editCmd.task?.action, 'edit_calendar_event');
    const editDone = await runDemoExecution(editCmd.task!, 'interactive_demo', demoCaps, 'en');
    assert.equal(editDone.session.appId, 'calendar');
    passed += 1;
  }

  // Test 119 (Bug 2): Generic continuation requests in EN/HI/KN never fall back to unsupported error or web search
  {
    const idleCont = resolveTaskContextTurn(
      'Continue with the browser supported task.',
      null,
      null,
      null,
      'real_browser',
      'en',
      'general'
    );
    assert.equal(idleCont.outcome, 'generic_continuation');
    if (idleCont.outcome === 'generic_continuation') {
      assert.match(idleCont.replyText, /no pending task/i);
    }

    const camTask = prepareTaskForPlatform(
      parseNaturalCommand('Open Camera.', 'en').task!,
      detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' }),
      'en',
      'real_browser'
    ).task;
    const unavailCont = resolveTaskContextTurn(
      'Continue with the browser supported task.',
      camTask,
      null,
      null,
      'real_browser',
      'en',
      'general'
    );
    assert.equal(unavailCont.outcome, 'generic_continuation');
    if (unavailCont.outcome === 'generic_continuation') {
      assert.match(unavailCont.replyText, /Interactive Demo Mode|search Google/i);
    }

    const ytPending = parseNaturalCommand('Open YouTube.', 'en').task!;
    const ytPrepared = prepareTaskForPlatform(
      ytPending,
      detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' }),
      'en',
      'real_browser'
    ).task;
    const pendingCont = resolveTaskContextTurn(
      'Continue with the browser supported task.',
      ytPrepared,
      null,
      null,
      'real_browser',
      'en',
      'general'
    );
    assert.equal(pendingCont.outcome, 'execute_pending');

    const hiCont = resolveTaskContextTurn(
      'ब्राउज़र समर्थित कार्य के साथ आगे बढ़ें',
      null,
      null,
      null,
      'real_browser',
      'hi',
      'general'
    );
    assert.equal(hiCont.outcome, 'generic_continuation');

    const knCont = resolveTaskContextTurn(
      'ಬ್ರೌಸರ್ ಬೆಂಬಲಿತ ಕಾರ್ಯವನ್ನು ಮುಂದುವರಿಸಿ',
      null,
      null,
      null,
      'real_browser',
      'kn',
      'general'
    );
    assert.equal(knCont.outcome, 'generic_continuation');
    passed += 1;
  }

  // Test 120 (Bug 3): General-mode correction guard after Maps search + accurate welfare name cleanup
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const mapsTask = parseNaturalCommand('Search for nearby pharmacy.', 'en').task!;
    const mapsDone = await runDemoExecution(mapsTask, 'interactive_demo', demoCaps, 'en');
    const lastCtx: LastTaskContext = {
      task: mapsDone.task,
      session: mapsDone.session,
      selectedIndex: 0,
    };

    // In general mode after Maps search, correction statement must NOT trigger welfare form or fabricate names
    const generalTurn = resolveTaskContextTurn(
      "No, it's not correct, my name is Ganesha Rao.",
      mapsDone.task,
      mapsDone.session,
      lastCtx,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(generalTurn.outcome, 'no_active_form_correction');
    if (generalTurn.outcome === 'no_active_form_correction') {
      assert.match(generalTurn.replyText, /no active welfare form/i);
    }

    // In welfare_form mode, fullName parsing strips rejection preamble cleanly without keeping junk words
    const welfareUpdate = parseVoiceInput(
      "No, it's not correct, my name is Ganesha Rao.",
      'fullName',
      EMPTY_APPLICATION_DATA
    );
    assert.equal(welfareUpdate.type, 'field_updated');
    if (welfareUpdate.type === 'field_updated') {
      assert.equal(welfareUpdate.field, 'fullName');
      assert.equal(welfareUpdate.value, 'Ganesha Rao');
    }
    passed += 1;
  }

  // Test 121 (Part 2): 9-step cross-task switching stability sequence
  {
    const demoCaps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });

    // 1. WhatsApp incomplete
    const t1 = parseNaturalCommand('Send a WhatsApp message.', 'en').task!;
    assert.equal(t1.executionStatus, 'needs_info');

    // 2. Cancel it
    const t2 = resolveTaskContextTurn(
      'Never mind, cancel that.',
      t1,
      createDemoSessionForTask(t1, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(t2.outcome, 'cancelled_pending');

    // 3. Open calculator
    const t3 = parseNaturalCommand('Open calculator.', 'en').task!;
    const d3 = await runDemoExecution(t3, 'interactive_demo', demoCaps, 'en');
    assert.equal(d3.session.appId, 'calculator');

    // 4. Calculate 250 + 350
    const t4 = parseNaturalCommand('Calculate 250 + 350.', 'en').task!;
    assert.equal(t4.mathResult, '600');
    const d4 = await runDemoExecution(t4, 'interactive_demo', demoCaps, 'en');
    assert.equal(d4.session.payload.calculatorState?.displayValue, '600');

    // 5. Search for nearby pharmacy
    const t5 = parseNaturalCommand('Search for nearby pharmacy.', 'en').task!;
    assert.equal(t5.executionStatus, 'awaiting_confirmation');
    const d5 = await runDemoExecution(t5, 'interactive_demo', demoCaps, 'en');
    assert.equal(d5.session.appId, 'maps');

    // 6. Open calendar
    const t6 = parseNaturalCommand('Open calendar.', 'en').task!;
    const d6 = await runDemoExecution(t6, 'interactive_demo', demoCaps, 'en');
    assert.equal(d6.session.appId, 'calendar');

    // 7. Schedule meeting on 30th November -> 10 AM -> Project presentation
    const t7 = parseNaturalCommand(
      'Can you schedule a meeting in the calendar on 30th November?',
      'en'
    ).task!;
    const step7a = advanceTaskConversation(t7, '10 AM.', 'en');
    assert.equal(step7a.task.executionStatus, 'needs_info');
    const step7b = advanceTaskConversation(step7a.task, 'Project presentation.', 'en');
    assert.equal(step7b.task.executionStatus, 'ready');
    const d7 = await runDemoExecution(step7b.task, 'interactive_demo', demoCaps, 'en');
    assert.equal(d7.session.appId, 'calendar');

    // 8. Open YouTube and search for Hanuman Chalisa
    const t8 = parseNaturalCommand('Open YouTube and search for Hanuman Chalisa.', 'en').task!;
    assert.equal(t8.application, 'YouTube');
    assert.equal(t8.target, 'Hanuman Chalisa');
    assert.equal(t8.executionStatus, 'awaiting_confirmation');
    const d8 = await runDemoExecution(t8, 'interactive_demo', demoCaps, 'en');
    assert.equal(d8.session.appId, 'youtube');
    passed += 1;
  }

  // Test 122 (Part 5): Accessible Slower Speech rate toggle in SpeechSessionController
  {
    const mock = createMockSpeechEnv();
    const ctrl = new SpeechSessionController({
      lang: 'en',
      env: mock.env,
      onFinalTranscript: () => {},
      onStateChange: () => {},
    });
    assert.equal(ctrl.getSnapshot().speechRate, 'normal');
    ctrl.speak('Hello there.');
    assert.equal(mock.spokenUtterances[0].rate, 0.92);

    ctrl.setSpeechRate('slow');
    assert.equal(ctrl.getSnapshot().speechRate, 'slow');
    ctrl.speak('Speaking slower now.');
    assert.equal(mock.spokenUtterances[1].rate, 0.74);

    ctrl.destroy();
    passed += 1;
  }

  // Test 123: Name confirmation negation fix ("No, it's not correct, my name is Ganesha Rao.") & multilingual core flow
  {
    assert.equal(
      parseConfirmationReply("No, it's not correct, my name is Ganesha Rao."),
      'reject'
    );
    assert.equal(parseConfirmationReply('Not right, change it'), 'reject');
    assert.equal(parseConfirmationReply('Yes, that is correct.'), 'confirm');

    const replacement = parseVoiceInput(
      "No, it's not correct, my name is Ganesha Rao.",
      'fullName',
      EMPTY_APPLICATION_DATA
    );
    assert.equal(replacement.type, 'field_updated');
    if (replacement.type === 'field_updated') {
      assert.equal(replacement.field, 'fullName');
      assert.equal(replacement.value, 'Ganesha Rao');
    }

    // Core flow multilingual parity (EN / HI / KN)
    const ytEn = parseNaturalCommand('Open YouTube and search for Hanuman Chalisa.', 'en');
    const ytHi = parseNaturalCommand('यूट्यूब खोलो', 'hi');
    const mapsKn = parseNaturalCommand('ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್ ತೆರೆಯಿರಿ', 'kn');
    const calcEn = parseNaturalCommand('Calculate 45 + 55.', 'en');
    const welfareEn = parseNaturalCommand('Help me fill out a welfare application.', 'en');
    const casualEn = parseNaturalCommand('Hello, how are you?', 'en');

    assert.equal(ytEn.task?.application, 'YouTube');
    assert.equal(ytHi.task?.application, 'YouTube');
    assert.equal(mapsKn.task?.application, 'Google Maps');
    assert.equal(calcEn.task?.mathResult, '100');
    assert.equal(welfareEn.webAction?.type, 'start_application');
    assert.equal(casualEn.task?.intent, 'general_conversation');
    passed += 1;
  }

  // Test 124: Natural-language YouTube intent recognition & encoded search URL execution
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const queries: Array<{ input: string; expectedSubstring: string }> = [
      {
        input: 'I would like you to open a YouTube video that helps me understand artificial intelligence jobs.',
        expectedSubstring: 'artificial intelligence jobs',
      },
      {
        input: 'Can you open a yoga video showing how to perform Surya Namaskara?',
        expectedSubstring: 'Surya Namaskara',
      },
      {
        input: 'Find a video explaining machine learning for beginners.',
        expectedSubstring: 'machine learning for beginners',
      },
      {
        input: 'Find a Surya Namaskara tutorial on YouTube.',
        expectedSubstring: 'Surya Namaskara tutorial',
      },
    ];

    for (const q of queries) {
      const parsed = parseNaturalCommand(q.input, 'en');
      assert.equal(parsed.matched, true, `Should match YouTube request: "${q.input}"`);
      assert.equal(parsed.task?.application, 'YouTube');
      assert.equal(parsed.task?.executionStatus, 'awaiting_confirmation');
      assert.ok(
        parsed.task?.target?.toLowerCase().includes(q.expectedSubstring.toLowerCase()),
        `Expected target "${parsed.task?.target}" to include "${q.expectedSubstring}"`
      );
      assert.ok(
        parsed.task?.externalUrl?.startsWith('https://www.youtube.com/results?search_query='),
        `Expected encoded YouTube search URL, got ${parsed.task?.externalUrl}`
      );
    }

    // Confirming with "Yes." executes and opens encoded search URL without falsely claiming a video played
    const suryaParsed = parseNaturalCommand('Find a Surya Namaskara tutorial on YouTube.', 'en');
    const suryaSession = createDemoSessionForTask(suryaParsed.task!, 'real_browser', 'en');
    const confirmTurn = resolveTaskContextTurn(
      'Yes.',
      suryaParsed.task!,
      suryaSession,
      null,
      'real_browser',
      'en',
      'general'
    );
    assert.equal(confirmTurn.outcome, 'execute_pending');

    const openedUrls: string[] = [];
    if (confirmTurn.outcome === 'execute_pending') {
      const prepped = prepareTaskForPlatform(confirmTurn.task, caps, 'en', 'real_browser');
      const exec = await executeConfirmedTask(prepped.task, caps, 'en', {
        openExternalUrl: (u) => {
          openedUrls.push(u);
          return true;
        },
        getCurrentPosition: async () => ({ error: 'unavailable' }),
      });
      assert.equal(openedUrls.length, 1);
      assert.equal(
        openedUrls[0],
        'https://www.youtube.com/results?search_query=Surya%20Namaskara%20tutorial'
      );
      assert.ok(/search results|results for/i.test(exec.replyText));
      assert.ok(!/now playing the video|started playing/i.test(exec.replyText));
    }
    passed += 1;
  }

  // Test 125: Pending Edit flow, conversation context preservation, and unrelated question escape
  {
    const waStart = parseNaturalCommand('Prepare a WhatsApp message for my brother.', 'en');
    assert.equal(waStart.matched, true);
    assert.equal(waStart.task?.executionStatus, 'needs_info');
    assert.equal(waStart.task?.target, 'my brother');

    const waSession = createDemoSessionForTask(waStart.task!, 'interactive_demo', 'en');
    const waWithBody = resolveTaskContextTurn(
      'Happy birthday, call me tonight.',
      waStart.task!,
      waSession,
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(waWithBody.outcome, 'advanced_needs_info');
    if (waWithBody.outcome === 'advanced_needs_info') {
      assert.equal(waWithBody.task.executionStatus, 'awaiting_confirmation');
      assert.equal(waWithBody.task.target, 'my brother');
      assert.equal(waWithBody.task.messageContent, 'Happy birthday, call me tonight.');

      // Say "Edit" while awaiting confirmation -> keeps my brother, asks for new message
      const editTurn = resolveTaskContextTurn(
        'Edit',
        waWithBody.task,
        waWithBody.session,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(editTurn.outcome, 'advanced_needs_info');
      if (editTurn.outcome === 'advanced_needs_info') {
        assert.equal(editTurn.task.executionStatus, 'needs_info');
        assert.equal(editTurn.task.target, 'my brother');
        assert.equal(editTurn.task.messageContent, null);

        const updatedTurn = resolveTaskContextTurn(
          'Call me at 8 PM.',
          editTurn.task,
          editTurn.session,
          null,
          'interactive_demo',
          'en',
          'general'
        );
        assert.equal(updatedTurn.outcome, 'advanced_needs_info');
        if (updatedTurn.outcome === 'advanced_needs_info') {
          assert.equal(updatedTurn.task.executionStatus, 'awaiting_confirmation');
          assert.equal(updatedTurn.task.messageContent, 'Call me at 8 PM.');
        }
      }

      // Unrelated question while awaiting confirmation must escape rather than stay trapped reprompting
      const unrelatedTurn = resolveTaskContextTurn(
        'Who are you?',
        waWithBody.task,
        waWithBody.session,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(unrelatedTurn.outcome, 'pass_to_new_command');
      if (unrelatedTurn.outcome === 'pass_to_new_command') {
        assert.equal(unrelatedTurn.abandonedPrevious, true);
      }
    }

    // Pending YouTube Edit -> prompts for new topic and updates search URL
    const ytStart = parseNaturalCommand('Find a Surya Namaskara tutorial on YouTube.', 'en');
    const ytEdit = resolveTaskContextTurn(
      'Edit',
      ytStart.task!,
      createDemoSessionForTask(ytStart.task!, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(ytEdit.outcome, 'advanced_needs_info');
    if (ytEdit.outcome === 'advanced_needs_info') {
      assert.equal(ytEdit.task.executionStatus, 'needs_info');
      const ytUpdated = resolveTaskContextTurn(
        'Pranayama breathing exercises',
        ytEdit.task,
        ytEdit.session,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(ytUpdated.outcome, 'advanced_needs_info');
      if (ytUpdated.outcome === 'advanced_needs_info') {
        assert.equal(ytUpdated.task.executionStatus, 'awaiting_confirmation');
        assert.equal(ytUpdated.task.target, 'Pranayama breathing exercises');
        assert.equal(
          ytUpdated.task.externalUrl,
          'https://www.youtube.com/results?search_query=Pranayama%20breathing%20exercises'
        );
      }
    }
    passed += 1;
  }

  // Test 126: Hindi & Kannada natural phrasing & word-order variations
  {
    const waHi1 = parseNaturalCommand('मेरे भाई को व्हाट्सएप मैसेज भेजना है।', 'hi');
    assert.equal(waHi1.matched, true);
    assert.equal(waHi1.task?.application, 'WhatsApp');
    assert.equal(waHi1.task?.target, 'भाई');
    assert.equal(waHi1.task?.executionStatus, 'needs_info');

    const waHi2 = parseNaturalCommand('मेरे भाई के लिए मैसेज तैयार करो।', 'hi');
    assert.equal(waHi2.matched, true);
    assert.equal(waHi2.task?.application, 'WhatsApp');
    assert.equal(waHi2.task?.target, 'भाई');

    const ytHi = parseNaturalCommand('यूट्यूब पर सूर्य नमस्कार का वीडियो दिखाओ।', 'hi');
    assert.equal(ytHi.matched, true);
    assert.equal(ytHi.task?.application, 'YouTube');
    assert.equal(ytHi.task?.target, 'सूर्य नमस्कार');
    assert.ok(ytHi.task?.externalUrl?.includes('youtube.com/results?search_query='));

    const waKn1 = parseNaturalCommand('ನನ್ನ ಅಣ್ಣನಿಗೆ ವಾಟ್ಸಾಪ್ ಮೆಸೇಜ್ ಕಳುಹಿಸಬೇಕು.', 'kn');
    assert.equal(waKn1.matched, true);
    assert.equal(waKn1.task?.application, 'WhatsApp');
    assert.equal(waKn1.task?.target, 'ಅಣ್ಣ');
    assert.equal(waKn1.task?.executionStatus, 'needs_info');

    const waKn2 = parseNaturalCommand('ನನ್ನ ಅಣ್ಣನಿಗೆ ಮೆಸೇಜ್ ತಯಾರಿಸಿ.', 'kn');
    assert.equal(waKn2.matched, true);
    assert.equal(waKn2.task?.application, 'WhatsApp');
    assert.equal(waKn2.task?.target, 'ಅಣ್ಣ');

    const ytKn = parseNaturalCommand('ಸೂರ್ಯ ನಮಸ್ಕಾರದ ವಿಡಿಯೋ ತೋರಿಸಿ.', 'kn');
    assert.equal(ytKn.matched, true);
    assert.equal(ytKn.task?.application, 'YouTube');
    assert.equal(ytKn.task?.target, 'ಸೂರ್ಯ ನಮಸ್ಕಾರ');
    assert.ok(ytKn.task?.externalUrl?.includes('youtube.com/results?search_query='));
    passed += 1;
  }

  // Test 127: Low-confidence speech detection & language preference preservation
  {
    const lowKn = detectSpokenLanguage('uhh hmm', { currentUiLang: 'kn' });
    assert.equal(lowKn.confidence, 'low');
    assert.equal(lowKn.shouldClarify, true);
    assert.equal(lowKn.uiResponseLang, 'kn');

    const lowHi = detectSpokenLanguage('...', { currentUiLang: 'hi' });
    assert.equal(lowHi.confidence, 'low');
    assert.equal(lowHi.shouldClarify, true);
    assert.equal(lowHi.uiResponseLang, 'hi');

    assert.match(buildLowConfidenceClarificationReply('en'), /repeat it slowly|language selector/i);
    assert.ok(buildLowConfidenceClarificationReply('hi').includes('भाषा'));
    assert.ok(buildLowConfidenceClarificationReply('kn').includes('ಭಾಷೆ'));
    passed += 1;
  }

  // Test 128: Personal name correction flows (full replacement, partial first name, split clause, rejection, spelling)
  {
    const firstEntry = parseVoiceInput('Tanisha Sunil.', 'fullName', EMPTY_APPLICATION_DATA);
    assert.equal(firstEntry.type, 'field_updated');
    if (firstEntry.type === 'field_updated') {
      assert.equal(firstEntry.value, 'Tanisha Sunil');
    }

    const noMyName = parseVoiceInput(
      'No, my name is Danisha Sunil.',
      'fullName',
      { ...EMPTY_APPLICATION_DATA, fullName: 'Tanisha Sunil' }
    );
    assert.equal(noMyName.type, 'field_updated');
    if (noMyName.type === 'field_updated') {
      assert.equal(noMyName.value, 'Danisha Sunil');
    }

    const changeFirst = parseVoiceInput(
      'Change my first name to Danisha.',
      'fullName',
      { ...EMPTY_APPLICATION_DATA, fullName: 'Tanisha Sunil' }
    );
    assert.equal(changeFirst.type, 'field_updated');
    if (changeFirst.type === 'field_updated') {
      assert.equal(changeFirst.value, 'Danisha Sunil');
    }

    const splitClause = parseVoiceInput(
      'The first name is Danisha and the second name is Sunil.',
      'fullName',
      EMPTY_APPLICATION_DATA
    );
    assert.equal(splitClause.type, 'field_updated');
    if (splitClause.type === 'field_updated') {
      assert.equal(splitClause.value, 'Danisha Sunil');
    }

    assert.equal(parseConfirmationReply('No, that is incorrect.'), 'reject');
    const bareReject = parseVoiceInput(
      'No, that is incorrect.',
      'fullName',
      { ...EMPTY_APPLICATION_DATA, fullName: 'Tanisha Sunil' }
    );
    assert.equal(bareReject.type, 'unrecognized');

    assert.equal(parseConfirmationReply('Spell my name.'), 'spell');
    passed += 1;
  }

  // Test 129: Unsupported native alarms (EN/HI/KN) & phone calls honestly distinguish browser demo vs Android
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const alarmInputs: Array<{ text: string; lang: 'en' | 'hi' | 'kn' }> = [
      { text: 'Set an alarm for 5 AM tomorrow.', lang: 'en' },
      { text: 'कल सुबह पांच बजे का अलार्म लगाना है।', lang: 'hi' },
      { text: 'ನಾಳೆ ಬೆಳಗ್ಗೆ ಐದು ಗಂಟೆಗೆ ಅಲಾರಂ ಇಡಬೇಕು.', lang: 'kn' },
    ];

    for (const item of alarmInputs) {
      const parsed = parseNaturalCommand(item.text, item.lang);
      assert.equal(parsed.matched, true, `Should match alarm request: ${item.text}`);
      assert.equal(parsed.task?.action, 'set_alarm');
      assert.equal(parsed.task?.executionStatus, 'unavailable_on_web');
      assert.ok(
        /Android|Calendar|कैलेंडर|ಕ್ಯಾಲೆಂಡರ್/i.test(parsed.replyText),
        `Expected honest Android/Calendar alternative explanation, got: ${parsed.replyText}`
      );

      // Even if passed into runDemoExecution, never fake-complete an alarm
      const exec = await runDemoExecution(parsed.task!, 'interactive_demo', caps, item.lang);
      assert.equal(exec.task.executionStatus, 'unavailable_on_web');
      assert.equal(exec.session.status, 'failed');
    }

    const callParsed = parseNaturalCommand('Make a phone call.', 'en');
    assert.equal(callParsed.matched, true);
    assert.equal(callParsed.task?.action, 'make_call');
    assert.equal(callParsed.task?.executionStatus, 'unavailable_on_web');
    assert.match(callParsed.replyText, /Android/i);
    passed += 1;
  }

  // Test 130: Exact regression reproduction — WhatsApp awaiting_confirmation replaced by Kannada alarm
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = formatIsoDate(tomorrow);

    // Turn 1: Prepare WhatsApp message for brother
    const startCmd = parseNaturalCommand('Can you prepare a WhatsApp message for my brother?', 'en');
    assert.equal(startCmd.matched, true);
    assert.equal(startCmd.task?.intent, 'messaging');
    assert.equal(startCmd.task?.executionStatus, 'needs_info');
    let activeTask = startCmd.task!;
    let demoSession = createDemoSessionForTask(activeTask, 'interactive_demo', 'en');

    // Turn 2: Provide message body -> WhatsApp enters awaiting_confirmation
    const msgTurn = resolveTaskContextTurn(
      'kya aap mere liye ek packet chips Le sakte hain',
      activeTask,
      demoSession,
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(msgTurn.outcome, 'advanced_needs_info');
    if (msgTurn.outcome === 'advanced_needs_info') {
      activeTask = prepareTaskForPlatform(msgTurn.task, caps, 'en', 'interactive_demo').task;
      demoSession = createDemoSessionForTask(activeTask, 'interactive_demo', 'en');
    }
    assert.equal(activeTask.intent, 'messaging');
    assert.equal(activeTask.target, 'my brother');
    assert.equal(activeTask.messageContent, 'kya aap mere liye ek packet chips Le sakte hain');
    assert.equal(activeTask.executionStatus, 'awaiting_confirmation');
    assert.equal(demoSession.status, 'waiting_for_confirmation');

    // Turn 3: Kannada alarm command arrives while WhatsApp is awaiting confirmation
    const alarmUtterance = 'ನೀವು ನನಗೆ ನಾಳೆ 5:00 ಗಂಟೆಗೆ ಅಲರಾಂ ಇಡಿರಿ';
    const ctxTurn = resolveTaskContextTurn(
      alarmUtterance,
      activeTask,
      demoSession,
      null,
      'interactive_demo',
      'kn',
      'general'
    );
    assert.equal(ctxTurn.outcome, 'pass_to_new_command');
    if (ctxTurn.outcome === 'pass_to_new_command') {
      assert.equal(ctxTurn.abandonedPrevious, true);
    }

    const pendingEval = evaluatePendingTaskTurn(
      alarmUtterance,
      activeTask,
      demoSession,
      'interactive_demo',
      'kn'
    );
    assert.equal(pendingEval.handled, false);
    assert.equal(pendingEval.action, 'none');

    // Parse & replace active task with alarm
    const alarmCmd = parseNaturalCommand(alarmUtterance, 'kn');
    assert.equal(alarmCmd.matched, true);
    assert.ok(alarmCmd.task);
    const preparedAlarm = prepareTaskForPlatform(
      alarmCmd.task!,
      caps,
      'kn',
      'interactive_demo'
    ).task;

    assert.equal(preparedAlarm.semanticIntent, 'SET_ALARM');
    assert.equal(preparedAlarm.action, 'set_alarm');
    assert.equal(preparedAlarm.application, 'Clock / Alarm');
    assert.equal(preparedAlarm.executionStatus, 'unavailable_on_web');
    assert.equal(preparedAlarm.messageContent, null);
    assert.equal(preparedAlarm.recipient, undefined);
    assert.equal(preparedAlarm.alarmDraft?.time, '05:00');
    assert.equal(preparedAlarm.alarmDraft?.date, tomorrowIso);
    assert.equal(preparedAlarm.alarmDraft?.dateLabel, 'tomorrow');
    assert.equal(preparedAlarm.alarmDraft?.period, 'morning');
    assert.ok(
      /ಕ್ಯಾಲೆಂಡರ್|Android/i.test(alarmCmd.replyText),
      `Expected honest Kannada explanation + Calendar alternative, got: ${alarmCmd.replyText}`
    );

    // Demo session helper must never report preparing_application or WhatsApp state for unavailable_on_web
    const alarmSession = createDemoSessionForTask(preparedAlarm, 'interactive_demo', 'kn');
    assert.equal(alarmSession.status, 'failed');
    assert.equal(alarmSession.appName, 'Clock / Alarm');
    assert.equal(alarmSession.payload.whatsAppState, undefined);
    passed += 1;
  }

  // Test 131: All natural Kannada, Hindi, and English alarm & wake-up variants extract SET_ALARM cleanly
  {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = formatIsoDate(tomorrow);

    const cases: Array<{
      text: string;
      lang: 'en' | 'hi' | 'kn';
      expectedTime: string | null;
      expectedDate: string | null;
      expectedPeriod: 'morning' | 'afternoon' | 'evening' | 'night' | null;
    }> = [
      {
        text: 'ನೀವು ನನಗೆ ನಾಳೆ 5:00 ಗಂಟೆಗೆ ಅಲರಾಂ ಇಡಿರಿ',
        lang: 'kn',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'ನಾಳೆ ಬೆಳಗ್ಗೆ ಐದು ಗಂಟೆಗೆ ಅಲಾರಂ ಇಡಿ',
        lang: 'kn',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'ನನಗೆ ಬೆಳಗ್ಗೆ 5 ಗಂಟೆಗೆ ಅಲಾರಂ ಬೇಕು',
        lang: 'kn',
        expectedTime: '05:00',
        expectedDate: null,
        expectedPeriod: 'morning',
      },
      {
        text: 'ನಾಳೆ ಐದು ಗಂಟೆಗೆ ನನ್ನನ್ನು ಎಬ್ಬಿಸಿ',
        lang: 'kn',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'ಅಲಾರಂ ಸೆಟ್ ಮಾಡಿ',
        lang: 'kn',
        expectedTime: null,
        expectedDate: null,
        expectedPeriod: null,
      },
      {
        text: 'कल सुबह 5 बजे अलार्म लगाओ',
        lang: 'hi',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'कल सुबह पांच बजे जगा दो',
        lang: 'hi',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'Set an alarm for tomorrow at 5:00 AM',
        lang: 'en',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
      {
        text: 'Wake me up tomorrow at 5 AM',
        lang: 'en',
        expectedTime: '05:00',
        expectedDate: tomorrowIso,
        expectedPeriod: 'morning',
      },
    ];

    for (const c of cases) {
      const parsed = parseNaturalCommand(c.text, c.lang);
      assert.equal(parsed.matched, true, `Expected match for: ${c.text}`);
      assert.equal(parsed.task?.semanticIntent, 'SET_ALARM', `Expected SET_ALARM for: ${c.text}`);
      assert.equal(parsed.task?.action, 'set_alarm');
      assert.equal(parsed.task?.executionStatus, 'unavailable_on_web');
      assert.notEqual(parsed.task?.intent, 'messaging');
      assert.notEqual(parsed.task?.intent, 'application_task');
      assert.equal(parsed.task?.alarmDraft?.time, c.expectedTime, `Time mismatch for: ${c.text}`);
      assert.equal(parsed.task?.alarmDraft?.date, c.expectedDate, `Date mismatch for: ${c.text}`);
      assert.equal(parsed.task?.alarmDraft?.period, c.expectedPeriod, `Period mismatch for: ${c.text}`);
    }
    passed += 1;
  }

  // Test 132: YouTube, Maps, Calculator & multilingual new commands supersede pending WhatsApp (never hijacked as confirmation)
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const waTask = prepareTaskForPlatform(
      parseNaturalCommand('Send a WhatsApp message to my brother saying Bring chips', 'en').task!,
      caps,
      'en',
      'interactive_demo'
    ).task;
    const waSession = createDemoSessionForTask(waTask, 'interactive_demo', 'en');
    assert.equal(waTask.executionStatus, 'awaiting_confirmation');

    const interruptingCommands: Array<{ text: string; lang: 'en' | 'hi' | 'kn'; expectedApp: string }> = [
      { text: 'Please open YouTube.', lang: 'en', expectedApp: 'YouTube' },
      { text: 'Can you open a yoga video showing how to perform Surya Namaskara?', lang: 'en', expectedApp: 'YouTube' },
      { text: 'यूट्यूब खोल दो', lang: 'hi', expectedApp: 'YouTube' },
      { text: 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್ ತೆರೆಯಿರಿ', lang: 'kn', expectedApp: 'Google Maps' },
      { text: 'Calculate 250 + 350', lang: 'en', expectedApp: 'Calculator' },
      { text: 'ಸರಿ, ನಾಳೆ 5 ಗಂಟೆಗೆ ಅಲರಾಂ ಇಡಿ', lang: 'kn', expectedApp: 'Clock / Alarm' },
      { text: 'No, open YouTube', lang: 'en', expectedApp: 'YouTube' },
    ];

    for (const item of interruptingCommands) {
      assert.equal(
        classifyPendingConfirmationReply(item.text),
        null,
        `Confirmation classifier must NOT hijack: ${item.text}`
      );
      const turn = resolveTaskContextTurn(
        item.text,
        waTask,
        waSession,
        null,
        'interactive_demo',
        item.lang,
        'general'
      );
      assert.equal(turn.outcome, 'pass_to_new_command', `Expected task replacement for: ${item.text}`);
      if (turn.outcome === 'pass_to_new_command') {
        assert.equal(turn.abandonedPrevious, true);
      }
      const parsed = parseNaturalCommand(item.text, item.lang);
      assert.equal(parsed.matched, true, `Expected new command match for: ${item.text}`);
      assert.equal(parsed.task?.application, item.expectedApp, `Expected app ${item.expectedApp} for: ${item.text}`);
    }
    passed += 1;
  }

  // Test 133: Explicit Yes / No confirmations still execute or cancel pending WhatsApp cleanly (EN / HI / KN)
  {
    const caps = detectPlatformCapabilities({ userAgent: 'Chrome/126.0', platform: 'Win32' });
    const waTask = prepareTaskForPlatform(
      parseNaturalCommand('Send a WhatsApp message to my brother saying Bring chips', 'en').task!,
      caps,
      'en',
      'interactive_demo'
    ).task;
    const waSession = createDemoSessionForTask(waTask, 'interactive_demo', 'en');

    for (const yesReply of ['Yes', 'Yes, please', 'ಹೌದು', 'हाँ']) {
      const turn = resolveTaskContextTurn(
        yesReply,
        waTask,
        waSession,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(turn.outcome, 'execute_pending', `Expected execute_pending for "${yesReply}"`);
    }

    for (const noReply of ['No', 'Cancel', 'ಬೇಡ', 'नहीं']) {
      const turn = resolveTaskContextTurn(
        noReply,
        waTask,
        waSession,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(turn.outcome, 'cancelled_pending', `Expected cancelled_pending for "${noReply}"`);
    }
    passed += 1;
  }

  // Test 134: Genuine clarification answers preserve active needs_info task slots while new commands abandon them
  {
    // 1. WhatsApp recipient -> message slot preserved
    const step1 = parseNaturalCommand('Prepare a WhatsApp message', 'en').task!;
    assert.equal(step1.executionStatus, 'needs_info');
    const step2 = resolveTaskContextTurn(
      'My brother',
      step1,
      createDemoSessionForTask(step1, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(step2.outcome, 'advanced_needs_info');
    if (step2.outcome === 'advanced_needs_info') {
      assert.equal(step2.task.intent, 'messaging');
      assert.equal(step2.task.target, 'My brother');
      assert.equal(step2.task.executionStatus, 'needs_info');

      // 2. Providing message body keeps recipient & moves to awaiting_confirmation
      const step3 = resolveTaskContextTurn(
        'Please pick up a packet of chips',
        step2.task,
        step2.session,
        null,
        'interactive_demo',
        'en',
        'general'
      );
      assert.equal(step3.outcome, 'advanced_needs_info');
      if (step3.outcome === 'advanced_needs_info') {
        assert.equal(step3.task.target, 'My brother');
        assert.equal(step3.task.messageContent, 'Please pick up a packet of chips');
        assert.equal(step3.task.executionStatus, 'awaiting_confirmation');
      }
    }

    // 3. Calendar clarification keeps Calendar task, while switching to alarm abandons it
    const calAsk = parseNaturalCommand('Schedule my doctor appointment for tomorrow', 'en').task!;
    assert.equal(calAsk.application, 'Calendar');
    assert.equal(calAsk.executionStatus, 'needs_info');
    const calTimeReply = resolveTaskContextTurn(
      '10 AM',
      calAsk,
      createDemoSessionForTask(calAsk, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'en',
      'general'
    );
    assert.equal(calTimeReply.outcome, 'advanced_needs_info');
    if (calTimeReply.outcome === 'advanced_needs_info') {
      assert.equal(calTimeReply.task.application, 'Calendar');
      assert.equal(calTimeReply.task.calendarDraft?.time, '10:00 AM');
      assert.equal(calTimeReply.task.executionStatus, 'ready');
    }

    const switchDuringNeedsInfo = resolveTaskContextTurn(
      'ನಾಳೆ ಬೆಳಗ್ಗೆ ಐದು ಗಂಟೆಗೆ ಅಲಾರಂ ಇಡಿ',
      calAsk,
      createDemoSessionForTask(calAsk, 'interactive_demo', 'en'),
      null,
      'interactive_demo',
      'kn',
      'general'
    );
    assert.equal(switchDuringNeedsInfo.outcome, 'pass_to_new_command');
    passed += 1;
  }

  console.log(`SAHAAYA TEST SUITE PASSED: ${passed}/134 scenarios verified.`);
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});

