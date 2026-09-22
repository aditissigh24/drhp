/**
 * Risk-band colour scheme — single source of truth for the 4 bands.
 * Mirrors the backend bands: 0-20 GREEN · 20-60 YELLOW · 60-80 ORANGE · 80+ RED.
 * (Backend caps the score at 97; see MAX_DISPLAY_RISK_SCORE.)
 */
export type RiskBand = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export function scoreToBand(score: number): RiskBand {
  if (score >= 80) return 'RED';
  if (score >= 60) return 'ORANGE';
  if (score >= 40) return 'YELLOW';
  return 'GREEN';
}

export function bandLabel(band: RiskBand): string {
  return { RED: 'Critical Risk', ORANGE: 'High Risk', YELLOW: 'Moderate Risk', GREEN: 'Low Risk' }[band];
}

/** Full warning headline per band (shown next to the score). */
export function bandWarning(band: RiskBand): string {
  return {
    RED: 'CRITICAL - FULL PUMP-AND-DUMP PATTERN DETECTED',
    ORANGE: 'HIGH - STRONG MANIPULATION INDICATORS',
    YELLOW: 'MODERATE - SOME PROMOTIONAL ACTIVITY',
    GREEN: 'LOW - MINIMAL RISK PROFILE',
  }[band];
}

/** BubbleTag colour token (watchlist chip). */
export function bandColor(band: RiskBand): 'red' | 'orange' | 'yellow' | 'green' {
  return { RED: 'red', ORANGE: 'orange', YELLOW: 'yellow', GREEN: 'green' }[band] as
    'red' | 'orange' | 'yellow' | 'green';
}

export interface BandStyle { bg: string; border: string; text: string; icon: string; }

/** Inline pill styles (deep-dive header). */
export function bandStyle(band: RiskBand): BandStyle {
  switch (band) {
    case 'RED':    return { bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', icon: '#EF4444' };
    case 'ORANGE': return { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', icon: '#F97316' };
    case 'YELLOW': return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', icon: '#F59E0B' };
    default:       return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', icon: '#10B981' };
  }
}
