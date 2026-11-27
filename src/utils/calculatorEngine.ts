import { LanguageCode } from '../types/sahaaya';

export interface MathEvaluationResult {
  ok: boolean;
  expression: string;
  normalizedExpression: string;
  value?: number;
  formattedValue?: string;
  error?: string;
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'percent' }
  | { type: 'lparen' }
  | { type: 'rparen' };

function formatNumberResult(num: number): string {
  if (!Number.isFinite(num)) return 'Error';
  const rounded = Math.abs(num) < 1e-12 ? 0 : Number(num.toPrecision(12));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Normalizes human/voice math expressions into arithmetic syntax without using eval().
 */
export function normalizeMathExpression(raw: string): string {
  let expr = raw
    .trim()
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '');

  // Handle "15 percent of 200" or "15% of 200"
  expr = expr.replace(
    /(\d+(?:\.\d+)?)\s*(?:%|percent|प्रतिशत|ಶೇಕಡಾ)\s+(?:of|का|की|के|ರ)\s+(\d+(?:\.\d+)?)/gi,
    '(($1 / 100) * $2)'
  );

  // Handle natural-language "X plus Y", "X minus Y", "X times Y", "X divided by Y", "X multiplied by Y"
  expr = expr
    .replace(/\bdivided\s+by\s+/gi, ' / ')
    .replace(/\bmultiplied\s+by\s+/gi, ' * ')
    .replace(/\binto\b/gi, ' * ')
    .replace(/\btimes\b/gi, ' * ')
    .replace(/\bplus\b/gi, ' + ')
    .replace(/\bminus\b/gi, ' - ')
    .replace(/\bpercent\b/gi, '%')
    .replace(/(\d)\s*[xX]\s*(\d)/g, '$1 * $2');

  // Handle Hindi/Kannada math connectors if present inside expression
  expr = expr
    .replace(/जोड़ो|और/g, ' + ')
    .replace(/घटाओ|कम/g, ' - ')
    .replace(/गुणा/g, ' * ')
    .replace(/भाग/g, ' / ')
    .replace(/ಸೇರಿಸಿ|ಮತ್ತು/g, ' + ')
    .replace(/ಕಳೆಯಿರಿ/g, ' - ')
    .replace(/ಗುಣಿಸು/g, ' * ')
    .replace(/ಭಾಗಿಸು/g, ' / ');

  // Convert "200 + 15%" or "200 - 15%" into pocket-calculator percentage semantics
  expr = expr.replace(
    /(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*%/g,
    '($1 $2 (($1 * $3) / 100))'
  );

  return expr.replace(/\s+/g, ' ').trim();
}

function tokenize(expr: string): Token[] | { error: string } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/\d/.test(ch) || ch === '.') {
      let numStr = '';
      let dotCount = 0;
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        if (expr[i] === '.') dotCount += 1;
        if (dotCount > 1) return { error: 'Invalid number format.' };
        numStr += expr[i];
        i += 1;
      }
      const parsed = Number(numStr);
      if (Number.isNaN(parsed)) return { error: 'Invalid number.' };
      tokens.push({ type: 'number', value: parsed });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    if (ch === '%') {
      tokens.push({ type: 'percent' });
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }
    return { error: `Unexpected character "${ch}".` };
  }
  return tokens;
}

/**
 * Deterministic recursive-descent arithmetic evaluator (never uses eval or Function).
 */
