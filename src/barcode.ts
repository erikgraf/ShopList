import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface BarcodeController {
  stop: () => void;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

/**
 * Enumerate available video input devices. Triggers a permission prompt the
 * first time so that labels are populated (iOS / Safari behaviour).
 */
export async function listCameras(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // permission denied — labels will be blank but we can still return IDs
  }
  const devs = await navigator.mediaDevices.enumerateDevices();
  return devs
    .filter((d) => d.kind === 'videoinput')
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
}

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

async function pickBackCamera(): Promise<string | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // permission denied or no camera — caller will surface a clearer error
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === 'videoinput');
  if (!cams.length) return null;
  const back = cams.find((d) => /back|rear|environment|außen|hinten/i.test(d.label));
  return (back ?? cams[cams.length - 1]).deviceId || null;
}

export async function startScanner(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError?: (err: Error) => void,
  onTick?: () => void,
  preferredDeviceId?: string,
  /** When true, the scanner keeps running after a successful decode (shop
   *  mode). Defaults to false: the one-shot scanner stops on first hit. */
  continuous = false,
): Promise<BarcodeController> {
  if (!navigator.mediaDevices?.getUserMedia) {
    onError?.(
      new Error(
        'Dieser Browser unterstützt keinen Kamera-Zugriff. Auf iOS bitte Safari verwenden und die Seite über HTTPS oder localhost öffnen.',
      ),
    );
    return { stop: () => {} };
  }

  const reader = new BrowserMultiFormatReader(hints);
  let stopped = false;

  try {
    const deviceId = preferredDeviceId ?? (await pickBackCamera()) ?? undefined;
    const controls = await reader.decodeFromVideoDevice(
      deviceId,
      video,
      (result, _err, ctl) => {
        if (stopped) return;
        onTick?.();
        if (result) {
          const text = result.getText();
          if (text) {
            if (!continuous) ctl.stop();
            onResult(text);
          }
        }
      },
    );
    return {
      stop: () => {
        stopped = true;
        controls.stop();
      },
    };
  } catch (e) {
    const err = e as DOMException & { name?: string; message?: string };
    let friendly: string;
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        friendly = 'Kamera-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben.';
        break;
      case 'NotFoundError':
      case 'OverconstrainedError':
        friendly = 'Keine passende Kamera gefunden.';
        break;
      case 'NotReadableError':
        friendly = 'Die Kamera wird gerade von einer anderen App verwendet.';
        break;
      default:
        friendly = err.message || 'Kamera konnte nicht gestartet werden.';
    }
    onError?.(new Error(friendly));
    return { stop: () => {} };
  }
}
