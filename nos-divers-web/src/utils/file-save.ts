import { isNative } from "../lib/platform";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Save a file and share/download it.
 * - Web: triggers browser download
 * - Native: writes to device filesystem then opens share sheet
 */
export async function saveFile(
  filename: string,
  data: string | Blob,
  mimeType: string
): Promise<void> {
  if (isNative()) {
    let base64Data: string;

    if (data instanceof Blob) {
      base64Data = await blobToBase64(data);
    } else {
      base64Data = data;
    }

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: filename,
      url: result.uri,
    });
  } else {
    // Web: trigger browser download
    const blob = data instanceof Blob ? data : base64ToBlob(data, mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // Remove data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
