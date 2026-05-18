import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface BarcodeController {
  stop: () => void;
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

export async function startScanner(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError?: (err: Error) => void,
): Promise<BarcodeController> {
  const reader = new BrowserMultiFormatReader(hints);
  let stopped = false;

  try {
    const controls = await reader.decodeFromVideoDevice(undefined, video, (result, _err, ctl) => {
      if (stopped) return;
      if (result) {
        const text = result.getText();
        if (text && /^[0-9]{6,14}$/.test(text)) {
          ctl.stop();
          onResult(text);
        }
      }
    });
    return {
      stop: () => {
        stopped = true;
        controls.stop();
      },
    };
  } catch (e) {
    onError?.(e as Error);
    return { stop: () => {} };
  }
}
