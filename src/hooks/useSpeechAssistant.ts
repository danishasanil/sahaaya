import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageCode, PlatformCapabilities } from '../types/sahaaya';
import {
  detectPlatformCapabilities,
  queryMicrophonePermission,
} from '../utils/platformCapabilities';
import {
  SpeechSessionController,
  SpeechSnapshot,
} from '../utils/speechSessionController';

export function useSpeechAssistant(
  lang: LanguageCode,
  onFinalTranscript: (transcript: string) => void
) {
  const onFinalRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const controllerRef = useRef<SpeechSessionController | null>(null);
  const [platformCapabilities, setPlatformCapabilities] =
    useState<PlatformCapabilities>(() => detectPlatformCapabilities());

  const [snapshot, setSnapshot] = useState<SpeechSnapshot>(() => {
    const temp = new SpeechSessionController({
      lang,
      onFinalTranscript: () => {},
      onStateChange: () => {},
    });
    const initial = temp.getSnapshot();
    temp.destroy();
    return initial;
  });

  const refreshMicrophonePermission = useCallback(async () => {
    const perm = await queryMicrophonePermission();
    setPlatformCapabilities((prev) =>
      prev.microphonePermission === perm
        ? prev
        : { ...prev, microphonePermission: perm }
    );
  }, []);

  useEffect(() => {
    const controller = new SpeechSessionController({
      lang,
      onFinalTranscript: (text) => onFinalRef.current(text),
      onStateChange: (next) => setSnapshot(next),
    });
    controllerRef.current = controller;
    setSnapshot(controller.getSnapshot());
    void refreshMicrophonePermission();

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // Recreate cleanly only on unmount; language updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (snapshot.speechError === 'permission-denied') {
      setPlatformCapabilities((prev) => ({
        ...prev,
        microphonePermission: 'denied',
      }));
    } else if (snapshot.isListening) {
      setPlatformCapabilities((prev) => ({
        ...prev,
        microphonePermission: 'granted',
      }));
    }
  }, [snapshot.isListening, snapshot.speechError]);

  const startConversation = useCallback(() => {
    controllerRef.current?.startConversation();
    void refreshMicrophonePermission();
  }, [refreshMicrophonePermission]);

  const startConversationWithSpeech = useCallback(
    (text: string, overrideLang?: LanguageCode) => {
      controllerRef.current?.startConversationWithSpeech(text, overrideLang);
      void refreshMicrophonePermission();
    },
    [refreshMicrophonePermission]
  );

  const endConversation = useCallback(() => {
    controllerRef.current?.endConversation();
  }, []);

  const speak = useCallback(
    (
      text: string,
      overrideLang?: LanguageCode,
      options?: { resumeListeningAfter?: boolean }
    ) => {
      controllerRef.current?.speak(text, overrideLang, options);
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    controllerRef.current?.stopSpeaking();
  }, []);

  const pauseListeningForProcessing = useCallback(() => {
    controllerRef.current?.pauseListeningForProcessing();
  }, []);

  const finishProcessingWithoutSpeech = useCallback(() => {
    controllerRef.current?.finishProcessingWithoutSpeech();
  }, []);

  const clearSpeechError = useCallback(() => {
    controllerRef.current?.clearSpeechError();
  }, []);

  const setSpeechRate = useCallback((rate: 'normal' | 'slow') => {
    controllerRef.current?.setSpeechRate(rate);
  }, []);

  const hasCurrentLanguageVoice =
    lang === 'en'
      ? snapshot.capabilities.hasEnglishVoice
      : lang === 'hi'
        ? snapshot.capabilities.hasHindiVoice
        : snapshot.capabilities.hasKannadaVoice;

  return {
    ...snapshot,
    platformCapabilities,
    hasCurrentLanguageVoice,
    startConversation,
    startConversationWithSpeech,
    endConversation,
    speak,
    stopSpeaking,
    pauseListeningForProcessing,
    finishProcessingWithoutSpeech,
    clearSpeechError,
    setSpeechRate,
  };
}

