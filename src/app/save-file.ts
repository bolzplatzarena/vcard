import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface NativeApi {
  isNative: () => boolean;
  writeFile: typeof Filesystem.writeFile;
  share: typeof Share.share;
}

// Capacitor plugins are proxies that cannot be spied on, so tests pass their own NativeApi.
const capacitorApi: NativeApi = {
  isNative: () => Capacitor.isNativePlatform(),
  writeFile: options => Filesystem.writeFile(options),
  share: options => Share.share(options),
};

// Saves an image: browser download on the web, native share sheet ("Save to Photos") in the apps,
// because <a download> does nothing inside the Android/iOS WebView.
export async function saveFile(blob: Blob, fileName: string, native = capacitorApi): Promise<void> {
  if (!native.isNative()) {
    downloadInBrowser(blob, fileName);
    return;
  }

  const { uri } = await native.writeFile({
    path: fileName,
    data: await toBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await native.share({ title: fileName, files: [uri] });
  } catch (error) {
    // Closing the share sheet rejects with "Share canceled"; that is not an error for the user.
    if (!(error instanceof Error && /cancel/i.test(error.message))) {
      throw error;
    }
  }
}

function downloadInBrowser(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = (): void => reject(reader.error ?? new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}
