import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { toCsv } from './csv';

export async function exportCsvAndShare(filename: string, rows: Record<string, unknown>[]): Promise<void> {
  const csv = toCsv(rows);
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename });
  }
}
