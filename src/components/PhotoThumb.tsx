import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GlowIcon } from '@/components/brand/GlowIcon';
import { files } from '@/data';
import { colors, radius } from '@/theme';

/** Resolves a FileStore key to a URI and renders it, with a placeholder tile. */
export function PhotoThumb({ localKey, size = 72 }: { localKey: string; size?: number }) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    files
      .getUri(localKey)
      .then((u) => {
        if (alive) {
          setUri(u);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [localKey]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <GlowIcon name="camera" size={size * 0.3} color={colors.textFaint} strokeWidth={loading ? 1.2 : 1.75} />
      )}
    </View>
  );
}
