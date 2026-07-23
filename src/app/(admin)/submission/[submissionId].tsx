import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Header } from '@/components/Header';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Divider, Field, Row, Screen, SegmentedControl, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { REJECT_REASON_LABEL, type Photo, type RejectReason } from '@/domain/types';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

const REASONS = Object.entries(REJECT_REASON_LABEL).map(([value, label]) => ({ value: value as RejectReason, label }));

export default function SubmissionReview() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const reviewer = useCurrentUser();
  const { data: submission } = useRepoQuery(() => repo.getSubmission(submissionId!), [submissionId], ['submissions']);
  const { data: allPhotos } = useRepoQuery(
    () => (submission ? repo.listPhotos(submission.farmId) : Promise.resolve([] as Photo[])),
    [submission?.farmId],
    ['photos'],
  );

  const photos = useMemo(
    () => (allPhotos ?? []).filter((p) => submission?.photoIds.includes(p.id)),
    [allPhotos, submission],
  );

  const [retake, setRetake] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<RejectReason>('blurry');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!submission) {
    return (
      <Screen>
        <Header title="Review" onBack={() => router.back()} />
        <Txt>Loading…</Txt>
      </Screen>
    );
  }

  const decided = submission.status === 'approved' || submission.status === 'retake_required';

  function toggle(id: string) {
    setRetake((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function approve() {
    setBusy(true);
    await repo.reviewSubmission(submission!.id, { type: 'approve', note: note || undefined }, reviewer?.id ?? 'system');
    setBusy(false);
    router.back();
  }

  async function requestRetakes() {
    setBusy(true);
    await repo.reviewSubmission(
      submission!.id,
      { type: 'reject', reason, note: note || undefined, retakePhotoIds: [...retake] },
      reviewer?.id ?? 'system',
    );
    setBusy(false);
    router.back();
  }

  return (
    <Screen scroll>
      <Header title={`Review ${submission.glowFarmId}`} subtitle={`${photos.length} photos`} onBack={() => router.back()} />

      <Txt variant="label">Tap a photo to mark it for retake</Txt>
      <Spacer size={spacing.sm} />
      <Row wrap gap={spacing.sm}>
        {photos.map((p) => {
          const marked = retake.has(p.id);
          return (
            <Pressable key={p.id} onPress={() => !decided && toggle(p.id)}>
              <View style={{ alignItems: 'center', width: 96 }}>
                <View style={{ borderWidth: 2, borderRadius: radius.md, borderColor: marked ? colors.dangerText : 'transparent' }}>
                  <PhotoThumb localKey={p.localKey} size={92} />
                </View>
                <Txt variant="caption" numberOfLines={1}>
                  {marked ? '↻ retake' : p.reviewState === 'rejected' ? '✗ rejected' : p.checklistKey}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </Row>

      {decided ? (
        <>
          <Divider />
          <Txt variant="subtitle">
            This submission was {submission.status === 'approved' ? 'approved ✅' : 'sent back for retakes ↻'}.
          </Txt>
        </>
      ) : (
        <>
          <Divider />
          {retake.size > 0 ? (
            <>
              <Txt variant="label">Reason for retake</Txt>
              <Spacer size={spacing.xs} />
              <SegmentedControl options={REASONS} value={reason} onChange={setReason} />
              <Spacer size={spacing.sm} />
            </>
          ) : null}
          <Field label="Reviewer note (optional)" value={note} onChangeText={setNote} placeholder="Explain what to fix…" multiline />
          <Spacer />
          {retake.size > 0 ? (
            <Button title={`Request ${retake.size} retake${retake.size === 1 ? '' : 's'}`} variant="danger" icon="↻" onPress={requestRetakes} loading={busy} full />
          ) : (
            <Button title="Approve all photos" icon="✅" onPress={approve} loading={busy} full />
          )}
        </>
      )}
    </Screen>
  );
}
