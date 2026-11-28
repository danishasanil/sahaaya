import { TRANSLATIONS } from '../i18n/translations';
import {
  ApplicationData,
  ApplicationFieldKey,
  ConversationMode,
  LanguageCode,
  PendingConfirmation,
} from '../types/sahaaya';
import {
  EMPTY_APPLICATION_DATA,
  getNextMissingField,
  parseConfirmationReply,
  parseVoiceInput,
  requiresExplicitConfirmation,
  validateField,
} from './applicationLogic';
import { CommandParseResult, parseNaturalCommand } from './commandIntentEngine';

export interface WelfareSessionState {
  conversationMode: ConversationMode;
  data: ApplicationData;
  activeField: ApplicationFieldKey;
  pendingConfirmation: PendingConfirmation | null;
}

export function createInitialWelfareSessionState(): WelfareSessionState {
  return {
    conversationMode: 'general',
    data: { ...EMPTY_APPLICATION_DATA },
    activeField: 'fullName',
    pendingConfirmation: null,
  };
}

/**
 * Bug 5A & 5D fix:
 * Pressing "Continue with Sahaaya" (or returning to the assistant from Welcome)
 * MUST open the normal Voice Assistant in 'general' mode and NEVER activate
 * the welfare form or enter name confirmation, even if draft form data exists.
 */
export function openAssistantFromContinueButton(
  state: WelfareSessionState
): WelfareSessionState {
  return {
    ...state,
    conversationMode: 'general',
    pendingConfirmation: null,
  };
}

export type WelfareStateStepResult =
  | {
      kind: 'routed_to_command';
      commandResult: CommandParseResult;
      nextState: WelfareSessionState;
    }
  | {
      kind: 'awaiting_field_confirmation';
      field: ApplicationFieldKey;
      value: string;
      nextState: WelfareSessionState;
    }
  | {
      kind: 'field_confirmed_and_saved';
      field: ApplicationFieldKey;
      value: string;
      nextState: WelfareSessionState;
    }
  | {
      kind: 'rejected_and_discarded';
      field: ApplicationFieldKey;
      nextState: WelfareSessionState;
    }
  | {
      kind: 'spelling_mode';
      nextState: WelfareSessionState;
    }
  | {
      kind: 'edit_mode';
      nextState: WelfareSessionState;
    }
  | {
      kind: 'welfare_retry';
      field: ApplicationFieldKey;
      error?: string;
      nextState: WelfareSessionState;
    }
  | {
      kind: 'general_passthrough';
      nextState: WelfareSessionState;
    };

