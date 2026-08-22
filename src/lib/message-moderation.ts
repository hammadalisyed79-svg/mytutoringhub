export type ModerationCategory =
  | "scam"
  | "off_platform_payment"
  | "phishing"
  | "harassment"
  | "spam";

export type ModerationSeverity = "low" | "medium" | "high";

export type ModerationFlag = {
  category: ModerationCategory;
  severity: ModerationSeverity;
  label: string;
  match: string;
  index: number;
};

export type MessageModerationResult = {
  flagged: boolean;
  score: number;
  severity: ModerationSeverity | null;
  flags: ModerationFlag[];
};

type PatternRule = {
  category: ModerationCategory;
  severity: ModerationSeverity;
  label: string;
  pattern: RegExp;
};

const RULES: PatternRule[] = [
  {
    category: "off_platform_payment",
    severity: "high",
    label: "Payment outside platform",
    pattern:
      /\b(pay\s+(me\s+)?(on|via|through|outside)|outside\s+(the\s+)?platform|off[\s-]?platform\s+payment|send\s+(me\s+)?money|wire\s+transfer|western\s+union|moneygram|bank\s+transfer|iban|account\s+number|jazz\s*cash|easypaisa|easypaise|upi\s+id|crypto|bitcoin|btc|usdt|ethereum)\b/i,
  },
  {
    category: "scam",
    severity: "high",
    label: "Advance-fee / scam language",
    pattern:
      /\b(advance\s+payment|registration\s+fee|processing\s+fee|unlock\s+payment|guaranteed\s+income|double\s+your\s+money|investment\s+opportunity|get\s+rich|work\s+from\s+home\s+and\s+earn|mlm|pyramid\s+scheme|lottery\s+winner|inheritance|nigerian\s+prince)\b/i,
  },
  {
    category: "phishing",
    severity: "high",
    label: "Phishing / credential harvesting",
    pattern:
      /\b(verify\s+your\s+account|confirm\s+your\s+password|share\s+(your\s+)?otp|one[\s-]?time\s+password|login\s+link|click\s+here\s+to\s+verify|bit\.ly|tinyurl|t\.co\/|goo\.gl\/|suspicious\s+link)\b/i,
  },
  {
    category: "scam",
    severity: "medium",
    label: "Contact harvesting",
    pattern:
      /\b(whatsapp\s+me|message\s+me\s+on\s+whatsapp|contact\s+me\s+on\s+telegram|telegram\s+me|add\s+me\s+on\s+snap|my\s+personal\s+number|call\s+me\s+on\s+\+?\d{7,})\b/i,
  },
  {
    category: "harassment",
    severity: "high",
    label: "Threatening or abusive language",
    pattern:
      /\b(i\s+will\s+kill|i'?ll\s+kill|i\s+will\s+hurt|rape|nigger|fuck\s+you|kill\s+yourself|kys)\b/i,
  },
  {
    category: "harassment",
    severity: "medium",
    label: "Sexual harassment",
    pattern:
      /\b(send\s+nudes|nude\s+pics|sexy\s+pics|hook\s*up|sleep\s+with\s+me|sexual\s+favour)\b/i,
  },
  {
    category: "spam",
    severity: "low",
    label: "Spam / promotional content",
    pattern:
      /\b(buy\s+followers|cheap\s+essay|write\s+my\s+assignment\s+for\s+me|plagiarism[\s-]?free|casino|betting\s+tips|forex\s+signals)\b/i,
  },
];

const SEVERITY_RANK: Record<ModerationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const CATEGORY_LABEL: Record<ModerationCategory, string> = {
  scam: "Possible scam",
  off_platform_payment: "Off-platform payment",
  phishing: "Phishing risk",
  harassment: "Harassment",
  spam: "Spam",
};

export function moderationCategoryLabel(category: ModerationCategory) {
  return CATEGORY_LABEL[category];
}

export function scanMessage(body: string): MessageModerationResult {
  const text = body?.trim() || "";
  if (!text) {
    return { flagged: false, score: 0, severity: null, flags: [] };
  }

  const flags: ModerationFlag[] = [];
  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (match?.[0]) {
      flags.push({
        category: rule.category,
        severity: rule.severity,
        label: rule.label,
        match: match[0],
        index: match.index,
      });
    }
  }

  if (!flags.length) {
    return { flagged: false, score: 0, severity: null, flags: [] };
  }

  const score = flags.reduce((sum, flag) => sum + SEVERITY_RANK[flag.severity], 0);
  const severity = flags.reduce<ModerationSeverity>(
    (max, flag) => (SEVERITY_RANK[flag.severity] > SEVERITY_RANK[max] ? flag.severity : max),
    "low",
  );

  return { flagged: true, score, severity, flags };
}

export function scanMessages<T extends { id: string; body: string }>(
  messages: T[],
): Map<string, MessageModerationResult> {
  const out = new Map<string, MessageModerationResult>();
  for (const message of messages) {
    out.set(message.id, scanMessage(message.body));
  }
  return out;
}

export function conversationModerationSummary(
  results: Iterable<MessageModerationResult>,
): MessageModerationResult {
  const flags: ModerationFlag[] = [];
  let score = 0;
  let severity: ModerationSeverity | null = null;

  for (const result of results) {
    if (!result.flagged) continue;
    score += result.score;
    flags.push(...result.flags);
    if (!severity || (result.severity && SEVERITY_RANK[result.severity] > SEVERITY_RANK[severity])) {
      severity = result.severity;
    }
  }

  return {
    flagged: flags.length > 0,
    score,
    severity,
    flags,
  };
}

export type HighlightSegment = { text: string; highlight: boolean };

export function highlightModerationFlags(
  body: string,
  flags: ModerationFlag[],
): HighlightSegment[] {
  if (!flags.length) return [{ text: body, highlight: false }];

  const ranges = flags
    .map((flag) => ({ start: flag.index, end: flag.index + flag.match.length }))
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: body.slice(cursor, range.start), highlight: false });
    }
    segments.push({ text: body.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor), highlight: false });
  }
  return segments;
}
