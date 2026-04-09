const ATTRIBUTION_KEY = 'maxwell_campaign_attribution_v1';
const CLICK_TRACKED_PREFIX = 'maxwell_campaign_click_tracked_v1_';
const CONVERSION_TRACKED_PREFIX = 'maxwell_campaign_conversion_tracked_v1_';
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type AttributionRecord = {
  source: string;
  capturedAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function normalizeSource(source: string): string {
  return source.trim().toLowerCase();
}

function parseRecord(raw: string | null): AttributionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AttributionRecord;
    if (!parsed?.source || typeof parsed.capturedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export const CampaignAttributionService = {
  saveSource(source: string): string {
    const normalized = normalizeSource(source);
    if (!normalized || !canUseStorage()) return normalized;

    const record: AttributionRecord = {
      source: normalized,
      capturedAt: Date.now(),
    };
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(record));
    return normalized;
  },

  getSource(): string | undefined {
    if (!canUseStorage()) return undefined;
    const record = parseRecord(window.localStorage.getItem(ATTRIBUTION_KEY));
    if (!record) return undefined;

    if (Date.now() - record.capturedAt > ATTRIBUTION_TTL_MS) {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return undefined;
    }
    return normalizeSource(record.source);
  },

  shouldTrackClick(source: string): boolean {
    if (!canUseStorage()) return true;
    const normalized = normalizeSource(source);
    if (!normalized) return false;
    const key = `${CLICK_TRACKED_PREFIX}${normalized}`;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    return true;
  },

  shouldTrackConversion(transactionId: string): boolean {
    if (!canUseStorage()) return true;
    const normalizedId = transactionId.trim();
    if (!normalizedId) return false;
    const key = `${CONVERSION_TRACKED_PREFIX}${normalizedId}`;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    return true;
  },
};
