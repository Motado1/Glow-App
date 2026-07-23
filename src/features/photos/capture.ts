/**
 * Photo capture + import (requirements §8, §9). Uses expo-image-picker for both
 * camera capture and library/drone import — no custom CameraView needed, and it
 * degrades gracefully on web (library import works; live capture is mobile-only).
 * Images are best-effort downscaled before storage to keep the FileStore small.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface Picked {
  uri: string;
  width?: number;
  height?: number;
}

async function downscale(uri: string, width?: number, height?: number): Promise<Picked> {
  try {
    // The legacy manipulate API remains exported in SDK 57; typed loosely to
    // stay resilient across the API transition.
    const im = ImageManipulator as unknown as {
      manipulateAsync?: (
        uri: string,
        actions: { resize: { width: number } }[],
        opts: { compress: number; format: string },
      ) => Promise<{ uri: string; width: number; height: number }>;
      SaveFormat?: { JPEG: string };
    };
    if (im.manipulateAsync) {
      const r = await im.manipulateAsync(uri, [{ resize: { width: 2048 } }], {
        compress: 0.7,
        format: im.SaveFormat?.JPEG ?? 'jpeg',
      });
      return { uri: r.uri, width: r.width, height: r.height };
    }
  } catch {
    // fall through to original
  }
  return { uri, width, height };
}

export async function captureFromCamera(): Promise<Picked | null> {
  if (Platform.OS === 'web') {
    throw new Error('Live capture is available in the mobile app — use Import on web.');
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera permission was denied.');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return downscale(a.uri, a.width, a.height);
}

export async function pickFromLibrary(multiple = true): Promise<Picked[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: multiple,
    quality: 0.8,
    mediaTypes: 'images',
  });
  if (res.canceled || !res.assets?.length) return [];
  const out: Picked[] = [];
  for (const a of res.assets) {
    out.push(await downscale(a.uri, a.width, a.height));
  }
  return out;
}
