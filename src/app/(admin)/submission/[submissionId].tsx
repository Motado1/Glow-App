import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Header } from '@/components/Header';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Divider, Field, IconLine, Loading, Row, Screen, SegmentedControl, Spacer, Txt } from '@/components/ui';
import { checklistLabel } from '@/features/photos/checklist';
import { repo } from '@/data';
import { CONNECTIVITY_LABEL, REJECT_REASON_LABEL, type Photo, type RejectReason } from '@/domain/types';
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
  const { data: boxInstall } = useRepoQuery(
    () => (submission?.phase === 'post_install' ? repo.getBoxInstallation(submission.farmId) : Promise.resolve(null)),
    [submission?.farmId, submission?.phase],
    ['box_installations'],
  );

  const [retake, setRetake] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<RejectReason>('blurry');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!submission) {
    return (
      <Screen>
        <Header title="Review" onBack={() => router.back()} />
        <Loading />
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
      <Header
        eyebrow={submission.phase === 'post_install' ? 'Post-install' : 'Pre-install'}
        title={`Review ${submission.glowFarmId}`}
        subtitle={`${photos.length} photo${photos.length === 1 ? '' : 's'}`}
        onBack={() => router.back()}
      />
      {boxInstall ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Txt variant="subtitle">Monitoring box</Txt>
          <Row gap={spacing.sm} wrap>
            <Txt variant="mono" color={colors.textMuted}>
              {boxInstall.boxSerial}
            </Txt>
            <Txt variant="caption">{boxInstall.networkType || 'Network not recorded'}</Txt>
          </Row>
          <Txt variant="caption">
            Connectivity {CONNECTIVITY_LABEL[boxInstall.connectivityTest.status].toLowerCase()}
            {boxInstall.problems ? ` · Deficiency: ${boxInstall.problems}` : ''}
          </Txt>
        </Card>
      ) : null}

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
                {marked ? (
                  <IconLine icon="retake" size={11} color={colors.dangerText} numberOfLines={1}>
                    Marked
                  </IconLine>
                ) : p.reviewState === 'rejected' ? (
                  <IconLine icon="cross" size={11} color={colors.dangerText} numberOfLines={1}>
                    Rejected
                  </IconLine>
                ) : (
                  <Txt variant="caption" numberOfLines={1} align="center">
                    {checklistLabel(p.checklistKey)}
                  </Txt>
                )}
              </View>
            </Pressable>
          );
        })}
      </Row>

      {decided ? (
        <>
          <Divider />
          <IconLine
            icon={submission.status === 'approved' ? 'check' : 'retake'}
            variant="subtitle"
            size={15}
            color={submission.status === 'approved' ? colors.successText : colors.dangerText}
          >
            {submission.status === 'approved' ? 'Approved.' : 'Sent back for retakes.'}
          </IconLine>
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
            <Button title={`Request ${retake.size} retake${retake.size === 1 ? '' : 's'}`} variant="danger" icon="retake" onPress={requestRetakes} loading={busy} full />
          ) : (
            <Button title="Approve all photos" icon="check" onPress={approve} loading={busy} full />
          )}
        </>
      )}
    </Screen>
  );
}
