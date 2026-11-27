import { useCallback, useEffect, useRef, useState } from 'react';
import { ExecutionModeToggle } from './components/ExecutionModeToggle';
import { TopBar } from './components/TopBar';
import { useSpeechAssistant } from './hooks/useSpeechAssistant';
import { APPLICATION_FIELD_ORDER, TRANSLATIONS } from './i18n/translations';
import { ApplicationFormScreen } from './screens/ApplicationFormScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { VoiceAssistantScreen } from './screens/VoiceAssistantScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DemoExecutionSession } from './types/demoExecution';
import {
  ApplicationData,
  ApplicationFieldKey,
  AssistantTask,
  ChatMessage,
  ConversationMode,
  ExecutionMode,
  LanguageCode,
  PendingConfirmation,
  ScreenId,
  TextScale,
} from './types/sahaaya';
import {
  EMPTY_APPLICATION_DATA,
  formatDisplayValue,
  formatSpelledName,
  formatValueForSpeech,
  generateConfirmationNumber,
  getCompletionStats,
  getNextMissingField,
  parseConfirmationReply,
  parseSpelledInput,
  parseVoiceInput,
  requiresExplicitConfirmation,
  validateField,
} from './utils/applicationLogic';
import {
  advanceTaskConversation,
  buildGeneralFallbackResponse,
  classifyPendingConfirmationReply,
  CommandParseResult,
  parseNaturalCommand,
} from './utils/commandIntentEngine';
import { DEMO_APP_REGISTRY, resolveDemoAppId } from './utils/demoAppRegistry';
import {
  advanceDemoSimulatorPhase,
  buildDemoConfirmationPrompt,
  cancelDemoSession,
  createDemoSessionForTask,
  getSimulatorTimeline,
  runDemoExecution,
} from './utils/demoExecutionEngine';
import {
  buildApplicationReadout,
  buildMissingFieldsExplanation,
  prepareTaskForPlatform,
} from './utils/platformExecutor';
import {
  LastTaskContext,
  resolveTaskContextTurn,
} from './utils/conversationTaskManager';

const STORAGE_KEY = 'sahaaya_prototype_state_v1';

interface SavedPreferences {
  language?: LanguageCode;
  textScale?: TextScale;
}

function loadSavedPreferences(): SavedPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedPreferences;
    return {
      language: parsed.language,
      textScale: parsed.textScale,
    };
  } catch {
    return {};
  }
}

function formatNowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const initialPrefs = loadSavedPreferences();

  const [language, setLanguage] = useState<LanguageCode>(initialPrefs.language || 'en');
  const [textScale, setTextScale] = useState<TextScale>(initialPrefs.textScale || 'a');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('welcome');
  const [data, setData] = useState<ApplicationData>(() => ({
    ...EMPTY_APPLICATION_DATA,
  }));
  const [activeField, setActiveField] = useState<ApplicationFieldKey>('fullName');
  const [focusedFormField, setFocusedFormField] = useState<ApplicationFieldKey | null>(null);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('interactive_demo');
  const [conversationMode, setConversationMode] = useState<ConversationMode>('general');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [activeTask, setActiveTask] = useState<AssistantTask | null>(null);
  const [demoSession, setDemoSession] = useState<DemoExecutionSession | null>(null);
  const [lastTaskContext, setLastTaskContext] = useState<LastTaskContext | null>(null);
  const [recentUpdatedField, setRecentUpdatedField] =
    useState<ApplicationFieldKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'assistant',
      text: TRANSLATIONS[initialPrefs.language || 'en'].assistant.initialGreeting,
      timestamp: formatNowTime(),
    },
  ]);

  const [confirmationNumber, setConfirmationNumber] = useState<string>('');
  const [submittedAt, setSubmittedAt] = useState<string>('');
  const demoTimersRef = useRef<number[]>([]);

  // Refs for latest state inside speech callback
  const stateRef = useRef({
    language,
    data,
    activeField,
    executionMode,
    conversationMode,
    messages,
    pendingConfirmation,
    activeTask,
    demoSession,
    lastTaskContext,
    currentScreen,
    previousScreen,
  });
  stateRef.current = {
    language,
    data,
    activeField,
    executionMode,
    conversationMode,
    messages,
    pendingConfirmation,
    activeTask,
    demoSession,
    lastTaskContext,
    currentScreen,
    previousScreen,
  };

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach((id) => window.clearTimeout(id));
    demoTimersRef.current = [];
  }, []);

  useEffect(() => () => clearDemoTimers(), [clearDemoTimers]);

  // Apply A / A+ / A++ text scale class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('scale-a', 'scale-a-plus', 'scale-a-plus-plus');
    if (textScale === 'a+') root.classList.add('scale-a-plus');
    else if (textScale === 'a++') root.classList.add('scale-a-plus-plus');
    else root.classList.add('scale-a');
  }, [textScale]);

  // Persist language & text-scale preferences safely without pre-filling personal form fields on startup
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ language, textScale })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [language, textScale]);

  const appendMessage = useCallback(
    (sender: 'assistant' | 'user', text: string, fieldHint?: ApplicationFieldKey) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender,
          text,
          timestamp: formatNowTime(),
          fieldHint,
        },
      ]);
    },
    []
  );

  // Forward declaration via ref so useSpeechAssistant can trigger handleUserInput
  const processInputRef = useRef<(input: string) => void>(() => {});

  const speech = useSpeechAssistant(language, (finalTranscript) => {
    processInputRef.current(finalTranscript);
  });

  const commitConfirmedField = useCallback(
    (
      field: ApplicationFieldKey,
      value: string,
      curData: ApplicationData,
      curLang: LanguageCode
    ) => {
      const t = TRANSLATIONS[curLang];
      const updatedData: ApplicationData = {
        ...curData,
        [field]: value,
      };
      setData(updatedData);
      setPendingConfirmation(null);
      setRecentUpdatedField(field);
      window.setTimeout(() => {
        setRecentUpdatedField((prev) => (prev === field ? null : prev));
      }, 2200);

      const formattedVal = formatDisplayValue(field, value, curLang);
      const ack = t.assistant.updatedFieldReply(t.fields[field].label, formattedVal);
      const nextMissing = getNextMissingField(updatedData);

      const syntheticTask: AssistantTask = {
        id: `welfare-${Date.now()}`,
        rawInstruction: `${t.fields[field].label}: ${formattedVal}`,
        intent: 'application_task',
        application: 'Sahaaya Welfare Application',
        action: 'populate_field',
        target: t.fields[field].label,
        messageContent: null,
        requiredParameters: [],
        missingParameters: [],
        confirmationRequired: false,
        executionStatus: 'simulated_completed',
      };
      clearDemoTimers();
      setActiveTask(syntheticTask);
      const formSession = createDemoSessionForTask(
        syntheticTask,
        stateRef.current.executionMode,
        curLang,
        {
          applicationData: updatedData,
          activeField: nextMissing || field,
        }
      );
      setDemoSession({
        ...formSession,
        status: 'simulated_completion',
        resultSummary: ack,
      });

      if (nextMissing) {
        setActiveField(nextMissing);
        const nextPrompt = t.fields[nextMissing].voicePrompt;
        const fullReply = `${ack} ${nextPrompt}`;
        appendMessage('assistant', fullReply, nextMissing);
        speech.speak(fullReply, curLang);
      } else {
        const doneReply = `${ack} ${t.assistant.allFieldsDonePrompt}`;
        appendMessage('assistant', doneReply);
        speech.speak(doneReply, curLang);
      }
    },
    [appendMessage, clearDemoTimers, speech]
  );

  const askForConfirmation = useCallback(
    (field: ApplicationFieldKey, value: string, curLang: LanguageCode) => {
      const t = TRANSLATIONS[curLang];
      setPendingConfirmation({
        field,
        value,
        mode: 'confirm',
        spelledTokens: [],
      });

      const spokenVal = formatValueForSpeech(field, value, curLang);
      const prompt =
        field === 'fullName'
          ? t.assistant.confirmCard.nameReadbackPrompt(spokenVal)
          : t.assistant.confirmCard.detailReadbackPrompt(
              t.fields[field].label,
              spokenVal
            );
      appendMessage('assistant', prompt, field);
      speech.speak(prompt, curLang);
    },
    [appendMessage, speech]
  );

  const executeWebCommandAction = useCallback(
    (
      cmdResult: CommandParseResult,
      curLang: LanguageCode,
      curData: ApplicationData,
      curMessages: ChatMessage[],
      curField: ApplicationFieldKey
    ) => {
      const t = TRANSLATIONS[curLang];
      const action = cmdResult.webAction;
      if (!action) {
        if (cmdResult.replyText) {
          appendMessage('assistant', cmdResult.replyText);
          speech.speak(cmdResult.replyText, curLang);
        }
        return;
      }

      switch (action.type) {
        case 'go_home':
          speech.endConversation();
          setPreviousScreen(stateRef.current.currentScreen);
          setCurrentScreen('welcome');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'go_back':
          speech.endConversation();
          setCurrentScreen(stateRef.current.previousScreen || 'welcome');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'scroll_down':
          window.scrollBy({ top: 380, behavior: 'smooth' });
          appendMessage('assistant', cmdResult.replyText);
          speech.speak(cmdResult.replyText, curLang);
          break;
        case 'scroll_up':
          window.scrollBy({ top: -380, behavior: 'smooth' });
          appendMessage('assistant', cmdResult.replyText);
          speech.speak(cmdResult.replyText, curLang);
          break;
        case 'review_application':
          speech.endConversation();
          setPreviousScreen(stateRef.current.currentScreen);
          setCurrentScreen('review');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'open_form':
          speech.endConversation();
          setPreviousScreen(stateRef.current.currentScreen);
          setCurrentScreen('form');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'start_application':
        case 'continue_application': {
          setConversationMode('welfare_form');
          const nextField = getNextMissingField(curData) || 'fullName';
          setActiveField(nextField);
          if (cmdResult.task) {
            const welfareSession = createDemoSessionForTask(
              cmdResult.task,
              stateRef.current.executionMode,
              curLang,
              { applicationData: curData, activeField: nextField }
            );
            setDemoSession(welfareSession);
          }
          const stats = getCompletionStats(curData);
          const prompt =
            stats.filledCount === stats.totalCount
              ? t.assistant.allFieldsDonePrompt
              : `${t.form.progressText(stats.filledCount, stats.totalCount)}. ${t.fields[nextField].voicePrompt}`;
          appendMessage('assistant', prompt, nextField);
          speech.speak(prompt, curLang);
          break;
        }
        case 'read_screen': {
          if (stateRef.current.conversationMode === 'welfare_form') {
            const stats = getCompletionStats(curData);
            const summary = `You are on the Sahaaya Voice Assistant screen filling out the welfare application. ${t.form.progressText(stats.filledCount, stats.totalCount)}. The current question is: ${t.fields[curField].voicePrompt}`;
            appendMessage('assistant', summary, curField);
            speech.speak(summary, curLang);
          } else {
            const summary =
              curLang === 'hi'
                ? 'आप सहाय सामान्य आवाज़ सहायक स्क्रीन पर हैं। आप बातचीत शुरू करें दबाकर बोल सकते हैं, नीचे टाइप कर सकते हैं, वेबसाइट खोलने, खोजने, संदेश तैयार करने या फ़ॉर्म भरने के लिए कह सकते हैं।'
                : curLang === 'kn'
                  ? 'ನೀವು ಸಹಾಯ ಸಾಮಾನ್ಯ ಧ್ವನಿ ಸಹಾಯಕ ಪರದೆಯಲ್ಲಿದ್ದೀರಿ. ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ ಒತ್ತಿ ಮಾತನಾಡಬಹುದು, ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಬಹುದು, ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಲು, ಹುಡುಕಲು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಲು ಅಥವಾ ಫಾರ್ಮ್ ಭರ್ತಿ ಮಾಡಲು ಕೇಳಬಹುದು.'
                  : 'You are on the Sahaaya Voice Assistant screen. You can tap Start Conversation to speak or type below to open websites like YouTube, search nearby places, prepare a WhatsApp message, or help fill a form.';
            appendMessage('assistant', summary);
            speech.speak(summary, curLang);
          }
          break;
        }
        case 'explain_page': {
          const explanation =
            curLang === 'hi'
              ? 'यह सहाय आवाज़ सहायक पृष्ठ है। यहाँ आप बोलकर या लिखकर वेबसाइट खोल सकते हैं, नज़दीकी जानकारी खोज सकते हैं, संदेश तैयार कर सकते हैं, दाईं ओर पहचाना गया कार्य देख सकते हैं या कल्याण फ़ॉर्म खोल सकते हैं।'
              : curLang === 'kn'
                ? 'ಇದು ಸಹಾಯ ಧ್ವನಿ ಸಹಾಯಕ ಪುಟ. ಇಲ್ಲಿ ನೀವು ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ ವೆಬ್‌ಸೈಟ್ ತೆರೆಯಬಹುದು, ಮಾಹಿತಿ ಹುಡುಕಬಹುದು, ಸಂದೇಶ ಸಿದ್ಧಪಡಿಸಬಹುದು, ಬಲಭಾಗದಲ್ಲಿ ಗುರುತಿಸಿದ ಕಾರ್ಯ ನೋಡಬಹುದು ಅಥವಾ ಕಲ್ಯಾಣ ಫಾರ್ಮ್ ತೆರೆಯಬಹುದು.'
                : 'This is the Sahaaya Voice Assistant screen. You can tap Start Conversation to speak hands-free or type below to open websites, search, prepare messages, view the detected task on the side, or open the optional welfare form anytime.';
          appendMessage('assistant', explanation);
          speech.speak(explanation, curLang);
          break;
        }
        case 'read_latest_message': {
          const latest = [...curMessages].reverse()[0];
          const msgText = latest
            ? `The latest message from ${latest.sender === 'assistant' ? 'Sahaaya' : 'you'} says: ${latest.text}`
            : 'There are no messages yet.';
          appendMessage('assistant', msgText);
          speech.speak(msgText, curLang);
          break;
        }
        case 'read_application': {
          const summary = buildApplicationReadout(curData, curLang);
          appendMessage('assistant', summary);
          speech.speak(summary, curLang);
          break;
        }
        case 'explain_missing_fields': {
          const explanation = buildMissingFieldsExplanation(curData, curLang);
          appendMessage('assistant', explanation);
          speech.speak(explanation, curLang);
          break;
        }
        case 'explain_controls': {
          const controlsMsg =
            'The large microphone button starts or ends your continuous voice conversation. Repeat reads the last message again, Stop pauses speaking and listening, Help lists examples you can try, and View Welfare Form opens the optional application form.';
          appendMessage('assistant', controlsMsg);
          speech.speak(controlsMsg, curLang);
          break;
        }
      }
    },
    [appendMessage, speech]
  );

  const runPlatformExecution = useCallback(
    async (taskToRun: AssistantTask, curLang: LanguageCode) => {
      clearDemoTimers();
      if (taskToRun.intent !== 'application_task') {
        setConversationMode('general');
        setPendingConfirmation(null);
      }
      const curExecMode = stateRef.current.executionMode;
      const appId = resolveDemoAppId(taskToRun);
      const executingTask: AssistantTask = {
        ...taskToRun,
        executionStatus: 'executing',
      };
      setActiveTask(executingTask);
      setIsProcessing(true);

      try {
        if (curExecMode === 'interactive_demo') {
          const initial = createDemoSessionForTask(executingTask, curExecMode, curLang, {
            applicationData: stateRef.current.data,
            activeField: stateRef.current.activeField,
          });
          const timeline = getSimulatorTimeline(appId);
          const firstStage = timeline[0];
          setDemoSession(
            firstStage
              ? advanceDemoSimulatorPhase(
                  initial,
                  firstStage.simPhase,
                  firstStage.status,
                  curLang
                )
              : initial
          );

          timeline.slice(1).forEach((stage) => {
            const timerId = window.setTimeout(() => {
              setDemoSession((prev) =>
                prev && prev.status !== 'cancelled'
                  ? advanceDemoSimulatorPhase(
                      prev,
                      stage.simPhase,
                      stage.status,
                      curLang
                    )
                  : prev
              );
            }, stage.delayMs);
            demoTimersRef.current.push(timerId);
          });

          const finalRes = await runDemoExecution(
            executingTask,
            curExecMode,
            speech.platformCapabilities,
            curLang
          );

          const lastDelay =
            timeline.length > 0 ? timeline[timeline.length - 1].delayMs : 500;
          const finishTimerId = window.setTimeout(() => {
            setActiveTask(finalRes.task);
            setDemoSession(finalRes.session);
            setLastTaskContext({
              task: finalRes.task,
              session: finalRes.session,
              selectedIndex: 0,
            });
            if (finalRes.replyText) {
              appendMessage('assistant', finalRes.replyText);
              speech.speak(finalRes.replyText, curLang);
            } else {
              speech.finishProcessingWithoutSpeech();
            }
            setIsProcessing(false);
          }, lastDelay + 650);
          demoTimersRef.current.push(finishTimerId);
          return;
        }

        const result = await runDemoExecution(
          executingTask,
          curExecMode,
          speech.platformCapabilities,
          curLang
        );
        setActiveTask(result.task);
        setDemoSession(result.session);
        setLastTaskContext({
          task: result.task,
          session: result.session,
          selectedIndex: 0,
        });
        if (result.replyText) {
          appendMessage('assistant', result.replyText);
          speech.speak(result.replyText, curLang);
        } else {
          speech.finishProcessingWithoutSpeech();
        }
        setIsProcessing(false);
      } catch {
        setIsProcessing(false);
      }
    },
    [appendMessage, clearDemoTimers, speech]
  );

  const handleUserInput = useCallback(
    (rawInput: string) => {
      const cleaned = rawInput.trim();
      if (!cleaned) return;

      const {
        language: curLang,
        data: curData,
        activeField: curField,
        executionMode: curExecMode,
        pendingConfirmation: curPending,
        activeTask: curTask,
        demoSession: curDemoSession,
        lastTaskContext: curLastContext,
        messages: curMessages,
      } = stateRef.current;
      const t = TRANSLATIONS[curLang];

      appendMessage('user', cleaned);
      setIsProcessing(true);
      speech.pauseListeningForProcessing();

      setTimeout(() => {
        // Branch 1A: Unified deterministic task & context state-machine arbiter
        if (!curPending) {
          const turn = resolveTaskContextTurn(
            cleaned,
            curTask,
            curDemoSession,
            curLastContext,
            curExecMode,
            curLang,
            stateRef.current.conversationMode
          );

          if (turn.outcome === 'generic_continuation') {
            appendMessage('assistant', turn.replyText);
            speech.speak(turn.replyText, curLang);
            setIsProcessing(false);
            return;
          }

          if (turn.outcome === 'no_active_form_correction') {
            appendMessage('assistant', turn.replyText);
            speech.speak(turn.replyText, curLang);
            setIsProcessing(false);
            return;
          }

          if (turn.outcome === 'cancelled_pending') {
            clearDemoTimers();
            setActiveTask(turn.task);
            setDemoSession(turn.session);
            appendMessage('assistant', turn.replyText);
            speech.speak(turn.replyText, curLang);
            setIsProcessing(false);
            return;
          }

          if (turn.outcome === 'updated_whatsapp_draft') {
            clearDemoTimers();
            setActiveTask(turn.task);
            setDemoSession(turn.session);
            appendMessage('assistant', turn.replyText);
            speech.speak(turn.replyText, curLang);
            setIsProcessing(false);
            return;
          }

          if (turn.outcome === 'execute_pending') {
            void runPlatformExecution(turn.task, curLang);
            return;
          }

          if (turn.outcome === 'reprompt_pending') {
            appendMessage('assistant', turn.replyText);
            speech.speak(turn.replyText, curLang);
            setIsProcessing(false);
            return;
          }

          if (turn.outcome === 'advanced_needs_info') {
            if (turn.executeImmediately) {
              void runPlatformExecution(turn.task, curLang);
              return;
            }
            const prepared =
              turn.task.executionStatus === 'awaiting_confirmation'
                ? prepareTaskForPlatform(
                    turn.task,
                    speech.platformCapabilities,
                    curLang,
                    curExecMode
                  )
                : { task: turn.task, replyOverride: undefined };
            setActiveTask(prepared.task);
            setDemoSession(
              createDemoSessionForTask(prepared.task, curExecMode, curLang, {
                applicationData: curData,
                activeField: curField,
              })
            );
            const demoPrompt = buildDemoConfirmationPrompt(
              prepared.task,
              curExecMode,
              curLang
            );
            const finalReply = demoPrompt || prepared.replyOverride || turn.replyText;
            if (finalReply) {
              appendMessage('assistant', finalReply);
              speech.speak(finalReply, curLang);
              setIsProcessing(false);
              return;
            }
          }

          if (turn.outcome === 'contextual_follow_up') {
            clearDemoTimers();
            const res = turn.result;
            if (res.updatedContext) {
              setLastTaskContext(res.updatedContext);
              setActiveTask(res.updatedContext.task);
              setDemoSession(res.updatedContext.session);
            } else if (res.newTask) {
              setActiveTask(res.newTask);
              setDemoSession(
                createDemoSessionForTask(res.newTask, curExecMode, curLang, {
                  applicationData: curData,
                  activeField: curField,
                })
              );
            }
            appendMessage('assistant', res.replyText);
            speech.speak(res.replyText, curLang);
            setIsProcessing(false);
            return;
          }
        }

        // Global stop/end intent works when no task confirmation is pending
        const quickIntent = parseVoiceInput(cleaned, curField, curData);
        if (quickIntent.type === 'intent' && quickIntent.intent === 'stop') {
          speech.endConversation();
          appendMessage('assistant', t.assistant.endedMessage);
          setIsProcessing(false);
          return;
        }

        // Branch 1B: Handling an active Pending Confirmation for a Welfare Field (Name, Mobile, DOB, Income)
        if (curPending) {
          if (curPending.mode === 'spell') {
            const spellResult = parseSpelledInput(cleaned, curPending.spelledTokens);
            if (spellResult.action === 'done') {
              const finalName = curPending.value.trim();
              if (finalName.length >= 2) {
                askForConfirmation('fullName', finalName, curLang);
              } else {
                const msg = t.fields.fullName.errorInvalid;
                appendMessage('assistant', msg, 'fullName');
                speech.speak(msg, curLang);
              }
              setIsProcessing(false);
              return;
            }
            if (spellResult.action === 'clear') {
              setPendingConfirmation({
                ...curPending,
                value: '',
                spelledTokens: [],
              });
              speech.finishProcessingWithoutSpeech();
              setIsProcessing(false);
              return;
            }
            if (spellResult.action === 'update') {
              setPendingConfirmation({
                ...curPending,
                value: spellResult.constructedName,
                spelledTokens: spellResult.tokens,
              });
              speech.finishProcessingWithoutSpeech();
              setIsProcessing(false);
              return;
            }
            const hint = t.assistant.confirmCard.spellingHint;
            appendMessage('assistant', hint, 'fullName');
            speech.speak(hint, curLang);
            setIsProcessing(false);
            return;
          }

          if (curPending.mode === 'confirm') {
            const replyIntent = parseConfirmationReply(cleaned);
            if (replyIntent === 'confirm') {
              commitConfirmedField(
                curPending.field,
                curPending.value,
                curData,
                curLang
              );
              setIsProcessing(false);
              return;
            }
            if (replyIntent === 'spell' && curPending.field === 'fullName') {
              setPendingConfirmation({
                field: 'fullName',
                value: '',
                mode: 'spell',
                spelledTokens: [],
              });
              const msg = t.assistant.confirmCard.spellStartPrompt;
              appendMessage('assistant', msg, 'fullName');
              speech.speak(msg, curLang);
              setIsProcessing(false);
              return;
            }
            if (replyIntent === 'edit' || replyIntent === 'reject') {
              setPendingConfirmation({
                ...curPending,
                mode: 'edit',
              });
              const msg = t.assistant.confirmCard.editPrompt(
                t.fields[curPending.field].label
              );
              appendMessage('assistant', msg, curPending.field);
              speech.speak(msg, curLang);
              setIsProcessing(false);
              return;
            }

            // Allow speaking a replacement value directly while confirming
            const replacement = parseVoiceInput(cleaned, curPending.field, curData);
            if (
              replacement.type === 'field_updated' &&
              replacement.field === curPending.field
            ) {
              const err = validateField(curPending.field, replacement.value, curLang);
              if (!err) {
                askForConfirmation(curPending.field, replacement.value, curLang);
                setIsProcessing(false);
                return;
              }
            }

            // Repeat confirmation prompt clearly
            askForConfirmation(curPending.field, curPending.value, curLang);
            setIsProcessing(false);
            return;
          }
        }

        // Branch 2: Multi-turn follow-up for location-needed Maps task
        if (
          curTask &&
          curTask.intent === 'search' &&
          curTask.executionStatus === 'requires_permission'
        ) {
          const decision = classifyPendingConfirmationReply(cleaned);
          if (decision === 'cancel') {
            clearDemoTimers();
            const cancelledTask: AssistantTask = {
              ...curTask,
              executionStatus: 'cancelled',
            };
            const cancelRes = advanceTaskConversation(curTask, cleaned, curLang);
            setActiveTask(cancelledTask);
            setDemoSession((prev) =>
              prev ? cancelDemoSession(prev, curLang).session : null
            );
            appendMessage('assistant', cancelRes.replyText);
            speech.speak(cancelRes.replyText, curLang);
            setIsProcessing(false);
            return;
          }
          if (decision === 'confirm' && curTask.externalUrl) {
            void runPlatformExecution(
              { ...curTask, requiresLocation: false },
              curLang
            );
            return;
          }

          // Treat city/area reply as refining the search unless user gave a completely different command
          const maybeNewCmd = parseNaturalCommand(cleaned, curLang);
          if (!maybeNewCmd.matched) {
            const baseQuery = (curTask.target || 'hospitals')
              .replace(/\b(near me|nearby|closest)\b/gi, '')
              .trim();
            const refinedQuery = `${baseQuery || 'hospitals'} in ${cleaned.replace(/[.!?]+$/, '').trim()}`;
            const refinedTask: AssistantTask = {
              ...curTask,
              target: refinedQuery,
              requiresLocation: false,
              locationStatus: 'not_needed',
              executionStatus: 'awaiting_confirmation',
            };
            const prepared = prepareTaskForPlatform(
              refinedTask,
              speech.platformCapabilities,
              curLang,
              curExecMode
            );
            setActiveTask(prepared.task);
            setDemoSession(
              createDemoSessionForTask(prepared.task, curExecMode, curLang, {
                applicationData: curData,
                activeField: curField,
              })
            );
            const confirmMsg =
              curLang === 'hi'
                ? `मैंने "${refinedQuery}" खोजने की तैयारी की है। क्या आप इसे खोलना चाहेंगे?`
                : curLang === 'kn'
                  ? `"${refinedQuery}" ಹುಡುಕಲು ಸಿದ್ಧವಾಗಿದೆ. ನಾನು ಅದನ್ನು ತೆರೆಯಲೇ?`
                  : `I prepared a search for "${refinedQuery}". Would you like me to open it in Google Maps?`;
            appendMessage('assistant', confirmMsg);
            speech.speak(confirmMsg, curLang);
            setIsProcessing(false);
            return;
          }
        }

        // Branch 3: Modular Natural-Language Command Understanding + Platform / Interactive Demo Layer
        const cmdResult = parseNaturalCommand(cleaned, curLang);
        if (cmdResult.matched && cmdResult.task) {
          clearDemoTimers();
          if (cmdResult.task.intent !== 'application_task') {
            setConversationMode('general');
            setPendingConfirmation(null);
          }
          const curExecMode = stateRef.current.executionMode;
          const appId = resolveDemoAppId(cmdResult.task);
          const descriptor = DEMO_APP_REGISTRY[appId];

          // In Interactive Demo Mode, native-only apps (Camera, Settings, Phone, Calculator, Calendar when ready) launch smoothly into animated demo
          if (
            curExecMode === 'interactive_demo' &&
            cmdResult.task.intent === 'app_launch' &&
            cmdResult.task.executionStatus !== 'needs_info' &&
            !descriptor.supportsRealBrowser &&
            !descriptor.requiresSensitiveConfirmation &&
            cmdResult.task.application
          ) {
            void runPlatformExecution(cmdResult.task, curLang);
            return;
          }

          const prepared = prepareTaskForPlatform(
            cmdResult.task,
            speech.platformCapabilities,
            curLang,
            curExecMode
          );
          setActiveTask(prepared.task);

          if (prepared.task.intent !== 'general_conversation') {
            setDemoSession(
              createDemoSessionForTask(prepared.task, curExecMode, curLang, {
                applicationData: curData,
                activeField: curField,
              })
            );
          } else {
            setDemoSession(null);
          }

          const demoPrompt = buildDemoConfirmationPrompt(
            prepared.task,
            curExecMode,
            curLang
          );

          executeWebCommandAction(
            {
              ...cmdResult,
              task: prepared.task,
              replyText: demoPrompt ?? prepared.replyOverride ?? cmdResult.replyText,
            },
            curLang,
            curData,
            curMessages,
            curField
          );
          setIsProcessing(false);
          return;
        }

        // Branch 4: Intents & Welfare Form Capture (ONLY capture form fields in welfare_form mode or explicit corrections)
        const outcome = quickIntent;
        const curMode = stateRef.current.conversationMode;

        if (outcome.type === 'intent') {
          if (outcome.intent === 'repeat') {
            if (curMode === 'welfare_form') {
              const prompt = t.fields[curField].voicePrompt;
              appendMessage('assistant', prompt, curField);
              speech.speak(prompt, curLang);
            } else {
              const lastAssistant = [...curMessages]
                .reverse()
                .find((m) => m.sender === 'assistant');
              const reply = lastAssistant?.text || t.assistant.initialGreeting;
              appendMessage('assistant', reply);
              speech.speak(reply, curLang);
            }
          } else if (outcome.intent === 'help') {
            appendMessage('assistant', t.assistant.helpMessage);
            speech.speak(t.assistant.helpMessage, curLang);
          } else if (outcome.intent === 'review') {
            speech.endConversation();
            setPreviousScreen(stateRef.current.currentScreen);
            setCurrentScreen('review');
          } else if (outcome.intent === 'form') {
            speech.endConversation();
            setPreviousScreen(stateRef.current.currentScreen);
            setCurrentScreen('form');
          } else if (outcome.intent === 'next') {
            if (curMode === 'welfare_form') {
              const idx = APPLICATION_FIELD_ORDER.indexOf(curField);
              const nextField =
                APPLICATION_FIELD_ORDER[(idx + 1) % APPLICATION_FIELD_ORDER.length];
              setActiveField(nextField);
              const prompt = t.fields[nextField].voicePrompt;
              appendMessage('assistant', prompt, nextField);
              speech.speak(prompt, curLang);
            } else {
              appendMessage('assistant', t.assistant.helpMessage);
              speech.speak(t.assistant.helpMessage, curLang);
            }
          }
          setIsProcessing(false);
          return;
        }

        if (outcome.type === 'field_updated' && curMode === 'welfare_form') {
          const { field, value } = outcome;
          const validationError = validateField(field, value, curLang);

          if (validationError) {
            const clarifyMsg = `${validationError} ${t.fields[field].example}`;
            appendMessage('assistant', clarifyMsg, field);
            speech.speak(clarifyMsg, curLang);
            setIsProcessing(false);
            return;
          }

          // Require explicit readback + confirmation for Name, Mobile, DOB, Annual Income
          if (requiresExplicitConfirmation(field)) {
            clearDemoTimers();
            setActiveTask(null);
            setDemoSession(null);
            setActiveField(field);
            askForConfirmation(field, value, curLang);
            setIsProcessing(false);
            return;
          }

          commitConfirmedField(field, value, curData, curLang);
          setIsProcessing(false);
          return;
        }

        if (curMode === 'welfare_form') {
          // Unrecognized answer for active welfare form field
          clearDemoTimers();
          const fieldMeta = t.fields[curField];
          const retryMsg = t.assistant.unrecognizedReply(
            fieldMeta.label,
            fieldMeta.example
          );
          appendMessage('assistant', retryMsg, curField);
          speech.speak(retryMsg, curLang);
          setIsProcessing(false);
          return;
        }

        // General conversation fallback: clear stale completed task/session and never capture unmatched phrases into welfare form fields
        clearDemoTimers();
        setActiveTask(null);
        setDemoSession(null);
        const generalReply = buildGeneralFallbackResponse(cleaned, curLang);
        appendMessage('assistant', generalReply);
        speech.speak(generalReply, curLang);
        setIsProcessing(false);
      }, 240);
    },
    [
      appendMessage,
      askForConfirmation,
      clearDemoTimers,
      commitConfirmedField,
      executeWebCommandAction,
      runPlatformExecution,
      speech,
    ]
  );

  processInputRef.current = handleUserInput;

  const navigateTo = useCallback(
    (screen: ScreenId) => {
      speech.endConversation();
      setPreviousScreen(stateRef.current.currentScreen);
      setCurrentScreen(screen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [speech]
  );

  const handleLanguageChange = useCallback(
    (newLang: LanguageCode) => {
      speech.endConversation();
      setLanguage(newLang);
      setPendingConfirmation(null);

      // Keep general greeting in general mode; use current field prompt only if actively in welfare_form mode
      const tNew = TRANSLATIONS[newLang];
      const nextField = getNextMissingField(stateRef.current.data) || 'fullName';
      setActiveField(nextField);
      if (stateRef.current.messages.length <= 1) {
        setMessages([
          {
            id: `init-${Date.now()}`,
            sender: 'assistant',
            text: tNew.assistant.initialGreeting,
            timestamp: formatNowTime(),
          },
        ]);
      } else if (stateRef.current.conversationMode === 'welfare_form') {
        appendMessage('assistant', tNew.fields[nextField].voicePrompt, nextField);
      } else {
        appendMessage('assistant', tNew.assistant.initialGreeting);
      }
    },
    [appendMessage, speech]
  );

  const handleStartAssistantFromWelcome = useCallback(() => {
    const t = TRANSLATIONS[language];
    if (messages.length <= 1) {
      const greeting = t.assistant.initialGreeting;
      setConversationMode('general');
      setMessages([
        {
          id: `welcome-start-${Date.now()}`,
          sender: 'assistant',
          text: greeting,
          timestamp: formatNowTime(),
        },
      ]);
      navigateTo('assistant');
      speech.startConversationWithSpeech(greeting, language);
    } else {
      navigateTo('assistant');
    }
  }, [language, messages.length, navigateTo, speech]);

  const handleStartWithCommandFromWelcome = useCallback(
    (command: string) => {
      navigateTo('assistant');
      handleUserInput(command);
    },
    [handleUserInput, navigateTo]
  );

  const handleSpeakSpecificField = useCallback(
    (field: ApplicationFieldKey) => {
      const t = TRANSLATIONS[language];
      setConversationMode('welfare_form');
      setPendingConfirmation(null);
      setActiveField(field);
      const prompt = t.fields[field].voicePrompt;
      appendMessage('assistant', prompt, field);
      navigateTo('assistant');
      speech.startConversationWithSpeech(prompt, language);
    },
    [appendMessage, language, navigateTo, speech]
  );

  const handleRepeat = useCallback(() => {
    const t = TRANSLATIONS[language];
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.sender === 'assistant');
    const textToSpeak =
      lastAssistant?.text ||
      (conversationMode === 'welfare_form'
        ? t.fields[activeField].voicePrompt
        : t.assistant.initialGreeting);
    speech.speak(textToSpeak, language);
  }, [activeField, conversationMode, language, messages, speech]);

  const handleStopAll = useCallback(() => {
    clearDemoTimers();
    setIsProcessing(false);
    speech.endConversation();
    const t = TRANSLATIONS[language];
    appendMessage('assistant', t.assistant.stoppedMessage);
  }, [appendMessage, clearDemoTimers, language, speech]);

  const handleHelp = useCallback(() => {
    const t = TRANSLATIONS[language];
    appendMessage('assistant', t.assistant.helpMessage);
    speech.speak(t.assistant.helpMessage, language);
  }, [appendMessage, language, speech]);

  const handleUpdateField = useCallback((field: ApplicationFieldKey, value: string) => {
    setData((prev) => {
      const updated = { ...prev, [field]: value };
      setDemoSession((prevSession) => {
        if (!prevSession || prevSession.appId !== 'welfare_form' || !prevSession.payload.formState) {
          return prevSession;
        }
        return {
          ...prevSession,
          payload: {
            ...prevSession.payload,
            formState: {
              ...prevSession.payload.formState,
              data: updated,
              lastUpdatedField: field,
              filledCount: getCompletionStats(updated).filledCount,
            },
          },
        };
      });
      return updated;
    });
  }, []);

  const handleResetApplication = useCallback(() => {
    clearDemoTimers();
    speech.endConversation();
    const t = TRANSLATIONS[language];
    setData({ ...EMPTY_APPLICATION_DATA });
    setConversationMode('general');
    setActiveTask(null);
    setDemoSession(null);
    setLastTaskContext(null);
    setRecentUpdatedField(null);
    setPendingConfirmation(null);
    setActiveField('fullName');
    setFocusedFormField(null);
    setConfirmationNumber('');
    setSubmittedAt('');
    setIsProcessing(false);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: t.assistant.initialGreeting,
        timestamp: formatNowTime(),
      },
    ]);
  }, [clearDemoTimers, language, speech]);

  const handleConfirmSubmit = useCallback(() => {
    speech.endConversation();
    const conf = generateConfirmationNumber();
    const nowStr = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    setConfirmationNumber(conf);
    setSubmittedAt(nowStr);
    setCurrentScreen('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [speech]);

  const hasDraftProgress = getCompletionStats(data).filledCount > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F1E8] text-[#302B33]">
      <TopBar
        currentScreen={currentScreen}
        language={language}
        textScale={textScale}
        onNavigate={navigateTo}
        onLanguageChange={handleLanguageChange}
        onTextScaleChange={setTextScale}
      />
      <ExecutionModeToggle
        language={language}
        mode={executionMode}
        onChange={(nextMode) => {
          clearDemoTimers();
          setExecutionMode(nextMode);
          setDemoSession((prev) =>
            prev
              ? {
                  ...prev,
                  mode: nextMode,
                  isSimulated:
                    nextMode === 'interactive_demo' ||
                    !DEMO_APP_REGISTRY[prev.appId].supportsRealBrowser,
                }
              : null
          );
        }}
      />

      <div className="flex-1">
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            language={language}
            hasDraftProgress={hasDraftProgress}
            onLanguageChange={handleLanguageChange}
            onStartAssistant={handleStartAssistantFromWelcome}
            onStartWithCommand={handleStartWithCommandFromWelcome}
            onOpenForm={() => navigateTo('form')}
          />
        )}

        {currentScreen === 'assistant' && (
          <VoiceAssistantScreen
            language={language}
            conversationMode={conversationMode}
            data={data}
            messages={messages}
            activeField={activeField}
            recentUpdatedField={recentUpdatedField}
            activeTask={activeTask}
            demoSession={demoSession}
            pendingConfirmation={pendingConfirmation}
            sessionState={speech.sessionState}
            isConversationActive={speech.isConversationActive}
            isListening={speech.isListening}
            isSpeaking={speech.isSpeaking}
            isProcessing={isProcessing}
            interimTranscript={speech.interimTranscript}
            speechError={speech.speechError}
            capabilities={speech.capabilities}
            platformCapabilities={speech.platformCapabilities}
            hasCurrentLanguageVoice={speech.hasCurrentLanguageVoice}
            speechRate={speech.speechRate}
            onToggleSpeechRate={() =>
              speech.setSpeechRate(speech.speechRate === 'slow' ? 'normal' : 'slow')
            }
            onStartConversation={speech.startConversation}
            onEndConversation={() => {
              speech.endConversation();
              appendMessage('assistant', TRANSLATIONS[language].assistant.endedMessage);
            }}
            onSendText={handleUserInput}
            onRepeat={handleRepeat}
            onStopAll={handleStopAll}
            onHelp={handleHelp}
            onSpeakMessage={(txt) =>
              speech.speak(txt, language, {
                resumeListeningAfter: speech.isConversationActive,
              })
            }
            onSelectFieldFocus={(field) => {
              setConversationMode('welfare_form');
              setPendingConfirmation(null);
              setActiveField(field);
              const prompt = TRANSLATIONS[language].fields[field].voicePrompt;
              appendMessage('assistant', prompt, field);
              speech.speak(prompt, language);
            }}
            onConfirmPendingYes={() => {
              if (!pendingConfirmation) return;
              commitConfirmedField(
                pendingConfirmation.field,
                pendingConfirmation.value,
                data,
                language
              );
            }}
            onConfirmPendingSpell={() => {
              if (!pendingConfirmation) return;
              setPendingConfirmation({
                field: 'fullName',
                value: '',
                mode: 'spell',
                spelledTokens: [],
              });
              const msg = TRANSLATIONS[language].assistant.confirmCard.spellStartPrompt;
              appendMessage('assistant', msg, 'fullName');
              speech.speak(msg, language);
            }}
            onConfirmPendingEdit={() => {
              if (!pendingConfirmation) return;
              setPendingConfirmation({
                ...pendingConfirmation,
                mode: 'edit',
              });
              const msg = TRANSLATIONS[language].assistant.confirmCard.editPrompt(
                TRANSLATIONS[language].fields[pendingConfirmation.field].label
              );
              appendMessage('assistant', msg, pendingConfirmation.field);
              speech.speak(msg, language);
            }}
            onConfirmPendingSaveEdit={(newValue) => {
              if (!pendingConfirmation) return;
              commitConfirmedField(pendingConfirmation.field, newValue, data, language);
            }}
            onConfirmPendingCancelEdit={() => {
              if (!pendingConfirmation) return;
              setPendingConfirmation({
                ...pendingConfirmation,
                mode: 'confirm',
              });
            }}
            onSpellLetter={(char) => {
              setPendingConfirmation((prev) => {
                if (!prev) return prev;
                const nextTokens = [...prev.spelledTokens, char];
                return {
                  ...prev,
                  spelledTokens: nextTokens,
                  value: formatSpelledName(nextTokens),
                };
              });
            }}
            onSpellBackspace={() => {
              setPendingConfirmation((prev) => {
                if (!prev) return prev;
                const nextTokens = prev.spelledTokens.slice(0, -1);
                return {
                  ...prev,
                  spelledTokens: nextTokens,
                  value: formatSpelledName(nextTokens),
                };
              });
            }}
            onSpellClear={() => {
              setPendingConfirmation((prev) =>
                prev ? { ...prev, spelledTokens: [], value: '' } : prev
              );
            }}
            onSpellFinish={() => {
              if (!pendingConfirmation || pendingConfirmation.value.trim().length < 2) {
                return;
              }
              askForConfirmation('fullName', pendingConfirmation.value.trim(), language);
            }}
            onConfirmTask={() => {
              if (!activeTask) return;
              void runPlatformExecution(activeTask, language);
            }}
            onCancelTask={() => {
              clearDemoTimers();
              if (activeTask) {
                const next = advanceTaskConversation(activeTask, 'cancel', language);
                setActiveTask(next.task);
                setDemoSession((prev) =>
                  prev ? cancelDemoSession(prev, language).session : null
                );
                if (next.replyText) {
                  appendMessage('assistant', next.replyText);
                  speech.speak(next.replyText, language);
                }
              } else if (demoSession) {
                const cancelled = cancelDemoSession(demoSession, language);
                setDemoSession(cancelled.session);
                appendMessage('assistant', cancelled.replyText);
                speech.speak(cancelled.replyText, language);
              }
            }}
            onOpenForm={() => navigateTo('form')}
            onOpenReview={() => navigateTo('review')}
            onDismissError={speech.clearSpeechError}
          />
        )}

        {currentScreen === 'form' && (
          <ApplicationFormScreen
            language={language}
            data={data}
            focusedField={focusedFormField}
            onUpdateField={handleUpdateField}
            onSpeakField={handleSpeakSpecificField}
            onBackToAssistant={() => navigateTo('assistant')}
            onContinueToReview={() => navigateTo('review')}
            onResetForm={handleResetApplication}
          />
        )}

        {currentScreen === 'review' && (
          <ReviewScreen
            language={language}
            data={data}
            isSpeaking={speech.isSpeaking}
            onReadAloud={(summaryText) => speech.speak(summaryText, language)}
            onStopReading={speech.stopSpeaking}
            onEditField={(field) => {
              setFocusedFormField(field);
              navigateTo('form');
            }}
            onConfirmSubmit={handleConfirmSubmit}
            onGoBackToForm={() => {
              setFocusedFormField(null);
              navigateTo('form');
            }}
          />
        )}

        {currentScreen === 'success' && (
          <SuccessScreen
            language={language}
            data={data}
            confirmationNumber={confirmationNumber}
            submittedAt={submittedAt}
            onStartNew={() => {
              handleResetApplication();
              navigateTo('assistant');
            }}
            onBackHome={() => {
              handleResetApplication();
              navigateTo('welcome');
            }}
          />
        )}
      </div>

      {/* Quiet, dignified footer */}
      <footer className="border-t border-[var(--sahaaya-border)] bg-[#FFFCF7]/70 py-4 px-4 sm:px-6 text-center text-xs sm:text-sm text-[#5C5363]">
        <span>Sahaaya · {TRANSLATIONS[language].tagline}</span>
      </footer>
    </div>
  );
}
