import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Header } from '@/components/Header';
import { Badge, Button, Card, Divider, Field, IconLine, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { geocodeAddress } from '@/features/geo/geocode';
import { parseFarmCsv } from '@/features/import/parseCsv';
import { parseFarmPdf, PDF_SUPPORTED } from '@/features/import/parsePdf';
import { RECOGNISED_COLUMNS, type FarmImportRow, type ParsedFarmImport } from '@/features/import/rows';
import { useCurrentUser } from '@/stores/authStore';
import { useRepoQuery } from '@/stores/useRepoQuery';
import { colors, radius, spacing } from '@/theme';

/**
 * The template. Every column the importer understands, with three rows showing
 * the three ways to give a location: address only, coordinates only, or both.
 * Handing someone a file that already works beats describing one that would.
 */
const TEMPLATE = `Farm ID,Name,Address,State,Coordinates,Contact,Phone,Access,Notes
GF-1001,Example Farm,"123 County Rd 5, Greeley, CO",CO,,Ray Hollenbeck,+1 555 010 1234,Gate code 1234,
GF-1002,Coordinates Only Farm,,CO,"40.42, -104.71",,,,No street address
GF-1003,Both Farm,"88 Mesa Dr, Wichita, KS",KS,"37.69, -97.34",Dana Whitmore,+1 555 010 5678,,`;

/**
 * The other shape that turns up constantly: a region export that is nothing but
 * addresses. Farm ID, name and state are all derived from the address.
 */
const ADDRESS_ONLY = `Address
"12797 St Ann Christine Ct, Riverton, Utah 84065"
"2664 Mont Sur Dr, Riverton, Utah 84065"`;

export default function ImportFarms() {
  const user = useCurrentUser();
  const { data: farms } = useRepoQuery(() => repo.listFarms(), [], ['farms']);
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
      // The state is only worth appending when the address doesn't say it —
      // "…, Riverton, Utah 84065, UT" confuses the geocoder rather than helping.
      const addr = t.address ?? '';
      const hasState = !!t.state && new RegExp(`\\b${t.state}\\b`, 'i').test(addr);
      const q = [addr, hasState ? '' : t.state].filter(Boolean).join(', ');
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

  /** Web only — hands over a .csv that already has the right headers. */
  function downloadTemplate() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glow-farm-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const missingPins = rows.filter((r) => r.lat === undefined || r.lng === undefined).length;
  const duplicates = parsed?.duplicateIds ?? [];

  // Say plainly what the import will do before it does it: matching an existing
  // Farm ID updates that farm rather than adding a second one.
  const existingIds = useMemo(
    () => new Set((farms ?? []).map((f) => f.glowFarmId.trim().toLowerCase())),
    [farms],
  );
  const willUpdate = rows.filter((r) => existingIds.has(r.glowFarmId.trim().toLowerCase())).length;
  const willCreate = rows.length - willUpdate;

  return (
    <Screen scroll>
      <Header eyebrow="Farms" title="Import" subtitle="CSV, or a table PDF on desktop" onBack={() => router.back()} />
      <Row gap={spacing.sm} wrap>
        <Button small variant="secondary" title={PDF_SUPPORTED ? 'Choose CSV or PDF' : 'Choose CSV file'} icon="file" onPress={pickFile} />
        <Button small variant="ghost" title="See the template" onPress={() => doParseText(TEMPLATE)} />
        <Button small variant="ghost" title="Addresses only" onPress={() => doParseText(ADDRESS_ONLY)} />
        {Platform.OS === 'web' ? (
          <Button small variant="ghost" title="Download template" icon="download" onPress={downloadTemplate} />
        ) : null}
      </Row>
      <Txt variant="caption" style={{ marginTop: spacing.xs }}>
        Only an address (or coordinates) is required. A file with nothing but addresses works —
        the Farm ID, name and state are taken from each address.
      </Txt>
      {!PDF_SUPPORTED ? (
        <Txt variant="caption" style={{ marginTop: spacing.xs }}>
          PDF import is available in the desktop app.
        </Txt>
      ) : null}
      <Spacer />
      <Field
        label="Or paste CSV"
        value={text}
        onChangeText={doParseText}
        placeholder={'Address\n"12797 St Ann Christine Ct, Riverton, Utah 84065"'}
        multiline
      />
      <Spacer />

      {parsed ? (
        <Card>
          <Row justify="space-between" wrap gap={spacing.sm}>
            <Txt variant="subtitle">Preview</Txt>
            <Row gap={spacing.xs} wrap>
              {willCreate > 0 ? <Badge label={`${willCreate} new`} tone="success" /> : null}
              {willUpdate > 0 ? <Badge label={`${willUpdate} will update`} tone="info" /> : null}
              {parsed.errors.length > 0 ? <Badge label={`${parsed.errors.length} skipped`} tone="danger" /> : null}
              {missingPins > 0 ? <Badge label={`${missingPins} no map pin`} tone="warning" /> : null}
            </Row>
          </Row>

          {duplicates.length > 0 ? (
            <>
              <Spacer size={spacing.sm} />
              <View style={{ backgroundColor: colors.dangerBg, borderRadius: radius.sm, padding: spacing.md }}>
                <IconLine icon="alert" variant="subtitle" size={15} color={colors.dangerText}>
                  {duplicates.length === 1 ? 'A Farm ID appears twice' : `${duplicates.length} Farm IDs appear more than once`}
                </IconLine>
                <Spacer size={spacing.xs} />
                <Txt variant="caption" color={colors.dangerText}>
                  {duplicates.slice(0, 6).join(', ')}
                  {duplicates.length > 6 ? `, and ${duplicates.length - 6} more` : ''}
                </Txt>
                <Spacer size={spacing.xs} />
                <Txt variant="caption">
                  Only the last row for each will survive, and looking up map pins may attach the wrong
                  coordinates. Fix the spreadsheet before importing.
                </Txt>
              </View>
            </>
          ) : null}

          {rows.length > 0 && (parsed.generatedIds || parsed.generatedNames) ? (
            <>
              <Spacer size={spacing.sm} />
              <Txt variant="caption">
                {parsed.generatedIds && parsed.generatedNames
                  ? 'No Farm ID or Name column — both come from the address below, and the ID stays the same if you import this list again.'
                  : parsed.generatedIds
                    ? 'No Farm ID column — each ID comes from the address, and stays the same if you import this list again.'
                    : 'No Name column — each name is the street line of the address.'}
              </Txt>
            </>
          ) : null}

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
        Required: an Address or Coordinates. Recognised columns: {RECOGNISED_COLUMNS}.
        Rows match by Farm ID, so re-importing updates existing farms instead of duplicating them —
        and a generated Farm ID comes from the address, so re-importing an address list updates it
        too. Replace a generated ID with the real Glow farm ID whenever the Hub has one.
        {Platform.OS === 'web' ? ' Addresses without coordinates can be looked up automatically.' : ''}
      </Txt>
    </Screen>
  );
}