export function stepWelfareOrCommandState(
  state: WelfareSessionState,
  rawInput: string,
  uiLang: LanguageCode = 'en'
): WelfareStateStepResult {
  const cleaned = rawInput.trim();

  // Always check explicit commands first so YouTube/Maps/WhatsApp/Calculator never become a name
  const cmd = parseNaturalCommand(cleaned, uiLang);
  if (cmd.matched && cmd.task) {
    if (cmd.task.intent === 'application_task') {
      const nextField = getNextMissingField(state.data) || 'fullName';
      return {
        kind: 'routed_to_command',
        commandResult: cmd,
        nextState: {
          ...state,
          conversationMode: 'welfare_form',
          activeField: nextField,
          pendingConfirmation: null,
        },
      };
    }

    if (cmd.task.intent !== 'general_conversation' || state.conversationMode !== 'welfare_form') {
      return {
        kind: 'routed_to_command',
        commandResult: cmd,
        nextState: {
          ...state,
          conversationMode: 'general',
          pendingConfirmation: null,
        },
      };
    }
  }

  // Never capture names or form fields when welfare_form is NOT active
  if (state.conversationMode !== 'welfare_form') {
    return {
      kind: 'general_passthrough',
      nextState: state,
    };
  }

  const curPending = state.pendingConfirmation;
  if (curPending && curPending.mode === 'confirm') {
    const replyIntent = parseConfirmationReply(cleaned);
    const hasExplicitCorrectionCue =
      /(?:my\s+(?:full\s+)?name\s+is|call\s+me|change\s+(?:it|my\s+name)?\s+to|should\s+be|instead\s+of|मेरा\s+(?:पूरा\s+)?नाम|ನನ್ನ\s+(?:ಪೂರ್ಣ\s+)?ಹೆಸರು)/i.test(
        cleaned
      ) ||
      (curPending.field !== 'fullName' && /\d/.test(cleaned));

    if (!replyIntent || hasExplicitCorrectionCue) {
      // Allow direct correction in same sentence, e.g. "No, my name is Ganesha Rao."
      const replacement = parseVoiceInput(cleaned, curPending.field, state.data);
      if (
        replacement.type === 'field_updated' &&
        replacement.field === curPending.field &&
        replacement.value.toLowerCase() !== curPending.value.toLowerCase()
      ) {
        const err = validateField(curPending.field, replacement.value, uiLang);
        if (!err) {
          const nextPending: PendingConfirmation = {
            field: curPending.field,
            value: replacement.value,
            mode: 'confirm',
            spelledTokens: [],
          };
          return {
            kind: 'awaiting_field_confirmation',
            field: curPending.field,
            value: replacement.value,
            nextState: {
              ...state,
              pendingConfirmation: nextPending,
            },
          };
        }
      }
    }

    if (replyIntent === 'confirm') {
      const updatedData: ApplicationData = {
        ...state.data,
        [curPending.field]: curPending.value,
      };
      const nextMissing = getNextMissingField(updatedData) || curPending.field;
      return {
        kind: 'field_confirmed_and_saved',
        field: curPending.field,
        value: curPending.value,
        nextState: {
          ...state,
          data: updatedData,
          activeField: nextMissing,
          pendingConfirmation: null,
        },
      };
    }

    if (replyIntent === 'reject') {
      // Discard rejected value completely and ask clearly again
      return {
        kind: 'rejected_and_discarded',
        field: curPending.field,
        nextState: {
          ...state,
          pendingConfirmation: null,
        },
      };
    }

    if (replyIntent === 'spell' && curPending.field === 'fullName') {
      return {
        kind: 'spelling_mode',
        nextState: {
          ...state,
          pendingConfirmation: {
            field: 'fullName',
            value: '',
            mode: 'spell',
            spelledTokens: [],
          },
        },
      };
    }

    if (replyIntent === 'edit') {
      return {
        kind: 'edit_mode',
        nextState: {
          ...state,
          pendingConfirmation: {
            ...curPending,
            mode: 'edit',
          },
        },
      };
    }

    return {
      kind: 'awaiting_field_confirmation',
      field: curPending.field,
      value: curPending.value,
      nextState: state,
    };
  }

  const outcome = parseVoiceInput(cleaned, state.activeField, state.data);
  if (outcome.type === 'field_updated') {
    const err = validateField(outcome.field, outcome.value, uiLang);
    if (err) {
      return {
        kind: 'welfare_retry',
        field: outcome.field,
        error: err,
        nextState: state,
      };
    }

    if (requiresExplicitConfirmation(outcome.field)) {
      return {
        kind: 'awaiting_field_confirmation',
        field: outcome.field,
        value: outcome.value,
        nextState: {
          ...state,
          activeField: outcome.field,
          pendingConfirmation: {
            field: outcome.field,
            value: outcome.value,
            mode: 'confirm',
            spelledTokens: [],
          },
        },
      };
    }

    const updatedData: ApplicationData = {
      ...state.data,
      [outcome.field]: outcome.value,
    };
    const nextMissing = getNextMissingField(updatedData) || outcome.field;
    return {
      kind: 'field_confirmed_and_saved',
      field: outcome.field,
      value: outcome.value,
      nextState: {
        ...state,
        data: updatedData,
        activeField: nextMissing,
        pendingConfirmation: null,
      },
    };
  }

  return {
    kind: 'welfare_retry',
    field: state.activeField,
    error: TRANSLATIONS[uiLang].fields[state.activeField].errorInvalid,
    nextState: state,
  };
}
