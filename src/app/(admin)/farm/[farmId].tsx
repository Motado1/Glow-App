import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CheckInSummary } from '@/components/CheckInSummary';
import { Header } from '@/components/Header';
import { PhotoThumb } from '@/components/PhotoThumb';
import { boxInstallStatus, overallStatus, preInstallStatus } from '@/components/statusHelpers';
import { Button, Card, Divider, Loading, Row, Screen, SegmentedControl, Spacer, StatusPill, Txt } from '@/components/ui';
import { repo } from '@/data';
import { CONNECTIVITY_LABEL, type ActivityEvent, type BoxInstallation, type Photo, type Submission } from '@/domain/types';
import { formatDate, relativeTime } from '@/lib/date';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { spacing } from '@/theme';

function Info({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <Row justify="space-between" gap={spacing.md} align="flex-start" style={{ paddingVertical: 5 }}>
      <Txt variant="overline">{label}</Txt>
      <Txt variant={mono ? 'mono' : 'body'} style={{ flex: 1 }} align="right" numberOfLines={3}>
        {value ?? '—'}
      </Txt>
    </Row>
  );
}

export default function AdminFarmDetail() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const admin = useCurrentUser();
  const { data: farm, refresh } = useRepoQuery(() => repo.getFarm(farmId!), [farmId], ['farms']);
  const { data: users } = useRepoQuery(() => repo.listUsers(), []);
  const { data: photos } = useRepoQuery(() => (farm ? repo.listPhotos(farm.id) : Promise.resolve([] as Photo[])), [farm?.id], ['photos']);
  const { data: activity } = useRepoQuery(() => (farm ? repo.listActivity({ farmId: farm.id }) : Promise.resolve([] as ActivityEvent[])), [farm?.id], ['activity']);
  const { data: subs } = useRepoQuery(() => (farm ? repo.listSubmissions({ farmId: farm.id }) : Promise.resolve([] as Submission[])), [farm?.id], ['submissions']);
  const { data: boxInstall } = useRepoQuery(() => (farm ? repo.getBoxInstallation(farm.id) : Promise.resolve(null as BoxInstallation | null)), [farm?.id], ['box_installations']);
  const { data: checkIns } = useRepoQuery(() => (farm ? repo.listCheckIns(farm.id) : Promise.resolve([])), [farm?.id], ['check_ins']);
  const [assigning, setAssigning] = useState(false);
  const [ptoBusy, setPtoBusy] = useState(false);

  if (!farm) {
    return (
      <Screen>
        <Header title="Farm" onBack={() => router.back()} />
        <Loading />
      </Screen>
    );
  }

  const photographers = (users ?? []).filter((u) => u.role === 'photographer');
  const assignee = (users ?? []).find((u) => u.id === farm.assignedPhotographerId);
  const installer = (users ?? []).find((u) => u.id === farm.assignedInstallerId);
  const pre = preInstallStatus(farm.preInstallStatus);
  const ov = overallStatus(farm.overallStatus);
  const boxSt = farm.boxInstallStatus ? boxInstallStatus(farm.boxInstallStatus) : null;
  const pendingSub = (subs ?? []).find((s) => s.status === 'submitted' || s.status === 'under_review');
  const canMarkPto = farm.ptoStatus === 'not_reached' && (farm.preInstallStatus === 'approved' || farm.preInstallStatus === 'complete');

  async function assignTo(uid: string) {
    await repo.assignFarms([farm!.id], uid, 'photographer', admin?.id ?? 'system');
    setAssigning(false);
    refresh();
  }

  async function markPto() {
    setPtoBusy(true);
    await repo.markPtoReached(farm!.id, admin?.id ?? 'system');
    setPtoBusy(false);
    refresh();
  }

  return (
    <Screen scroll>
      <Header eyebrow={farm.glowFarmId} title={farm.name} subtitle={farm.address} onBack={() => router.back()} />
      <Row gap={spacing.sm} wrap>
        <StatusPill label={ov.label} tone={ov.tone} />
        <StatusPill label={pre.label} tone={pre.tone} />
        {boxSt ? <StatusPill label={boxSt.label} tone={boxSt.tone} /> : null}
      </Row>
      <Spacer />
      {canMarkPto ? (
        <>
          <Button title="Confirm PTO reached" icon="bolt" onPress={markPto} loading={ptoBusy} full />
          <Spacer />
        </>
      ) : null}
      {pendingSub ? (
        <>
          <Button title="Open in review" icon="review" onPress={() => router.push(`/(admin)/submission/${pendingSub.id}` as never)} full />
          <Spacer />
        </>
      ) : null}

      <Card>
        <Info label="Glow Farm ID" value={farm.glowFarmId} mono />
        <Info label="Hub Record" value={farm.hubRecordId} mono />
        <Info label="Address" value={farm.address} />
        <Info label="State / Region" value={`${farm.state}${farm.region ? ` · ${farm.region}` : ''}`} />
        <Info label="Coordinates" value={farm.location ? `${farm.location.lat.toFixed(4)}, ${farm.location.lng.toFixed(4)}` : 'Missing'} mono />
        <Info label="PTO status" value={farm.ptoStatus === 'reached' ? 'Reached' : 'Not reached'} />
        <Info label="Scheduled" value={formatDate(farm.scheduledDate)} />
        <Info label="Completed" value={formatDate(farm.completionDate)} />
        <Info label="Photographer" value={assignee?.name} />
        <Info label="Installer" value={installer?.name} />
        <Info label="Box serial" value={farm.boxSerial} mono />
        <Info label="Access" value={farm.accessInstructions} />
        <Info label="Obstructions (from field)" value={farm.obstructionNotes} />
        <Info label="Contact" value={farm.contact ? `${farm.contact.name ?? ''} ${farm.contact.phone ?? ''}`.trim() : undefined} />
        <Info label="Notes" value={farm.notes} />
        <Info label="Drive folder" value={farm.driveFolderUrl ?? 'Created once photos are approved'} />
      </Card>

      <Spacer />
      <Txt variant="overline">Site visits</Txt>
      <Spacer size={spacing.sm} />
      <Card>
        <CheckInSummary checkIns={checkIns ?? []} />
      </Card>

      {boxInstall ? (
        <>
          <Spacer />
          <Txt variant="overline">Monitoring box installation</Txt>
          <Spacer size={spacing.sm} />
          <Card>
            <Info label="Box serial" value={boxInstall.boxSerial} mono />
            <Info label="Installer" value={installer?.name} />
            <Info label="Installed" value={formatDate(boxInstall.installedAt)} />
            <Info label="Network" value={boxInstall.networkType || undefined} />
            <Info label="Voltage / phase" value={[boxInstall.voltage, boxInstall.phaseConfig].filter(Boolean).join(' · ') || undefined} />
            <Info label="CT config / ratio" value={[boxInstall.ctConfig, boxInstall.ctRatio].filter(Boolean).join(' · ') || undefined} />
            <Info label="Programming" value={boxInstall.programmingCompleted ? 'Completed' : 'Pending'} />
            <Info
              label="Connectivity"
              value={CONNECTIVITY_LABEL[boxInstall.connectivityTest.status]}
            />
            <Info label="Readings" value={boxInstall.connectivityTest.readings} />
            <Info label="Deficiencies" value={boxInstall.problems} />
            <Info label="Follow-up" value={boxInstall.followUpRequired ? 'Required' : 'None'} />
          </Card>
        </>
      ) : null}

      <Spacer />
      <Button
        title={assignee ? `Reassign · currently ${assignee.name.split(' ')[0]}` : 'Assign photographer'}
        variant="secondary"
        icon="assign"
        onPress={() => setAssigning((a) => !a)}
        full
      />
      {assigning ? (
        <>
          <Spacer size={spacing.sm} />
          <SegmentedControl
            options={photographers.map((p) => ({ value: p.id, label: p.name.split(' ')[0] }))}
            value={farm.assignedPhotographerId ?? ''}
            onChange={assignTo}
          />
        </>
      ) : null}

      {photos && photos.length > 0 ? (
        <>
          <Divider />
          <Txt variant="overline">Photos ({photos.length})</Txt>
          <Spacer size={spacing.sm} />
          <Row wrap gap={spacing.sm}>
            {photos.map((p) => (
              <View key={p.id} style={{ alignItems: 'center', width: 80 }}>
                <PhotoThumb localKey={p.localKey} size={76} />
                <Txt variant="caption" numberOfLines={1}>
                  {p.checklistKey}
                </Txt>
              </View>
            ))}
          </Row>
        </>
      ) : null}

      <Divider />
      <Txt variant="overline">Activity history</Txt>
      <Spacer size={spacing.sm} />
      {(activity ?? []).map((a) => (
        <Row key={a.id} gap={spacing.sm} align="flex-start" style={{ marginBottom: spacing.sm }}>
          <Txt variant="caption">•</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="body">{a.message}</Txt>
            <Txt variant="caption">
              {a.byUserName ?? a.byUserId} · {relativeTime(a.at)}
            </Txt>
          </View>
        </Row>
      ))}
    </Screen>
  );
}
