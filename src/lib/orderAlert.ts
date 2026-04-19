export type OrderAlertTone = 'classic' | 'bell' | 'soft';

export const ORDER_ALERT_TONE_KEY = 'order-alert-tone';
export const ORDER_ALERT_ENABLED_KEY = 'order-alert-enabled';

let sharedAudioContext: AudioContext | null = null;

const VALID_TONES: OrderAlertTone[] = ['classic', 'bell', 'soft'];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (sharedAudioContext) {
    return sharedAudioContext;
  }

  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Context) {
    return null;
  }

  sharedAudioContext = new Context();
  return sharedAudioContext;
}

function scheduleTone(
  context: AudioContext,
  {
    frequency,
    startAt,
    duration,
    gainValue = 0.12,
    oscillatorType = 'sine',
  }: {
    frequency: number;
    startAt: number;
    duration: number;
    gainValue?: number;
    oscillatorType?: OscillatorType;
  },
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = oscillatorType;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export function getSavedOrderAlertTone(): OrderAlertTone {
  const savedValue = localStorage.getItem(ORDER_ALERT_TONE_KEY);

  if (savedValue && VALID_TONES.includes(savedValue as OrderAlertTone)) {
    return savedValue as OrderAlertTone;
  }

  return 'classic';
}

export function setSavedOrderAlertTone(tone: OrderAlertTone) {
  localStorage.setItem(ORDER_ALERT_TONE_KEY, tone);
}

export function getSavedOrderAlertEnabled(): boolean {
  const savedValue = localStorage.getItem(ORDER_ALERT_ENABLED_KEY);
  return savedValue !== '0';
}

export function setSavedOrderAlertEnabled(isEnabled: boolean) {
  localStorage.setItem(ORDER_ALERT_ENABLED_KEY, isEnabled ? '1' : '0');
}

export async function playOrderAlertTone(tone: OrderAlertTone): Promise<void> {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    await context.resume().catch(() => undefined);
  }

  const startAt = context.currentTime + 0.02;

  switch (tone) {
    case 'bell':
      scheduleTone(context, { frequency: 780, startAt, duration: 0.2, gainValue: 0.14, oscillatorType: 'triangle' });
      scheduleTone(context, { frequency: 1040, startAt: startAt + 0.18, duration: 0.26, gainValue: 0.12, oscillatorType: 'triangle' });
      scheduleTone(context, { frequency: 1320, startAt: startAt + 0.36, duration: 0.32, gainValue: 0.1, oscillatorType: 'triangle' });
      break;
    case 'soft':
      scheduleTone(context, { frequency: 520, startAt, duration: 0.16, gainValue: 0.09, oscillatorType: 'sine' });
      scheduleTone(context, { frequency: 640, startAt: startAt + 0.17, duration: 0.16, gainValue: 0.09, oscillatorType: 'sine' });
      scheduleTone(context, { frequency: 760, startAt: startAt + 0.34, duration: 0.2, gainValue: 0.08, oscillatorType: 'sine' });
      break;
    default:
      scheduleTone(context, { frequency: 880, startAt, duration: 0.12, gainValue: 0.13, oscillatorType: 'square' });
      scheduleTone(context, { frequency: 880, startAt: startAt + 0.17, duration: 0.12, gainValue: 0.13, oscillatorType: 'square' });
      scheduleTone(context, { frequency: 660, startAt: startAt + 0.34, duration: 0.16, gainValue: 0.11, oscillatorType: 'square' });
      break;
  }
}
