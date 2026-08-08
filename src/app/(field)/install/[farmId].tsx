import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Header } from '@/components/Header';
import { PhotoThumb } from '@/components/PhotoThumb';
import { boxInstallStatus, SYNC_LABEL, syncTone } from '@/components/statusHelpers';
import { GlowIcon } from '@/components/brand/GlowIcon';
import { Badge, Button, Card, ChecklistMark, Divider, Field, IconLine, Loading, Row, Screen, SegmentedControl, Spacer, StatusPill, Txt } from '@/components/ui';
import { files, repo } from '@/data';
import type { BoxInstallationInput, ChecklistItem, ConnectivityStatus, NetworkType, Photo, Submission } from '@/domain/types';
import { captureFromCamera, pickFromLibrary, type Picked } from '@/features/photos/capture';
import { canSubmit, checklistFor, computeChecklistProgress, missingRequired } from '@/features/photos/checklist';
import { buildPhotoFileName } from '@/features/photos/fileName';
import { nowIso } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { useSyncStore } from '@/stores/syncStore';
import { colors, radius, spacing } from '@/theme';

const CHECKLIST = checklistFor('post_install');

interface FormState {
  boxSerial: string;
  boxVersion: string;
  powerSupply: string;
  electricalSystemType: string;
  voltage: string;
  phaseConfig: string;
  ctConfig: string;
  ctRatio: string;
  networkType: NetworkType;
  simInfo: string;
  ethernetInfo: string;
  programmingCompleted: boolean;
  connectivityStatus: ConnectivityStatus;
  readings: string;
  problems: string;
  followUpRequired: boolean;
}

const EMPTY: FormState = {
  boxSerial: '', boxVersion: '', powerSupply: '', electricalSystemType: '', voltage: '',
  phaseConfig: '', ctConfig: '', ctRatio: '', networkType: 'cellular', simInfo: '',
  ethernetInfo: '', programmingCompleted: false, connectivityStatus: 'pending', readings: '',
  problems: '', followUpRequired: false,
};

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle}>
      <Row gap={spacing.sm}>
        <GlowIcon name={value ? 'checkbox-on' : 'checkbox-off'} size={22} color={value ? colors.brand : colors.borderStrong} />
        <Txt variant="body">{label}</Txt>
      </Row>
    </Pressable>
  );
}