export function evaluateMathExpression(rawExpression: string): MathEvaluationResult {
  const normalized = normalizeMathExpression(rawExpression);
  if (!normalized) {
    return {
      ok: false,
      expression: rawExpression,
      normalizedExpression: normalized,
      error: 'Please enter a calculation.',
    };
  }

  const tokenResult = tokenize(normalized);
  if ('error' in tokenResult) {
    return {
      ok: false,
      expression: rawExpression,
      normalizedExpression: normalized,
      error: tokenResult.error,
    };
  }

  const tokens = tokenResult;
  if (tokens.length === 0) {
    return {
      ok: false,
      expression: rawExpression,
      normalizedExpression: normalized,
      error: 'Please enter a calculation.',
    };
  }

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token | undefined => tokens[pos++];

  let divByZero = false;
  let syntaxError: string | null = null;

  function parseExpression(): number {
    let left = parseTerm();
    while (true) {
      const tok = peek();
      if (tok && tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
        consume();
        const right = parseTerm();
        left = tok.value === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (true) {
      const tok = peek();
      if (tok && tok.type === 'op' && (tok.value === '*' || tok.value === '/')) {
        consume();
        const right = parseFactor();
        if (tok.value === '/') {
          if (right === 0) {
            divByZero = true;
            return NaN;
          }
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): number {
    const tok = peek();
    if (tok && tok.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      consume();
      const val = parseFactor();
      return tok.value === '-' ? -val : val;
    }
    let val = parsePrimary();
    while (peek()?.type === 'percent') {
      consume();
      val = val / 100;
    }
    return val;
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) {
      syntaxError = 'Incomplete expression.';
      return NaN;
    }
    if (tok.type === 'number') {
      consume();
      return tok.value;
    }
    if (tok.type === 'lparen') {
      consume();
      const val = parseExpression();
      const close = peek();
      if (!close || close.type !== 'rparen') {
        syntaxError = 'Missing closing parenthesis.';
        return NaN;
      }
      consume();
      return val;
    }
    syntaxError = 'Invalid mathematical expression.';
    return NaN;
  }

  const value = parseExpression();

  if (divByZero) {
    return {
      ok: false,
      expression: rawExpression,
      normalizedExpression: normalized,
      error: 'Cannot divide by zero.',
    };
  }
  if (syntaxError || pos < tokens.length || !Number.isFinite(value)) {
    return {
      ok: false,
      expression: rawExpression,
      normalizedExpression: normalized,
      error: syntaxError || 'Invalid mathematical expression.',
    };
  }

  return {
    ok: true,
    expression: rawExpression.trim(),
    normalizedExpression: normalized,
    value,
    formattedValue: formatNumberResult(value),
  };
}

export interface CalculatorCommandExtraction {
  matched: boolean;
  openOnly: boolean;
  expression: string | null;
  evaluation: MathEvaluationResult | null;
}

/**
 * Extracts spoken/typed calculator intent & arithmetic expressions in EN, HI, and KN.
 */
export function extractCalculatorCommand(
  rawText: string
): CalculatorCommandExtraction {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Pure open calculator (handled cleanly with Calculator demo app)
  if (
    /^(?:open|launch|start)(?:\s+the|\s+my)?\s+(?:calculator|कैलकुलेटर|ಕ್ಯಾಲ್ಕುಲೇಟರ್)[.!?]*$/i.test(
      lower
    ) ||
    /^(?:कैलकुलेटर\s*(?:खोलो|खोलिए|चालू\s*करो)|ಕ್ಯಾಲ್ಕುಲೇಟರ್\s*(?:ತೆರೆಯಿರಿ|ತೆರೆ))[.!?]*$/.test(
      text
    )
  ) {
    return {
      matched: true,
      openOnly: true,
      expression: null,
      evaluation: null,
    };
  }

  // Strip leading "open calculator and" / "calculate" / "what is"
  const hasCalcKeyword =
    /\b(?:calculator|calculate|compute|add|subtract|multiply|divide|divided by|multiplied by|plus|minus|percent of)\b/i.test(
      lower
    ) ||
    /कैलकुलेटर|जोड़ो|घटाओ|गुणा|भाग|ಕ್ಯಾಲ್ಕುಲೇಟರ್|ಸೇರಿಸಿ|ಕಳೆಯಿರಿ|ಗುಣಿಸು|ಭಾಗಿಸು/.test(
      text
    ) ||
    /^\s*(?:what\s+is\s+)?-?\d+(?:\.\d+)?\s*(?:[+\-*/×÷%]|plus|minus|times|divided\s+by|multiplied\s+by)\s*-?\d+/i.test(
      lower
    );

  if (!hasCalcKeyword) {
    return { matched: false, openOnly: false, expression: null, evaluation: null };
  }

  // Check explicit "subtract X from Y" -> Y - X
  const subtractFromEn = text.match(
    /\bsubtract\s+(\d+(?:\.\d+)?)\s+from\s+(\d+(?:\.\d+)?)/i
  );
  if (subtractFromEn) {
    const expr = `${subtractFromEn[2]} - ${subtractFromEn[1]}`;
    const evalRes = evaluateMathExpression(expr);
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evalRes,
    };
  }

  // Hindi: "500 में से 150 घटाओ" -> 500 - 150
  const subtractHi = text.match(
    /(\d+(?:\.\d+)?)\s*में\s*से\s*(\d+(?:\.\d+)?)\s*घटा/
  );
  if (subtractHi) {
    const expr = `${subtractHi[1]} - ${subtractHi[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  // Kannada: "500 ರಲ್ಲಿ 150 ಕಳೆಯಿರಿ" -> 500 - 150
  const subtractKn = text.match(
    /(\d+(?:\.\d+)?)\s*(?:ರಲ್ಲಿ|ರಿಂದ)\s*(\d+(?:\.\d+)?)\s*ಕಳೆ/
  );
  if (subtractKn) {
    const expr = `${subtractKn[1]} - ${subtractKn[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  // "add A and B" / "A और B जोड़ो" / "A ಮತ್ತು B ಸೇರಿಸಿ"
  const addMatch = text.match(
    /\badd\s+(-?\d+(?:\.\d+)?)\s+(?:and|to|with)\s+(-?\d+(?:\.\d+)?)/i
  );
  if (addMatch) {
    const expr = `${addMatch[1]} + ${addMatch[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  const addHi = text.match(
    /(\d+(?:\.\d+)?)\s*(?:और|तथा)\s*(\d+(?:\.\d+)?)\s*(?:को\s*)?जोड़/
  );
  if (addHi) {
    const expr = `${addHi[1]} + ${addHi[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  const addKn = text.match(
    /(\d+(?:\.\d+)?)\s*(?:ಮತ್ತು|ಹಾಗೂ)\s*(\d+(?:\.\d+)?)\s*(?:ಅನ್ನು\s*)?(?:ಸೇರಿಸಿ|ಕೂಡಿಸಿ)/
  );
  if (addKn) {
    const expr = `${addKn[1]} + ${addKn[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  // "multiply A by B" / "A को B से गुणा करो"
  const multMatch = text.match(
    /\bmultiply\s+(-?\d+(?:\.\d+)?)\s+(?:by|and|with)\s+(-?\d+(?:\.\d+)?)/i
  );
  if (multMatch) {
    const expr = `${multMatch[1]} * ${multMatch[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  const multHi = text.match(
    /(\d+(?:\.\d+)?)\s*(?:को\s*)?(\d+(?:\.\d+)?)\s*से\s*गुणा/
  );
  if (multHi) {
    const expr = `${multHi[1]} * ${multHi[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  // "divide A by B" / "A को B से भाग दो"
  const divMatch = text.match(
    /\bdivide\s+(-?\d+(?:\.\d+)?)\s+by\s+(-?\d+(?:\.\d+)?)/i
  );
  if (divMatch) {
    const expr = `${divMatch[1]} / ${divMatch[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  const divHi = text.match(
    /(\d+(?:\.\d+)?)\s*(?:को\s*)?(\d+(?:\.\d+)?)\s*से\s*भाग/
  );
  if (divHi) {
    const expr = `${divHi[1]} / ${divHi[2]}`;
    return {
      matched: true,
      openOnly: false,
      expression: expr,
      evaluation: evaluateMathExpression(expr),
    };
  }

  // Generic arithmetic / percentage expression after stripping conversational shell
  let cleanedExpr = text
    .replace(
      /^(?:(?:hey|hi|hello)\s+)?sahaaya[, ]+\s*/i,
      ''
    )
    .replace(
      /^(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:(?:open|launch|start)\s+(?:the\s+|my\s+)?calculator\s+(?:and|to)\s+)?(?:calculate|compute|evaluate|solve|what\s+is|tell\s+me)\s+/i,
      ''
    )
    .replace(/^(?:कैलकुलेटर\s*खोलो\s*(?:और)?|गणना\s*करो)\s*/i, '')
    .replace(/^(?:ಕ್ಯಾಲ್ಕುಲೇಟರ್\s*ತೆರೆಯಿರಿ\s*(?:ಮತ್ತು)?|ಲೆಕ್ಕ\s*ಹಾಕಿ)\s*/i, '')
    .replace(/[?.!]+$/, '')
    .trim();

  // Only treat as arithmetic if digits and an operator or percent exist
  const normalized = normalizeMathExpression(cleanedExpr);
  if (/\d/.test(normalized) && /[+\-*/%]/.test(normalized)) {
    const evalRes = evaluateMathExpression(cleanedExpr);
    return {
      matched: true,
      openOnly: false,
      expression: evalRes.normalizedExpression || cleanedExpr,
      evaluation: evalRes,
    };
  }

  if (/\b(?:calculator)\b|कैलकुलेटर|ಕ್ಯಾಲ್ಕುಲೇಟರ್/i.test(text)) {
    return {
      matched: true,
      openOnly: true,
      expression: null,
      evaluation: null,
    };
  }

  return { matched: false, openOnly: false, expression: null, evaluation: null };
}

export function buildCalculatorReply(
  extraction: CalculatorCommandExtraction,
  lang: LanguageCode
): string {
  if (extraction.openOnly || !extraction.evaluation) {
    if (lang === 'hi') {
      return 'डेमो मोड में कैलकुलेटर खोल दिया गया है। आप संख्याएँ और चिह्न दबाकर या बोलकर गणना कर सकते हैं।';
    }
    if (lang === 'kn') {
      return 'ಡೆಮೊ ಮೋಡ್‌ನಲ್ಲಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ. ನೀವು ಸಂಖ್ಯೆಗಳನ್ನು ಒತ್ತಿ ಅಥವಾ ಮಾತನಾಡಿ ಲೆಕ್ಕಾಚಾರ ಮಾಡಬಹುದು.';
    }
    return 'Calculator opened in Sahaaya Demo Mode. You can tap the keypad or ask me to calculate any numbers.';
  }

  const evalRes = extraction.evaluation;
  if (!evalRes.ok) {
    if (evalRes.error === 'Cannot divide by zero.') {
      if (lang === 'hi') return 'शून्य (0) से भाग नहीं दिया जा सकता। कृपया कोई दूसरी संख्या आज़माएँ।';
      if (lang === 'kn') return 'ಸೊನ್ನೆಯಿಂದ (0) ಭಾಗಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ಸಂಖ್ಯೆಯನ್ನು ಪ್ರಯತ್ನಿಸಿ.';
      return 'Cannot divide by zero. Please try a different number.';
    }
    if (lang === 'hi') {
      return 'मैं यह गणितीय प्रश्न नहीं समझ सका। कृपया "250 + 350" या "25 गुणा 8" जैसा सरल प्रश्न बोलें।';
    }
    if (lang === 'kn') {
      return 'ಆ ಗಣಿತ ಸಮೀಕರಣವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು "250 + 350" ಅಥವಾ "25 ಗುಣಿಸು 8" ಎಂದು ಸರಳವಾಗಿ ಕೇಳಿ.';
    }
    return 'I could not evaluate that expression. Please try a clear calculation like "250 + 350" or "Multiply 25 by 8".';
  }

  const exprDisplay = evalRes.normalizedExpression;
  const valDisplay = evalRes.formattedValue!;
  if (lang === 'hi') {
    return `कैलकुलेटर में गणना तैयार है: ${exprDisplay} = ${valDisplay}।`;
  }
  if (lang === 'kn') {
    return `ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ನಲ್ಲಿ ಲೆಕ್ಕಾಚಾರ ಸಿದ್ಧವಾಗಿದೆ: ${exprDisplay} = ${valDisplay}.`;
  }
  return `${exprDisplay} equals ${valDisplay}.`;
}
