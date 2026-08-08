import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Header } from '@/components/Header';
import { Badge, Button, Card, Divider, Field, IconLine, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { geocodeAddress } from '@/features/geo/geocode';
import { parseFarmCsv } from '@/features/import/parseCsv';
import { parseFarmPdf, PDF_SUPPORTED } from '@/features/import/parsePdf';
import { RECOGNISED_COLUMNS, type FarmImportRow, type ParsedFarmImport } from '@/features/import/rows';
import { useCurrentUser } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

const SAMPLE = `Farm ID,Name,Address,Coordinates
GF-90001,Sunny Slope Farm,"123 County Rd 5, Fresno, CA",
GF-90002,Delta Breeze Ranch,,"37.96, -121.29"
GF-90003,Windy Flats,"88 Mesa Dr, Bakersfield, CA",35.37,-119.02`;

export default function ImportFarms() {
  const user = useCurrentUser();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedFarmImport | null>(null);
  const [rows, setRows] = useState<FarmImportRow[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState<string | null>(null);

  function applyParsed(p: ParsedFarmImport) {
    setParsed(p);
    setRows(p.rows);
    setResult(null);
    setGeo(null);
  }

  function doParseText(t: string) {
    setText(t);
    if (t.trim()) applyParsed(parseFarmCsv(t));
    else {
      setParsed(null);
      setRows([]);
    }
  }

  async function pickFile() {
    try {
      const types = ['text/csv', 'text/comma-separated-values', 'text/plain'];
      if (PDF_SUPPORTED) types.push('application/pdf');
      const res = await DocumentPicker.getDocumentAsync({ type: types });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const isPdf = (asset.mimeType ?? '').includes('pdf') || asset.name?.toLowerCase().endsWith('.pdf');
      const r = await fetch(asset.uri);
      if (isPdf) {
        applyParsed(await parseFarmPdf(await r.arrayBuffer()));
        setText('');
      } else {
        doParseText(await r.text());
      }
    } catch {
      setResult('That file could not be read. Paste the rows as text below instead.');
    }
  }

  /** Fill in coordinates for address-only rows (throttled by the geocoder). */
  async function backfillCoordinates() {
    const targets = rows.filter((r) => (r.lat === undefined || r.lng === undefined) && r.address);
    if (targets.length === 0) return;
    setBusy(true);
    let found = 0;
    const next = [...rows];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      setGeo(`Looking up ${i + 1} of ${targets.length}…`);
      const q = [t.address, t.state].filter(Boolean).join(', ');
      const point = await geocodeAddress(q);
      if (point) {
        const idx = next.findIndex((r) => r.glowFarmId === t.glowFarmId);
        if (idx >= 0) next[idx] = { ...next[idx], lat: point.lat, lng: point.lng };
        found++;
      }
    }
    setRows(next);
    setBusy(false);
    setGeo(`Found map pins for ${found} of ${targets.length} addresses.`);
  }

  async function doImport() {
    if (rows.length === 0) return;
    setBusy(true);
    const r = await repo.bulkUpsertFarms(rows, user?.id ?? 'system');
    setBusy(false);
    setResult(`Imported ${r.inserted} new, updated ${r.updated}.`);
    setText('');
    setParsed(null);
    setRows([]);
  }

  const missingPins = rows.filter((r) => r.lat === undefined || r.lng === undefined).length;

  return (
    <Screen scroll>
      <Header eyebrow="Farms" title="Import" subtitle="CSV, or a table PDF on desktop" onBack={() => router.back()} />
      <Row gap={spacing.sm} wrap>
        <Button small variant="secondary" title={PDF_SUPPORTED ? 'Choose CSV or PDF' : 'Choose CSV file'} icon="file" onPress={pickFile} />
        <Button small variant="ghost" title="Load sample" onPress={() => doParseText(SAMPLE)} />
      </Row>
      {!PDF_SUPPORTED ? (
        <Txt variant="caption" style={{ marginTop: spacing.xs }}>
          PDF import is available in the desktop app.
        </Txt>
      ) : null}
      <Spacer />
      <Field label="Or paste CSV" value={text} onChangeText={doParseText} placeholder="Farm ID,Name,Address,Coordinates…" multiline />
      <Spacer />

      {parsed ? (
        <Card>
          <Row justify="space-between" wrap gap={spacing.sm}>
            <Txt variant="subtitle">Preview</Txt>
            <Row gap={spacing.xs} wrap>
              <Badge label={`${rows.length} valid`} tone="success" />
              {parsed.errors.length > 0 ? <Badge label={`${parsed.errors.length} skipped`} tone="danger" /> : null}
              {missingPins > 0 ? <Badge label={`${missingPins} no map pin`} tone="warning" /> : null}
            </Row>
          </Row>

          {rows.length > 0 ? (
            <>
              <Spacer size={spacing.sm} />
              <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
                {rows.map((r, i) => (
                  <View
                    key={`${r.glowFarmId}-${i}`}
                    style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Row justify="space-between" gap={spacing.sm}>
                      <Txt variant="body" numberOfLines={1} style={{ flex: 1 }}>
                        {r.glowFarmId} · {r.name}
                      </Txt>
                      {r.lat !== undefined && r.lng !== undefined ? (
                        <IconLine icon="pin" size={11} color={colors.successText}>
                        mapped
                      </IconLine>
                      ) : (
                        <Txt variant="caption" color={colors.warningText}>no pin</Txt>
                      )}
                    </Row>
                    <Txt variant="caption" numberOfLines={1}>
                      {r.address ?? `${r.lat}, ${r.lng}`}
                      {r.state ? ` · ${r.state}` : ''}
                    </Txt>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          {parsed.errors.length > 0 ? (
            <>
              <Spacer size={spacing.sm} />
              <Txt variant="label" color={colors.dangerText}>Skipped rows</Txt>
              {parsed.errors.slice(0, 8).map((e, i) => (
                <Txt key={i} variant="caption" color={colors.dangerText}>
                  Row {e.row}: {e.message}
                </Txt>
              ))}
              {parsed.errors.length > 8 ? (
                <Txt variant="caption" color={colors.dangerText}>…and {parsed.errors.length - 8} more</Txt>
              ) : null}
            </>
          ) : null}

          {geo ? (
            <Txt variant="caption" style={{ marginTop: spacing.sm }}>
              {geo}
            </Txt>
          ) : null}

          <Spacer />
          {missingPins > 0 ? (
            <>
              <Button
                title={`Find map pins for ${missingPins} address${missingPins === 1 ? '' : 'es'}`}
                variant="secondary"
                icon="map"
                onPress={backfillCoordinates}
                loading={busy}
                full
              />
              <Spacer size={spacing.sm} />
            </>
          ) : null}
          <Button title={`Import ${rows.length} farms`} icon="upload" onPress={doImport} loading={busy} disabled={rows.length === 0} full />
        </Card>
      ) : null}

      {result ? (
        <>
          <Spacer />
          <Txt variant="subtitle" color={colors.successText}>{result}</Txt>
        </>
      ) : null}

      <Divider />
      <Txt variant="caption">
        Required: Farm ID, Name, and either an Address or Coordinates. Recognised columns: {RECOGNISED_COLUMNS}.
        Rows match by Farm ID, so re-importing updates existing farms instead of duplicating them.
        {Platform.OS === 'web' ? ' Addresses without coordinates can be looked up automatically.' : ''}
      </Txt>
    </Screen>
  );
}
