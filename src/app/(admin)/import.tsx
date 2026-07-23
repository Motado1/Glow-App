import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button, Card, Divider, Field, Row, Screen, Spacer, Txt } from '@/components/ui';
import { repo } from '@/data';
import { parseFarmCsv, type ParsedFarmImport } from '@/features/import/parseCsv';
import { useCurrentUser } from '@/stores/authStore';
import { colors, spacing } from '@/theme';

const SAMPLE = `glowFarmId,name,address,state,lat,lng,scheduled
GF-90001,Sunny Slope Farm,123 County Rd 5 Fresno,CA,36.75,-119.77,2026-08-01
GF-90002,Delta Breeze Ranch,44 River Rd Stockton,CA,37.96,-121.29,
GF-90003,Windy Flats,88 Mesa Dr Bakersfield,CA,35.37,-119.02,2026-08-03`;

export default function ImportFarms() {
  const user = useCurrentUser();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedFarmImport | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function doParse(t: string) {
    setText(t);
    setParsed(t.trim() ? parseFarmCsv(t) : null);
    setResult(null);
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      });
      if (res.canceled || !res.assets?.length) return;
      const r = await fetch(res.assets[0].uri);
      doParse(await r.text());
    } catch {
      setResult('Could not read that file — paste the CSV text instead.');
    }
  }

  async function doImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setBusy(true);
    const r = await repo.bulkUpsertFarms(parsed.rows, user?.id ?? 'system');
    setBusy(false);
    setResult(`Imported ${r.inserted} new, updated ${r.updated}.`);
    setText('');
    setParsed(null);
  }

  return (
    <Screen scroll>
      <Header title="Import farms" subtitle="From a Hub export / spreadsheet CSV" onBack={() => router.back()} />
      <Row gap={spacing.sm}>
        <Button small variant="secondary" title="Choose CSV file" icon="📄" onPress={pickFile} />
        <Button small variant="ghost" title="Load sample" onPress={() => doParse(SAMPLE)} />
      </Row>
      <Spacer />
      <Field label="Or paste CSV" value={text} onChangeText={doParse} placeholder="glowFarmId,name,address,state,lat,lng…" multiline />
      <Spacer />
      {parsed ? (
        <Card>
          <Txt variant="subtitle">Preview</Txt>
          <Txt variant="body" color={colors.successText}>
            ✓ {parsed.rows.length} valid rows
          </Txt>
          {parsed.errors.length > 0 ? (
            <>
              <Txt color={colors.dangerText}>⚠️ {parsed.errors.length} problem row(s)</Txt>
              {parsed.errors.slice(0, 6).map((e, i) => (
                <Txt key={i} variant="caption" color={colors.dangerText}>
                  Row {e.row}: {e.message}
                </Txt>
              ))}
            </>
          ) : null}
          <Spacer />
          <Button title={`Import ${parsed.rows.length} farms`} icon="⬆️" onPress={doImport} loading={busy} disabled={parsed.rows.length === 0} full />
        </Card>
      ) : null}
      {result ? (
        <>
          <Spacer />
          <Txt variant="subtitle" color={colors.successText}>
            {result}
          </Txt>
        </>
      ) : null}
      <Divider />
      <Txt variant="caption">
        Recognised columns: Glow Farm ID, Name, Address, State, Region, Hub ID, Lat, Lng, Notes, Access, Scheduled. Rows match by Glow Farm ID (existing farms are updated, not duplicated).
      </Txt>
    </Screen>
  );
}
