
export type QRType = 'TICKET' | 'MEMBER' | 'CAMPAIGN' | 'PAYMENT';

export interface QRData {
  type: QRType;
  id: string; // Event ID, Member ID, or Campaign ID
  subId?: string; // User ID inside a Ticket, or Discount Code
  timestamp?: number;
}

export interface ScanResult {
  success: boolean;
  message: string;
  data?: any; // The object found (Member, Event, etc.)
  timestamp: string;
  /** Raw QR string (used by Gate Scanner — do not pass human-readable messages here). */
  qrPayload?: string;
}