export default function InstallScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const user = useCurrentUser();
  const enqueue = useSyncStore((s) => s.enqueuePhotoUpload);

  const { data: farm } = useRepoQuery(() => repo.getFarm(farmId!), [farmId], ['farms']);
  const { data: existing } = useRepoQuery(() => repo.getBoxInstallation(farmId!), [farmId], ['box_installations']);
  const { data: photos } = useRepoQuery(
    () => (farm ? repo.listPhotos(farm.id, 'post_install') : Promise.resolve([] as Photo[])),
    [farm?.id],
    ['photos'],
  );
  const { data: subs } = useRepoQuery(
    () => (farm ? repo.listSubmissions({ farmId: farm.id, phase: 'post_install' }) : Promise.resolve([] as Submission[])),
    [farm?.id],
    ['submissions'],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the form from an existing installation record once.
  useEffect(() => {
    if (existing && !hydrated) {
      setForm({
        boxSerial: existing.boxSerial ?? '',
        boxVersion: existing.boxVersion ?? '',
        powerSupply: existing.powerSupply ?? '',
        electricalSystemType: existing.electricalSystemType ?? '',
        voltage: existing.voltage ?? '',
        phaseConfig: existing.phaseConfig ?? '',
        ctConfig: existing.ctConfig ?? '',
        ctRatio: existing.ctRatio ?? '',
        networkType: existing.networkType ?? 'cellular',
        simInfo: existing.simInfo ?? '',
        ethernetInfo: existing.ethernetInfo ?? '',
        programmingCompleted: existing.programmingCompleted,
        connectivityStatus: existing.connectivityTest.status,
        readings: existing.connectivityTest.readings ?? '',
        problems: existing.problems ?? '',
        followUpRequired: existing.followUpRequired,
      });
      setHydrated(true);
    }
  }, [existing, hydrated]);

  const list = photos ?? [];
  const progress = useMemo(() => computeChecklistProgress(CHECKLIST, list), [list]);
  const missing = useMemo(() => missingRequired(CHECKLIST, list), [list]);
  const photosReady = canSubmit(CHECKLIST, list);
  const latestSub = (subs ?? [])[0];

  if (!farm) {
    return (
      <Screen>
        <Header title="Installation" onBack={() => router.back()} />
        <Loading />
      </Screen>
    );
  }

  const st = boxInstallStatus(farm.boxInstallStatus ?? 'ready_for_assignment');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function buildInput(): BoxInstallationInput {
    return {
      farmId: farm!.id,
      glowFarmId: farm!.glowFarmId,
      boxSerial: form.boxSerial.trim(),
      installerId: user?.id ?? 'unknown',
      installedAt: nowIso(),
      location: farm!.location,
      boxVersion: form.boxVersion || undefined,
      powerSupply: form.powerSupply || undefined,
      electricalSystemType: form.electricalSystemType || undefined,
      voltage: form.voltage || undefined,
      phaseConfig: form.phaseConfig || undefined,
      ctConfig: form.ctConfig || undefined,
      ctRatio: form.ctRatio || undefined,
      networkType: form.networkType,
      simInfo: form.simInfo || undefined,
      ethernetInfo: form.ethernetInfo || undefined,
      programmingCompleted: form.programmingCompleted,
      serverConnected: form.connectivityStatus === 'passed',
      connectivityTest: {
        status: form.connectivityStatus,
        testedAt: form.connectivityStatus === 'pending' ? undefined : nowIso(),
        readings: form.readings || undefined,
      },
      problems: form.problems || undefined,
      followUpRequired: form.followUpRequired || form.connectivityStatus === 'failed',
      finalApproved: existing?.finalApproved ?? false,
    };
  }

  async function saveRecord() {
    if (!form.boxSerial.trim()) {
      setError('A box serial number is required.');
      return;
    }
    setError(null);
    setSavingRecord(true);
    await repo.saveBoxInstallation(buildInput(), user?.id ?? 'unknown');
    setSavingRecord(false);
  }

  async function addOne(item: ChecklistItem, picked: Picked, source: 'camera' | 'import') {
    const now = nowIso();
    const index = list.filter((p) => p.checklistItemId === item.id).length + 1;
    const fileName = buildPhotoFileName({ glowFarmId: farm!.glowFarmId, phase: 'post_install', checklistKey: item.key, index, dateIso: now });
    await files.persist(picked.uri, fileName);
    const saved = await repo.savePhoto({
      farmId: farm!.id, glowFarmId: farm!.glowFarmId, phase: 'post_install', checklistItemId: item.id,
      checklistKey: item.key, fileName, localKey: fileName, width: picked.width, height: picked.height,
      source, syncState: 'queued', attempts: 0, capturedAt: now, capturedBy: user?.id ?? 'unknown', location: farm!.location,
    });
    await enqueue(saved.id);
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

  const canSubmitAll = !!form.boxSerial.trim() && form.connectivityStatus !== 'pending' && photosReady;

  async function submit() {
    setSubmitting(true);
    await repo.saveBoxInstallation(buildInput(), user?.id ?? 'unknown');
    await repo.submitForReview(farm!.id, 'post_install', user?.id ?? 'unknown');
    setSubmitting(false);
    router.replace('/(field)/farms' as never);
  }

  return (
    <Screen scroll>
      <Header eyebrow={`${farm.glowFarmId} · Box installation`} title={farm.name} onBack={() => router.back()} />
      <Row justify="space-between" wrap gap={spacing.sm}>
        <StatusPill label={st.label} tone={st.tone} />
        {farm.equipmentDetails ? <IconLine icon="settings">{farm.equipmentDetails}</IconLine> : null}
      </Row>

      {farm.boxInstallStatus === 'correction_required' && latestSub?.reviewNote ? (
        <>
          <Spacer size={spacing.sm} />
          <Card style={{ borderColor: colors.dangerText, borderWidth: 1 }}>
            <IconLine icon="alert" variant="subtitle" size={15} color={colors.dangerText}>
                Correction requested
              </IconLine>
            <Txt variant="caption">{latestSub.reviewNote}</Txt>
          </Card>
        </>
      ) : null}

      {error ? <Txt color={colors.dangerText} style={{ marginTop: spacing.sm }}>{error}</Txt> : null}

      {/* Monitoring box + electrical record (§11) */}
      <Divider />
      <Txt variant="overline">Monitoring box</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <Row gap={spacing.sm} align="flex-end">
          <View style={{ flex: 1 }}>
            <Field label="Box serial number *" value={form.boxSerial} onChangeText={(v) => set('boxSerial', v)} placeholder="GLOW-BOX-…" autoCapitalize="none" />
          </View>
          <Button small variant="secondary" title="Scan" icon="scan" onPress={() => set('boxSerial', `GLOW-BOX-${farm.glowFarmId.slice(3)}`)} />
        </Row>
        <Spacer size={spacing.sm} />
        <Field label="Box version" value={form.boxVersion} onChangeText={(v) => set('boxVersion', v)} placeholder="v3.2" />
      </Card>

      <Spacer size={spacing.sm} />
      <Txt variant="overline">Electrical</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <Field label="Electrical system type" value={form.electricalSystemType} onChangeText={(v) => set('electricalSystemType', v)} placeholder="Split-phase" autoCapitalize="sentences" />
        <Spacer size={spacing.sm} />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label="Voltage" value={form.voltage} onChangeText={(v) => set('voltage', v)} placeholder="240V" /></View>
          <View style={{ flex: 1 }}><Field label="Phase" value={form.phaseConfig} onChangeText={(v) => set('phaseConfig', v)} placeholder="Single" autoCapitalize="sentences" /></View>
        </Row>
        <Spacer size={spacing.sm} />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label="CT config" value={form.ctConfig} onChangeText={(v) => set('ctConfig', v)} placeholder="2 × 200A" /></View>
          <View style={{ flex: 1 }}><Field label="CT ratio" value={form.ctRatio} onChangeText={(v) => set('ctRatio', v)} placeholder="200:0.1" /></View>
        </Row>
        <Spacer size={spacing.sm} />
        <Field label="Power supply" value={form.powerSupply} onChangeText={(v) => set('powerSupply', v)} placeholder="120V AC adapter" autoCapitalize="sentences" />
      </Card>

      <Spacer size={spacing.sm} />
      <Txt variant="overline">Network</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <SegmentedControl
          options={[{ value: 'cellular', label: 'Cellular' }, { value: 'ethernet', label: 'Ethernet' }, { value: 'wifi', label: 'Wi-Fi' }]}
          value={form.networkType || 'cellular'}
          onChange={(v) => set('networkType', v as NetworkType)}
        />
        <Spacer size={spacing.sm} />
        {form.networkType === 'ethernet' ? (
          <Field label="Ethernet info" value={form.ethernetInfo} onChangeText={(v) => set('ethernetInfo', v)} placeholder="Static IP / DHCP…" />
        ) : (
          <Field label="SIM info" value={form.simInfo} onChangeText={(v) => set('simInfo', v)} placeholder="SIM / carrier…" />
        )}
        <Spacer size={spacing.sm} />
        <Toggle label="Programming completed" value={form.programmingCompleted} onToggle={() => set('programmingCompleted', !form.programmingCompleted)} />
      </Card>

      <Spacer size={spacing.sm} />
      <Txt variant="overline">Connectivity test</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <SegmentedControl
          options={[
                { value: 'pending', label: 'Not tested' },
                { value: 'passed', label: 'Passed', icon: 'check' },
                { value: 'failed', label: 'Failed', icon: 'cross' },
              ]}
          value={form.connectivityStatus}
          onChange={(v) => set('connectivityStatus', v as ConnectivityStatus)}
        />
        <Spacer size={spacing.sm} />
        <Field label="Test readings" value={form.readings} onChangeText={(v) => set('readings', v)} placeholder="e.g. RSSI, baseline kWh, server handshake" autoCapitalize="sentences" />
        {form.connectivityStatus === 'failed' ? (
          <Txt variant="caption" color={colors.dangerText} style={{ marginTop: spacing.xs }}>
            We'll let the office know so a follow-up can be scheduled.
          </Txt>
        ) : null}
      </Card>

      <Spacer size={spacing.sm} />
      <Field label="Notes for the office" value={form.problems} onChangeText={(v) => set('problems', v)} placeholder="Anything needing follow-up…" multiline />
      <Spacer size={spacing.sm} />
      <Button title="Save installation details" variant="secondary" icon="save" onPress={saveRecord} loading={savingRecord} full />

      {/* Post-install photo checklist */}
      <Divider />
      <Row justify="space-between">
        <Txt variant="overline">Post-install photos</Txt>
        {photosReady ? <Badge label="Ready" tone="success" /> : <Badge label={`${missing.length} required left`} tone="warning" />}
      </Row>
      <Spacer size={spacing.sm} />
      {progress.map((pr) => (
        <Card key={pr.item.id} style={{ marginBottom: spacing.sm }}>
          <Row justify="space-between" align="flex-start" gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Row gap={spacing.sm}>
                <Txt variant="subtitle">{pr.item.label}</Txt>
                {pr.item.required ? <Badge label="required" tone="neutral" /> : <Badge label="optional" tone="neutral" />}
              </Row>
            </View>
            <ChecklistMark satisfied={pr.satisfied} required={pr.item.required} />
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

      <Spacer />
      {!canSubmitAll ? (
        <Txt variant="caption" color={colors.warningText}>
          To submit: enter a serial, record a connectivity result, and capture all required photos
          {missing.length ? ` (missing: ${missing.map((m) => m.label).join(', ')})` : ''}.
        </Txt>
      ) : null}
      <Spacer size={spacing.sm} />
      <Button title="Submit installation for review" icon="upload" onPress={submit} loading={submitting} disabled={!canSubmitAll} full />
      <Spacer size={spacing.xxxl} />
    </Screen>
  );
}
