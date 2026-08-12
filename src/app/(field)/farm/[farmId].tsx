import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Header } from '@/components/Header';
import { PhotoThumb } from '@/components/PhotoThumb';
import { fieldPreInstallStatus, SYNC_LABEL, syncTone } from '@/components/statusHelpers';
import { Badge, Button, Card, ChecklistMark, Divider, Field, IconLine, Loading, Row, Screen, Spacer, StatusPill, Txt } from '@/components/ui';
import { files, repo } from '@/data';
import { fieldMessage } from '@/features/checkin/classify';
import { useCheckIn } from '@/features/checkin/useCheckIn';
import { REJECT_REASON_LABEL, type ChecklistItem, type Photo } from '@/domain/types';
import { canContactFarm } from '@/domain/permissions';
import { isFieldBlocked } from '@/domain/status';
import { captureFromCamera, pickFromLibrary, type Picked } from '@/features/photos/capture';
import { canSubmit, checklistFor, computeChecklistProgress, missingRequired } from '@/features/photos/checklist';
import { buildPhotoFileName } from '@/features/photos/fileName';
import { buildAppleMapsDestUrl, buildGoogleMapsDestUrl } from '@/features/routing/mapsLinks';
import { nowIso } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { useSyncStore } from '@/stores/syncStore';
import { colors, radius, spacing } from '@/theme';

const CHECKLIST = checklistFor('pre_install');

export default function FieldFarmDetail() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const user = useCurrentUser();
  const enqueue = useSyncStore((s) => s.enqueuePhotoUpload);

  const { data: farm } = useRepoQuery(() => repo.getFarm(farmId!), [farmId], ['farms']);
  const checkIn = useCheckIn(farm ?? undefined, user?.id, 'pre_install');
  const { data: photos } = useRepoQuery(
    () => (farm ? repo.listPhotos(farm.id, 'pre_install') : Promise.resolve([] as Photo[])),
    [farm?.id],
    ['photos'],
  );
  const { data: myFarms } = useRepoQuery(() => (user ? repo.listFarms({ assignedTo: user.id }) : Promise.resolve([])), [user?.id], ['farms']);

  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obstructions, setObstructions] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const list = photos ?? [];
  const progress = useMemo(() => computeChecklistProgress(CHECKLIST, list), [list]);
  const missing = useMemo(() => missingRequired(CHECKLIST, list), [list]);
  const ready = canSubmit(CHECKLIST, list);

  if (!farm) {
    return (
      <Screen>
        <Header title="Farm" onBack={() => router.back()} />
        <Loading />
      </Screen>
    );
  }

  const st = fieldPreInstallStatus(farm.preInstallStatus);
  const canContact = user ? canContactFarm(user, farm) : false;
  const onHold = isFieldBlocked(farm.preInstallStatus);
  const noteValue = obstructions ?? farm.obstructionNotes ?? '';

  async function saveObstructions() {
    setSavingNote(true);
    await repo.updateFarm(farm!.id, { obstructionNotes: noteValue.trim() || undefined }, user?.id);
    setSavingNote(false);
  }

  async function addOne(item: ChecklistItem, picked: Picked, source: 'camera' | 'import') {
    const now = nowIso();
    const index = list.filter((p) => p.checklistItemId === item.id).length + 1;
    const fileName = buildPhotoFileName({ glowFarmId: farm!.glowFarmId, phase: 'pre_install', checklistKey: item.key, index, dateIso: now });
    await files.persist(picked.uri, fileName);
    const saved = await repo.savePhoto({
      farmId: farm!.id,
      glowFarmId: farm!.glowFarmId,
      phase: 'pre_install',
      checklistItemId: item.id,
      checklistKey: item.key,
      fileName,
      localKey: fileName,
      width: picked.width,
      height: picked.height,
      source,
      syncState: 'queued',
      attempts: 0,
      capturedAt: now,
      capturedBy: user?.id ?? 'unknown',
      // The device's position, from this visit's check-in — NOT `farm.location`,
      // which is where the farm is and would make every distance read as zero.
      location: checkIn?.point,
      locationAccuracyM: checkIn?.accuracyMeters,
    });
    await enqueue(saved.id);
    if (farm!.preInstallStatus === 'assigned' || farm!.preInstallStatus === 'route_planned' || farm!.preInstallStatus === 'retake_required') {
      await repo.updateFarm(farm!.id, { preInstallStatus: 'in_progress' }, user?.id);
    }
  }

  async function onAdd(item: ChecklistItem, mode: 'camera' | 'import') {
    setError(null);
    setBusyItem(item.id + mode);
    try {
      let picks: Picked[] = [];
      if (mode === 'camera') {
        const p = await captureFromCamera();
        if (p) picks = [p];
      } else {
        picks = await pickFromLibrary(true);
      }
      for (const pk of picks) await addOne(item, pk, mode === 'camera' ? 'camera' : 'import');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That photo could not be saved. Try again.');
    } finally {
      setBusyItem(null);
    }
  }

  function navigate() {
    if (!farm!.location) {
      setError('This farm has no coordinates yet.');
      return;
    }
    const url = Platform.OS === 'ios' ? buildAppleMapsDestUrl(farm!.location, farm!.name) : buildGoogleMapsDestUrl(farm!.location);
    Linking.openURL(url).catch(() => setError('No maps app responded on this device.'));
  }

  async function submit() {
    setSubmitting(true);
    await repo.submitForReview(farm!.id, 'pre_install', user?.id ?? 'unknown');
    setSubmitting(false);
    // Auto-advance to the next incomplete assigned farm.
    const next = (myFarms ?? []).find(
      (f) => f.id !== farm!.id && !['approved', 'complete', 'photos_submitted', 'under_review'].includes(f.preInstallStatus),
    );
    router.replace((next ? `/(field)/farm/${next.id}` : '/(field)/farms') as never);
  }

  return (
    <Screen scroll>
      <Header eyebrow={farm.glowFarmId} title={farm.name} onBack={() => router.back()} />
      <Row justify="space-between" wrap gap={spacing.sm}>
        <StatusPill label={st.label} tone={st.tone} />
        {!ready ? <Badge label={`${missing.length} required left`} tone="warning" /> : <Badge label="Ready to submit" tone="success" />}
      </Row>

      <Spacer />
      <Card>
        <Txt variant="body">{farm.address}</Txt>
        {farm.accessInstructions ? (
          <View style={{ marginTop: 6 }}>
            <IconLine icon="key">{farm.accessInstructions}</IconLine>
          </View>
        ) : null}
        {checkIn ? (
          <View style={{ marginTop: spacing.sm }}>
            <IconLine
              icon={checkIn.verdict === 'on_site' ? 'check' : checkIn.verdict === 'off_site' ? 'alert' : 'pin'}
              color={
                checkIn.verdict === 'on_site'
                  ? colors.successText
                  : checkIn.verdict === 'off_site'
                    ? colors.warningText
                    : colors.textFaint
              }
            >
              {fieldMessage(checkIn)}
            </IconLine>
          </View>
        ) : null}
        <Spacer size={spacing.sm} />
        <Row gap={spacing.sm} wrap>
          <Button small title="Navigate" icon="navigate" onPress={navigate} />
          {canContact && farm.contact?.phone ? (
            <>
              <Button small variant="secondary" title="Call" icon="phone" onPress={() => Linking.openURL(`tel:${farm.contact!.phone}`)} />
              <Button small variant="secondary" title="Text" icon="message" onPress={() => Linking.openURL(`sms:${farm.contact!.phone}`)} />
            </>
          ) : null}
          <Button small variant="ghost" title="Flag an issue" icon="alert" onPress={() => router.push(`/(field)/problem?farmId=${farm.id}` as never)} />
        </Row>
      </Card>

      {onHold ? (
        <>
          <Spacer size={spacing.sm} />
          <Card>
            <IconLine icon="hold" variant="subtitle" size={15} color={colors.text}>
              Reported to the office
            </IconLine>
            <Txt variant="caption">
              We've passed this on. You'll be notified if anything changes — no need to report it again.
            </Txt>
          </Card>
        </>
      ) : null}

      {farm.preInstallStatus === 'retake_required' ? (
        <>
          <Spacer size={spacing.sm} />
          <Card style={{ borderColor: colors.dangerText, borderWidth: 1 }}>
            <IconLine icon="retake" variant="subtitle" size={15} color={colors.dangerText}>
              Retakes requested
            </IconLine>
            {list
              .filter((p) => p.reviewState === 'rejected')
              .slice(0, 4)
              .map((p) => (
                <Txt key={p.id} variant="caption">
                  • {p.checklistKey}: {p.rejectionReason ? REJECT_REASON_LABEL[p.rejectionReason] : 'rejected'}
                  {p.reviewNote ? ` — ${p.reviewNote}` : ''}
                </Txt>
              ))}
          </Card>
        </>
      ) : null}

      {error ? (
        <Txt color={colors.dangerText} style={{ marginTop: spacing.sm }}>
          {error}
        </Txt>
      ) : null}

      <Divider />
      <Txt variant="overline">Pre-install checklist</Txt>
      <Spacer size={spacing.sm} />

      {progress.map((pr) => (
        <Card key={pr.item.id} style={{ marginBottom: spacing.sm }}>
          <Row justify="space-between" align="flex-start" gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Row gap={spacing.sm}>
                <Txt variant="subtitle">{pr.item.label}</Txt>
                {pr.item.required ? <Badge label="required" tone="neutral" /> : <Badge label="optional" tone="neutral" />}
              </Row>
              {pr.item.description ? <Txt variant="caption">{pr.item.description}</Txt> : null}
            </View>
            <ChecklistMark satisfied={pr.satisfied} needsRetake={pr.needsRetake} required={pr.item.required} />
          </Row>

          {pr.photos.length > 0 ? (
            <>
              <Spacer size={spacing.sm} />
              <Row wrap gap={spacing.sm}>
                {pr.photos.map((p) => (
                  <View key={p.id} style={{ alignItems: 'center', width: 74 }}>
                    <View style={{ borderWidth: p.reviewState === 'rejected' ? 2 : 0, borderColor: colors.dangerText, borderRadius: radius.md }}>
                      <PhotoThumb localKey={p.localKey} size={70} />
                    </View>
                    <Badge label={SYNC_LABEL[p.syncState]} tone={syncTone(p.syncState)} />
                  </View>
                ))}
              </Row>
            </>
          ) : null}

          <Spacer size={spacing.sm} />
          <Row gap={spacing.sm}>
            <Button small title="Camera" icon="camera" loading={busyItem === pr.item.id + 'camera'} onPress={() => onAdd(pr.item, 'camera')} />
            <Button small variant="secondary" title="Import" icon="image" loading={busyItem === pr.item.id + 'import'} onPress={() => onAdd(pr.item, 'import')} />
          </Row>
        </Card>
      ))}

      <Divider />
      <Txt variant="overline">Access limitations / obstructions</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <Field
          value={noteValue}
          onChangeText={setObstructions}
          placeholder="Locked gate, steep driveway, dogs, overgrown access…"
          autoCapitalize="sentences"
          multiline
        />
        <Spacer size={spacing.sm} />
        <Button small variant="secondary" title="Save note" icon="save" loading={savingNote} onPress={saveObstructions} />
      </Card>

      <Spacer />
      {!ready ? (
        <Txt variant="caption" color={colors.warningText}>
          Missing required: {missing.map((m) => m.label).join(', ')}
        </Txt>
      ) : null}
      <Spacer size={spacing.sm} />
      <Button title="Submit for review" icon="upload" onPress={submit} loading={submitting} disabled={!ready} full />
      <Spacer size={spacing.xxxl} />
    </Screen>
  );
}
