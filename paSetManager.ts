import JSZip from 'jszip';
import { CustomPadButton } from '../types';

export type KorgPaModelId = 'pa5x' | 'pa4x' | 'pa3x' | 'pa3x_le' | 'pa1000' | 'pa700' | 'pa900' | 'pa600';
export type PaExtractorTargetModel = 'universal' | 'pa3x' | 'pa4x' | 'pa600' | 'pa700' | 'pa900' | 'pa1000' | 'pa5x';

export interface KorgModelSpec {
  id: KorgPaModelId;
  label: string;
  userSoundBanks: number; // Number of User Sound banks (LSB 64..)
  userDkBanks: number;    // Number of User Drum Kit banks
  maxPcmMb: number;
  factoryLsbOffset: number;
}

export const PA_MODEL_SPECS: Record<KorgPaModelId, KorgModelSpec> = {
  pa5x: { id: 'pa5x', label: 'KORG Pa5X (Oriental / Flagship)', userSoundBanks: 8, userDkBanks: 4, maxPcmMb: 4000, factoryLsbOffset: 1 },
  pa4x: { id: 'pa4x', label: 'KORG Pa4X (Oriental / Pro)', userSoundBanks: 5, userDkBanks: 2, maxPcmMb: 400, factoryLsbOffset: 0 },
  pa3x: { id: 'pa3x', label: 'KORG Pa3X (الإصدار القياسي · 256/512MB)', userSoundBanks: 4, userDkBanks: 1, maxPcmMb: 512, factoryLsbOffset: 0 },
  pa3x_le: { id: 'pa3x_le', label: 'KORG Pa3X Le (128/256MB)', userSoundBanks: 4, userDkBanks: 1, maxPcmMb: 256, factoryLsbOffset: 0 },
  pa1000: { id: 'pa1000', label: 'KORG Pa1000 (Oriental)', userSoundBanks: 4, userDkBanks: 2, maxPcmMb: 600, factoryLsbOffset: 1 },
  pa700: { id: 'pa700', label: 'KORG Pa700 (Oriental)', userSoundBanks: 3, userDkBanks: 1, maxPcmMb: 256, factoryLsbOffset: 1 },
  pa900: { id: 'pa900', label: 'KORG Pa900', userSoundBanks: 3, userDkBanks: 1, maxPcmMb: 192, factoryLsbOffset: 0 },
  pa600: { id: 'pa600', label: 'KORG Pa600 / Pa600QT', userSoundBanks: 2, userDkBanks: 1, maxPcmMb: 96, factoryLsbOffset: 0 },
};

export const PA_EXTRACTOR_MODEL_OPTIONS: Array<{ id: PaExtractorTargetModel; labelAr: string; labelEn: string }> = [
  { id: 'universal', labelAr: 'Universal All Korg Pa (متوافق مع جميع الموديلات)', labelEn: 'Universal All Korg Pa' },
  { id: 'pa3x', labelAr: 'KORG Pa3X', labelEn: 'KORG Pa3X' },
  { id: 'pa4x', labelAr: 'KORG Pa4X', labelEn: 'KORG Pa4X' },
  { id: 'pa600', labelAr: 'KORG Pa600', labelEn: 'KORG Pa600' },
  { id: 'pa700', labelAr: 'KORG Pa700', labelEn: 'KORG Pa700' },
  { id: 'pa900', labelAr: 'KORG Pa900', labelEn: 'KORG Pa900' },
  { id: 'pa1000', labelAr: 'KORG Pa1000', labelEn: 'KORG Pa1000' },
  { id: 'pa5x', labelAr: 'KORG Pa5X', labelEn: 'KORG Pa5X' },
];

export type SetAssetKind =
  | 'sound_bank'
  | 'pcm'
  | 'multisample'
  | 'style'
  | 'pad'
  | 'performance'
  | 'global'
  | 'other';

export interface ParsedSetAsset {
  id: string;
  path: string;
  fileName: string;
  kind: SetAssetKind;
  sizeBytes: number;
  extractedNames: string[];
  referencedTriplets: { msb: number; lsb: number; pc: number }[];
  isUsed: boolean;
  usedBy: string[];
}

export interface ExtractedSoundBankEntry {
  id: string;
  name: string;
  sourceFile: string;
  bankType: 'user_sound' | 'user_dk' | 'factory_oriental' | 'factory_gm';
  userBankIndex: number; // 1..4
  msb: number;
  lsb: number;
  pc: number;
  isUsedInSet: boolean;
}

export interface ExtractedStyleEntry {
  id: string;
  name: string;
  fileName: string;
  msb: number;
  lsb: number;
  pc: number;
}

export interface ConvertedSoundEntry {
  original: ExtractedSoundBankEntry;
  targetMsb: number;
  targetLsb: number;
  targetPc: number;
  targetBankLabel: string;
  compatibilityNoteAr: string;
  compatibilityNoteEn: string;
}

export interface BinaryPatchSummary {
  path: string;
  fileName: string;
  ext: string;
  sizeBytes: number;
  originalHeaderHex: string;
  patchedHeaderHex: string;
  patchedOffsets: number[];
  wasPatched: boolean;
  reasonAr: string;
  reasonEn: string;
}

export interface PcmMemoryReport {
  pcmBytes: number;
  pcmMb: number;
  reclaimablePcmBytes: number;
  reclaimablePcmMb: number;
  targetStandardMb: number;
  targetExpandedMb: number;
  exceedsStandard: boolean;
  exceedsExpanded: boolean;
}

export interface ParsedPaSet {
  setName: string;
  totalSizeBytes: number;
  totalFiles: number;
  stylesCount: number;
  performancesCount: number;
  padsCount: number;
  soundsCount: number;
  pcmCount: number;
  pcmTotalBytes: number;
  assets: ParsedSetAsset[];
  unusedSoundAndPcmAssets: ParsedSetAsset[];
  usedSoundAndPcmAssets: ParsedSetAsset[];
  reclaimableBytes: number;
  extractedSounds: ExtractedSoundBankEntry[];
  extractedStyles: ExtractedStyleEntry[];
  rawFilesMap: Map<string, Uint8Array>;
}

const SYSTEM_NOISE_TOKENS = new Set([
  'KORF', 'KORG', 'PCG1', 'KMP1', 'KSF1', 'STY1', 'PAD1', 'PRF1', 'PCM1',
  'BANK', 'USER', 'SOUND', 'STYLE', 'PERFORM', 'MULTISMP', 'SAMPLES', 'GLOBAL',
  'DATA', 'HEADER', 'VER', 'VERSION', 'DEFAULT', 'EMPTY', 'NONE', 'NAME', 'ROOT',
]);

function classifyAssetKind(path: string): SetAssetKind {
  const upper = path.toUpperCase();
  if (upper.endsWith('.PCG')) return 'sound_bank';
  if (upper.endsWith('.PCM')) return 'pcm';
  if (upper.endsWith('.KMP') || upper.endsWith('.KSF') || upper.endsWith('.WAV')) return 'multisample';
  if (upper.endsWith('.STY')) return 'style';
  if (upper.endsWith('.PAD')) return 'pad';
  if (upper.endsWith('.PRF') || upper.endsWith('.KST')) return 'performance';
  if (upper.includes('/GLOBAL/') || upper.endsWith('.GBL')) return 'global';
  return 'other';
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function getFileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

/**
 * Extracts readable ASCII labels (sound/sample/style slot names) from binary KORG Pa chunks.
 */
function extractReadableTokens(bytes: Uint8Array, maxTokens: number = 120): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const scanLimit = Math.min(bytes.length, 512 * 1024); // Fast scan up to first 512 KB per file
  let current = '';

  const flush = () => {
    const cleaned = current.trim().replace(/\s+/g, ' ');
    current = '';
    if (cleaned.length < 3 || cleaned.length > 26) return;
    if (!/[A-Za-z]/.test(cleaned)) return;
    const upper = cleaned.toUpperCase();
    if (SYSTEM_NOISE_TOKENS.has(upper)) return;
    if (/^(.)\1{2,}$/.test(upper)) return; // Skip repeated chars like AAAA
    if (!seen.has(upper)) {
      seen.add(upper);
      tokens.push(cleaned);
    }
  };

  for (let i = 0; i < scanLimit; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      current += String.fromCharCode(b);
    } else if (current.length > 0) {
      flush();
      if (tokens.length >= maxTokens) break;
    }
  }
  flush();
  return tokens;
}

/**
 * Scans binary Style / Performance / Pad MIDI tracks for (CC#0 MSB, CC#32 LSB, Program Change) triplets.
 */
function extractMidiBankTriplets(bytes: Uint8Array): { msb: number; lsb: number; pc: number }[] {
  const triplets: { msb: number; lsb: number; pc: number }[] = [];
  const seen = new Set<string>();
  const channelMsb = new Map<number, number>();
  const channelLsb = new Map<number, number>();
  const scanLimit = Math.min(bytes.length, 512 * 1024);

  for (let i = 0; i < scanLimit - 2; i++) {
    const status = bytes[i];
    const type = status & 0xf0;
    const ch = status & 0x0f;

    if (type === 0xb0) {
      const cc = bytes[i + 1];
      const val = bytes[i + 2];
      if (cc === 0 && val <= 127) {
        channelMsb.set(ch, val);
      } else if (cc === 32 && val <= 127) {
        channelLsb.set(ch, val);
      }
    } else if (type === 0xc0) {
      const pc = bytes[i + 1];
      if (pc <= 127) {
        const msb = channelMsb.get(ch) ?? 121;
        const lsb = channelLsb.get(ch) ?? 0;
        const key = `${msb}:${lsb}:${pc}`;
        if (!seen.has(key)) {
          seen.add(key);
          triplets.push({ msb, lsb, pc });
        }
      }
    }
  }

  return triplets;
}

function inferBankFromFileName(fileName: string, fallbackIdx: number): {
  bankType: ExtractedSoundBankEntry['bankType'];
  userBankIndex: number;
  msb: number;
  lsb: number;
} {
  const upper = fileName.toUpperCase();
  if (upper.includes('DK') || upper.includes('DRUM')) {
    const match = upper.match(/(\d+)/);
    const idx = match ? Math.max(1, Math.min(4, Number(match[1]))) : 1;
    return { bankType: 'user_dk', userBankIndex: idx, msb: 120, lsb: 63 + idx };
  }
  const userMatch = upper.match(/USER\s*0?([1-8])/);
  if (userMatch) {
    const idx = Number(userMatch[1]);
    return { bankType: 'user_sound', userBankIndex: idx, msb: 121, lsb: 63 + idx };
  }
  const idx = (fallbackIdx % 4) + 1;
  return { bankType: 'user_sound', userBankIndex: idx, msb: 121, lsb: 63 + idx };
}

function analyzeRawFilesMap(setName: string, rawFilesMap: Map<string, Uint8Array>): ParsedPaSet {
  const assets: ParsedSetAsset[] = [];
  let totalSizeBytes = 0;

  let index = 0;
  for (const [path, bytes] of rawFilesMap.entries()) {
    const fileName = getFileName(path);
    const kind = classifyAssetKind(path);
    totalSizeBytes += bytes.byteLength;

    const extractedNames = extractReadableTokens(bytes, kind === 'pcm' ? 20 : 90);
    const referencedTriplets =
      kind === 'style' || kind === 'pad' || kind === 'performance'
        ? extractMidiBankTriplets(bytes)
        : [];

    assets.push({
      id: `asset_${index++}`,
      path,
      fileName,
      kind,
      sizeBytes: bytes.byteLength,
      extractedNames,
      referencedTriplets,
      isUsed: false,
      usedBy: [],
    });
  }

  const consumerAssets = assets.filter(
    (a) => a.kind === 'style' || a.kind === 'pad' || a.kind === 'performance'
  );

  // Build searchable reference corpus from Styles, Performances, and Pads
  const consumerTokens = consumerAssets.map((c) => ({
    fileName: c.fileName,
    stem: stripExtension(c.fileName).toUpperCase(),
    upperNames: new Set(c.extractedNames.map((n) => n.toUpperCase())),
    triplets: c.referencedTriplets,
  }));

  // Also include sound banks / multisamples linking to PCM samples
  const soundAndMsAssets = assets.filter(
    (a) => a.kind === 'sound_bank' || a.kind === 'multisample'
  );

  // Determine usage of each Sound Bank, Multisample, and PCM asset
  for (const asset of assets) {
    if (asset.kind !== 'sound_bank' && asset.kind !== 'pcm' && asset.kind !== 'multisample') {
      asset.isUsed = true;
      continue;
    }

    const stemUpper = stripExtension(asset.fileName).toUpperCase();
    const assetBank = inferBankFromFileName(asset.fileName, 0);
    const usedBySet = new Set<string>();

    // Check against Styles / Performances / Pads
    for (const consumer of consumerTokens) {
      let matched = false;

      if (stemUpper.length >= 3 && consumer.upperNames.has(stemUpper)) {
        matched = true;
      }

      if (!matched) {
        for (const token of asset.extractedNames) {
          const upperToken = token.toUpperCase();
          if (upperToken.length >= 4 && consumer.upperNames.has(upperToken)) {
            matched = true;
            break;
          }
        }
      }

      // Check MIDI MSB/LSB triplet matches for .PCG sound banks
      if (!matched && asset.kind === 'sound_bank') {
        for (const t of consumer.triplets) {
          if (t.msb === assetBank.msb && t.lsb === assetBank.lsb) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        usedBySet.add(consumer.fileName);
      }
    }

    // For PCM / KMP files, also check if any Sound Bank or Multisample references its stem/tokens
    if ((asset.kind === 'pcm' || asset.kind === 'multisample') && usedBySet.size === 0) {
      for (const holder of soundAndMsAssets) {
        if (holder.path === asset.path) continue;
        const holderTokens = new Set(holder.extractedNames.map((n) => n.toUpperCase()));
        if (stemUpper.length >= 3 && holderTokens.has(stemUpper)) {
          // Only mark PCM as used if the holding sound bank itself isn't completely orphaned,
          // or if there are no styles in a standalone PCM+PCG inspection
          if (consumerAssets.length === 0 || holder.isUsed) {
            usedBySet.add(holder.fileName);
          }
        }
      }
    }

    asset.usedBy = Array.from(usedBySet);
    asset.isUsed = asset.usedBy.length > 0;
  }

  // Second pass: if a Sound Bank (.PCG) became marked used, propagate usage to its referenced PCM/KMP files
  const usedHolders = assets.filter((a) => (a.kind === 'sound_bank' || a.kind === 'multisample') && a.isUsed);
  for (const asset of assets) {
    if ((asset.kind === 'pcm' || asset.kind === 'multisample') && !asset.isUsed) {
      const stemUpper = stripExtension(asset.fileName).toUpperCase();
      for (const holder of usedHolders) {
        if (holder.path === asset.path) continue;
        if (holder.extractedNames.some((n) => n.toUpperCase() === stemUpper || asset.extractedNames.some((an) => an.toUpperCase() === n.toUpperCase()))) {
          asset.isUsed = true;
          asset.usedBy = Array.from(new Set([...asset.usedBy, holder.fileName]));
        }
      }
    }
  }

  const targetAssets = assets.filter(
    (a) => a.kind === 'sound_bank' || a.kind === 'pcm' || a.kind === 'multisample'
  );
  const unusedSoundAndPcmAssets = targetAssets.filter((a) => !a.isUsed);
  const usedSoundAndPcmAssets = targetAssets.filter((a) => a.isUsed);
  const reclaimableBytes = unusedSoundAndPcmAssets.reduce((sum, a) => sum + a.sizeBytes, 0);

  // Build extracted sound entries from .PCG banks (or fallback .TXT/.CSV bank lists if uploaded)
  const extractedSounds: ExtractedSoundBankEntry[] = [];
  const soundBankAssets = assets.filter((a) => a.kind === 'sound_bank');

  soundBankAssets.forEach((bankAsset, bankIdx) => {
    const bankInfo = inferBankFromFileName(bankAsset.fileName, bankIdx);
    const candidateNames = bankAsset.extractedNames.length > 0
      ? bankAsset.extractedNames.slice(0, 24)
      : [stripExtension(bankAsset.fileName)];

    candidateNames.forEach((name, slotIdx) => {
      extractedSounds.push({
        id: `ext_snd_${bankIdx}_${slotIdx}`,
        name: name.slice(0, 18),
        sourceFile: bankAsset.fileName,
        bankType: bankInfo.bankType,
        userBankIndex: bankInfo.userBankIndex,
        msb: bankInfo.msb,
        lsb: bankInfo.lsb,
        pc: slotIdx % 128,
        isUsedInSet: bankAsset.isUsed,
      });
    });
  });

  // Also parse any uploaded .txt / .csv sound list files
  for (const asset of assets) {
    const lower = asset.fileName.toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.csv')) {
      const bytes = rawFilesMap.get(asset.path);
      if (bytes) {
        const text = new TextDecoder().decode(bytes);
        const parsedFromText = parseTextSoundList(text, asset.fileName);
        extractedSounds.push(...parsedFromText);
      }
    }
  }

  // Extract styles metadata
  const extractedStyles: ExtractedStyleEntry[] = assets
    .filter((a) => a.kind === 'style')
    .map((styleAsset, idx) => ({
      id: `ext_sty_${idx}`,
      name: stripExtension(styleAsset.fileName).slice(0, 16),
      fileName: styleAsset.fileName,
      msb: 0,
      lsb: Math.floor(idx / 32) + 1,
      pc: (idx % 128),
    }));

  const pcmTotalBytes = assets
    .filter((a) => a.kind === 'pcm' || a.kind === 'multisample')
    .reduce((sum, a) => sum + a.sizeBytes, 0);

  return {
    setName: stripExtension(setName).replace(/\.SET$/i, '') || 'KORG_SET',
    totalSizeBytes,
    totalFiles: assets.length,
    stylesCount: assets.filter((a) => a.kind === 'style').length,
    performancesCount: assets.filter((a) => a.kind === 'performance').length,
    padsCount: assets.filter((a) => a.kind === 'pad').length,
    soundsCount: soundBankAssets.length,
    pcmCount: assets.filter((a) => a.kind === 'pcm' || a.kind === 'multisample').length,
    pcmTotalBytes,
    assets,
    unusedSoundAndPcmAssets,
    usedSoundAndPcmAssets,
    reclaimableBytes,
    extractedSounds,
    extractedStyles,
    rawFilesMap,
  };
}

export async function analyzeUploadedZip(file: File): Promise<ParsedPaSet> {
  const zip = await JSZip.loadAsync(file);
  const rawFilesMap = new Map<string, Uint8Array>();

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    // Skip macOS metadata clutter
    if (entry.name.includes('__MACOSX/') || entry.name.endsWith('.DS_Store')) continue;
    const data = await entry.async('uint8array');
    rawFilesMap.set(entry.name, data);
  }

  return analyzeRawFilesMap(file.name, rawFilesMap);
}

function normalizeRelativeSetPath(rawPath: string, fallbackKind: SetAssetKind): string {
  const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('/')) {
    return normalized;
  }
  const defaultFolder =
    fallbackKind === 'sound_bank' ? 'SOUND/' :
    fallbackKind === 'style' ? 'STYLE/' :
    fallbackKind === 'pad' ? 'PAD/' :
    fallbackKind === 'performance' ? (normalized.toUpperCase().endsWith('.KST') ? 'KEYBOARDSET/' : 'PERFORM/') :
    fallbackKind === 'pcm' ? 'PCM/' :
    fallbackKind === 'multisample' ? 'MULTISMP/' :
    fallbackKind === 'global' ? 'GLOBAL/' : '';
  return `${defaultFolder}${normalized}`;
}

function inferSetNameFromPaths(paths: string[], fallbackName: string): string {
  for (const p of paths) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    const setSeg = parts.find((seg) => /\.SET$/i.test(seg));
    if (setSeg) return setSeg;
  }
  for (const p of paths) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length > 1 && !/^(SOUND|STYLE|PCM|MULTISMP|PERFORM|KEYBOARDSET|PAD|GLOBAL|SONGBOOK)$/i.test(parts[0])) {
      return parts[0];
    }
  }
  return fallbackName;
}

export async function analyzeUploadedEntries(
  entries: Array<{ relativePath: string; file: File }>
): Promise<ParsedPaSet> {
  const rawFilesMap = new Map<string, Uint8Array>();

  // Skip OS clutter files
  const validEntries = entries.filter(
    (e) =>
      !e.relativePath.includes('__MACOSX/') &&
      !e.file.name.startsWith('._') &&
      e.file.name !== '.DS_Store' &&
      e.file.name !== 'Thumbs.db'
  );

  // If user uploaded a single .zip inside folder/drop, parse it directly as archive
  if (validEntries.length === 1 && /\.zip$/i.test(validEntries[0].file.name)) {
    return analyzeUploadedZip(validEntries[0].file);
  }

  for (const entry of validEntries) {
    const kind = classifyAssetKind(entry.relativePath);
    const finalPath = normalizeRelativeSetPath(entry.relativePath, kind);
    const buf = await entry.file.arrayBuffer();
    rawFilesMap.set(finalPath, new Uint8Array(buf));
  }

  const fallbackName = validEntries.length === 1 ? stripExtension(validEntries[0].file.name) : 'CUSTOM_KORG_SET';
  const setName = inferSetNameFromPaths(Array.from(rawFilesMap.keys()), fallbackName);
  return analyzeRawFilesMap(setName, rawFilesMap);
}

export async function analyzeUploadedFiles(fileList: FileList | File[]): Promise<ParsedPaSet> {
  const files = Array.from(fileList);
  const entries = files.map((f) => ({
    relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    file: f,
  }));
  return analyzeUploadedEntries(entries);
}

export async function buildCleanSetZip(
  parsedSet: ParsedPaSet,
  excludedPaths: Set<string>
): Promise<{ blob: Blob; filename: string; removedCount: number; savedBytes: number }> {
  const zip = new JSZip();
  let removedCount = 0;
  let savedBytes = 0;

  for (const [path, data] of parsedSet.rawFilesMap.entries()) {
    if (excludedPaths.has(path)) {
      removedCount++;
      savedBytes += data.byteLength;
      continue;
    }
    zip.file(path, data);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const filename = `${parsedSet.setName}_CLEAN.SET.zip`;
  return { blob, filename, removedCount, savedBytes };
}

/**
 * Parses custom pasted or uploaded lines like: "Oud Solo, 121, 64, 0" or "Nay 1 | 121 | 4 | 72"
 */
export function parseTextSoundList(rawText: string, sourceFile: string = 'manual_list.txt'): ExtractedSoundBankEntry[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ExtractedSoundBankEntry[] = [];

  lines.forEach((line, idx) => {
    const parts = line.split(/[,;\t|]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const name = parts[0].slice(0, 20);
    const msb = parts[1] !== undefined && !isNaN(Number(parts[1])) ? Math.max(0, Math.min(127, Number(parts[1]))) : 121;
    const lsb = parts[2] !== undefined && !isNaN(Number(parts[2])) ? Math.max(0, Math.min(127, Number(parts[2]))) : 64;
    const pc = parts[3] !== undefined && !isNaN(Number(parts[3])) ? Math.max(0, Math.min(127, Number(parts[3]))) : idx % 128;

    const isUser = lsb >= 64;
    const isDk = msb === 120;
    results.push({
      id: `txt_snd_${idx}_${Date.now()}`,
      name,
      sourceFile,
      bankType: isDk ? 'user_dk' : isUser ? 'user_sound' : 'factory_oriental',
      userBankIndex: isUser ? Math.max(1, lsb - 63) : 1,
      msb,
      lsb,
      pc,
      isUsedInSet: true,
    });
  });

  return results;
}

/**
 * Remaps KORG Sound Bank MSB/LSB/PC between Pa models (Pa4X/Pa3X <-> Pa600/Pa900/Pa700/Pa1000).
 */
export function convertSoundsBetweenModels(
  sounds: ExtractedSoundBankEntry[],
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId
): ConvertedSoundEntry[] {
  const srcSpec = PA_MODEL_SPECS[sourceModel];
  const dstSpec = PA_MODEL_SPECS[targetModel];

  return sounds.map((s) => {
    if (sourceModel === targetModel) {
      return {
        original: s,
        targetMsb: s.msb,
        targetLsb: s.lsb,
        targetPc: s.pc,
        targetBankLabel: s.lsb >= 64 ? `USER 0${s.lsb - 63}` : `FACTORY LSB ${s.lsb}`,
        compatibilityNoteAr: 'مطابق للموديل الأصلي',
        compatibilityNoteEn: 'Native model mapping',
      };
    }

    let targetMsb = s.msb;
    let targetLsb = s.lsb;
    let targetPc = s.pc;
    let targetBankLabel = '';
    let noteAr = 'توافق مباشر';
    let noteEn = 'Direct compatibility';

    if (s.bankType === 'user_dk' || s.msb === 120) {
      targetMsb = 120;
      const srcDkIdx = Math.max(1, s.lsb - 63);
      if (srcDkIdx > dstSpec.userDkBanks) {
        const mappedDk = ((srcDkIdx - 1) % dstSpec.userDkBanks) + 1;
        targetLsb = 63 + mappedDk;
        targetPc = (s.pc + 64) % 128;
        targetBankLabel = `USER DK 0${mappedDk}`;
        noteAr = `دمج في USER DK 0${mappedDk} (سعة ${dstSpec.id.toUpperCase()})`;
        noteEn = `Remapped to USER DK 0${mappedDk} for ${dstSpec.id.toUpperCase()}`;
      } else {
        targetLsb = 63 + srcDkIdx;
        targetBankLabel = `USER DK 0${srcDkIdx}`;
        noteAr = `نقل مباشر إلى USER DK 0${srcDkIdx}`;
        noteEn = `Direct USER DK 0${srcDkIdx} transfer`;
      }
    } else if (s.bankType === 'user_sound' || s.lsb >= 64) {
      targetMsb = 121;
      const srcBankIdx = Math.max(1, s.lsb - 63);
      if (srcBankIdx > dstSpec.userSoundBanks) {
        // e.g., Pa4X/Pa3X User 3/4 -> Pa600 User 1/2 with non-colliding PC offset
        const wrappedIdx = ((srcBankIdx - 1) % dstSpec.userSoundBanks) + 1;
        targetLsb = 63 + wrappedIdx;
        targetPc = (s.pc + 64) % 128;
        targetBankLabel = `USER 0${wrappedIdx}`;
        noteAr = `إعادة توزيع من User ${srcBankIdx} إلى User ${wrappedIdx} (PC ${targetPc})`;
        noteEn = `Remapped User ${srcBankIdx} -> User ${wrappedIdx} (PC ${targetPc})`;
      } else {
        targetLsb = 63 + srcBankIdx;
        targetBankLabel = `USER 0${srcBankIdx}`;
        noteAr = `تحويل نظيف إلى ${dstSpec.id.toUpperCase()} USER 0${srcBankIdx}`;
        noteEn = `Clean map to ${dstSpec.id.toUpperCase()} USER 0${srcBankIdx}`;
      }
    } else {
      // Factory / Oriental sound bank LSB adjustment between legacy (Pa3X/Pa600/Pa900) and modern DNC (Pa4X/Pa1000/Pa700)
      const delta = dstSpec.factoryLsbOffset - srcSpec.factoryLsbOffset;
      targetMsb = 121;
      targetLsb = Math.max(0, Math.min(63, s.lsb + delta));
      targetBankLabel = `FACTORY (${targetLsb})`;
      noteAr = delta === 0 ? 'بنك مصنع متطابق' : `تعديل إزاحة بنك المصنع (${delta > 0 ? '+' : ''}${delta})`;
      noteEn = delta === 0 ? 'Matching factory bank' : `Factory bank LSB offset (${delta > 0 ? '+' : ''}${delta})`;
    }

    return {
      original: s,
      targetMsb,
      targetLsb,
      targetPc,
      targetBankLabel,
      compatibilityNoteAr: noteAr,
      compatibilityNoteEn: noteEn,
    };
  });
}

interface ModelHeaderProfile {
  korfMajorByte: number;
  korfModelByte: number;
  subChunkVersion: number;
  tag4: string;
}

const MODEL_HEADER_PROFILES: Record<KorgPaModelId, ModelHeaderProfile> = {
  pa5x: { korfMajorByte: 0x05, korfModelByte: 0x07, subChunkVersion: 0x05, tag4: 'Pa5X' },
  pa4x: { korfMajorByte: 0x04, korfModelByte: 0x04, subChunkVersion: 0x04, tag4: 'Pa4X' },
  pa3x: { korfMajorByte: 0x03, korfModelByte: 0x03, subChunkVersion: 0x03, tag4: 'Pa3X' },
  pa3x_le: { korfMajorByte: 0x03, korfModelByte: 0x03, subChunkVersion: 0x03, tag4: 'Pa3X' },
  pa1000: { korfMajorByte: 0x04, korfModelByte: 0x06, subChunkVersion: 0x04, tag4: 'Pa1K' },
  pa700: { korfMajorByte: 0x04, korfModelByte: 0x05, subChunkVersion: 0x04, tag4: 'Pa70' },
  pa900: { korfMajorByte: 0x03, korfModelByte: 0x02, subChunkVersion: 0x03, tag4: 'Pa90' },
  pa600: { korfMajorByte: 0x02, korfModelByte: 0x01, subChunkVersion: 0x02, tag4: 'Pa60' },
};

const PATCHABLE_EXTENSIONS = new Set(['PCG', 'KMP', 'STY', 'PRF', 'PAD', 'KST']);
const KORG_SUBCHUNKS = ['PCG1', 'KMP1', 'STY1', 'PRF1', 'PAD1', 'KST1'];
const MODEL_TEXT_TAGS = ['Pa1000', 'PA1000', 'Pa700', 'PA700', 'Pa900', 'PA900', 'Pa600', 'PA600', 'Pa5X', 'PA5X', 'Pa5x', 'Pa4X', 'PA4X', 'Pa4x', 'Pa3X', 'PA3X', 'Pa3x'];

function getExtUpper(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toUpperCase() : '';
}

function bytesToHex(bytes: Uint8Array, limit: number = 16): string {
  const slice = bytes.subarray(0, Math.min(limit, bytes.length));
  return Array.from(slice)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

function matchAsciiAt(bytes: Uint8Array, offset: number, ascii: string): boolean {
  if (offset + ascii.length > bytes.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (bytes[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

function writeAsciiFixedLength(bytes: Uint8Array, offset: number, length: number, replacement: string, patchedOffsets: number[]) {
  const padded = replacement.slice(0, length).padEnd(length, ' ');
  for (let i = 0; i < length; i++) {
    const nextByte = padded.charCodeAt(i);
    if (bytes[offset + i] !== nextByte) {
      bytes[offset + i] = nextByte;
      patchedOffsets.push(offset + i);
    }
  }
}

/**
 * Patches KORG Pa binary headers (.PCG, .KMP, .STY, .PRF, .PAD) from sourceModel to targetModel
 * so older models like Korg Pa3X / Pa900 / Pa600 accept Pa4X files without "Incompatible File / Wrong Model".
 */
export function patchKorgBinaryFile(
  path: string,
  sourceBytes: Uint8Array,
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId
): { patchedBytes: Uint8Array; summary: BinaryPatchSummary } {
  const fileName = getFileName(path);
  const ext = getExtUpper(fileName);
  const patchedBytes = new Uint8Array(sourceBytes);
  const originalHeaderHex = bytesToHex(sourceBytes, 20);
  const patchedOffsets: number[] = [];

  if (!PATCHABLE_EXTENSIONS.has(ext) || sourceModel === targetModel || patchedBytes.length < 16) {
    return {
      patchedBytes,
      summary: {
        path,
        fileName,
        ext,
        sizeBytes: sourceBytes.byteLength,
        originalHeaderHex,
        patchedHeaderHex: originalHeaderHex,
        patchedOffsets,
        wasPatched: false,
        reasonAr: sourceModel === targetModel ? 'نفس الموديل (لا يلزم تعديل)' : 'ملف غير ثنائي الترويسة',
        reasonEn: sourceModel === targetModel ? 'Same model selected' : 'Non-header asset',
      },
    };
  }

  const srcProf = MODEL_HEADER_PROFILES[sourceModel];
  const dstProf = MODEL_HEADER_PROFILES[targetModel];

  // 1. Check KORF / KORG container header (0x00..0x03) and patch OS/Model version bytes in header (0x04..0x17)
  const hasKorfMagic = matchAsciiAt(patchedBytes, 0, 'KORF') || matchAsciiAt(patchedBytes, 0, 'KORG');
  if (hasKorfMagic) {
    // KORG Pa KORF header encodes format version & model id in bytes 0x05..0x0F
    // Standardize major format/version bytes from higher models (0x04 / 0x05 / 0x06) to target profile
    for (let off = 4; off < Math.min(24, patchedBytes.length); off++) {
      const val = patchedBytes[off];
      if (off === 5 || off === 6 || off === 8 || off === 10) {
        if (val === srcProf.korfMajorByte || (val > dstProf.korfMajorByte && val <= 0x08)) {
          patchedBytes[off] = dstProf.korfMajorByte;
          patchedOffsets.push(off);
        }
      } else if (off === 7 || off === 9 || off === 11) {
        if (val === srcProf.korfModelByte || (srcProf.korfMajorByte > dstProf.korfMajorByte && val === 0x04)) {
          patchedBytes[off] = dstProf.korfModelByte;
          patchedOffsets.push(off);
        }
      }
    }

    // If no version byte was above target in 0x04..0x17, write target model signature byte at KORF header revision slot 0x07
    if (patchedOffsets.length === 0 && patchedBytes.length > 7) {
      if (patchedBytes[7] !== dstProf.korfModelByte) {
        patchedBytes[7] = dstProf.korfModelByte;
        patchedOffsets.push(7);
      }
    }
  }

  // 2. Patch KORG sub-chunk headers (PCG1, KMP1, STY1, PRF1, PAD1, KST1) & OC41->OC31 within first 4 KB
  const chunkScanLimit = Math.min(patchedBytes.length - 8, 4096);
  for (let i = 0; i < chunkScanLimit; i++) {
    for (const chunkId of KORG_SUBCHUNKS) {
      if (matchAsciiAt(patchedBytes, i, chunkId)) {
        const verOffset = i + 4;
        const verMajor = patchedBytes[verOffset];
        if (verMajor === srcProf.subChunkVersion || (verMajor > dstProf.subChunkVersion && verMajor <= 0x08)) {
          patchedBytes[verOffset] = dstProf.subChunkVersion;
          patchedOffsets.push(verOffset);
        }
        if (i + 5 < patchedBytes.length && patchedBytes[i + 5] === srcProf.korfModelByte) {
          patchedBytes[i + 5] = dstProf.korfModelByte;
          patchedOffsets.push(i + 5);
        }
      }
    }

    // Downgrade Pa4X OC41 container marker to Pa3X OC31 when targeting Pa3X/Pa900/Pa600
    if (dstProf.korfMajorByte <= 0x03 && matchAsciiAt(patchedBytes, i, 'OC41')) {
      writeAsciiFixedLength(patchedBytes, i, 4, 'OC31', patchedOffsets);
    }
  }

  // 3. Patch embedded ASCII model strings (e.g. "Pa4X" -> "Pa3X") in header metadata region (first 1024 bytes)
  const tagScanLimit = Math.min(patchedBytes.length - 4, 1024);
  for (let i = 0; i < tagScanLimit; i++) {
    for (const tag of MODEL_TEXT_TAGS) {
      if (matchAsciiAt(patchedBytes, i, tag)) {
        const targetLabel = targetModel === 'pa5x' ? 'Pa5X' : targetModel === 'pa1000' ? 'Pa1000' : targetModel === 'pa700' ? 'Pa700' : targetModel === 'pa900' ? 'Pa900' : targetModel === 'pa600' ? 'Pa600' : targetModel === 'pa4x' ? 'Pa4X' : 'Pa3X';
        writeAsciiFixedLength(patchedBytes, i, tag.length, targetLabel, patchedOffsets);
      }
    }
  }

  // 4. Fallback for headerless/custom binary chunks when explicit model conversion is requested
  if (!hasKorfMagic && patchedOffsets.length === 0 && patchedBytes.length >= 8) {
    if (patchedBytes[4] !== dstProf.korfMajorByte) {
      patchedBytes[4] = dstProf.korfMajorByte;
      patchedOffsets.push(4);
    }
    if (patchedBytes[5] !== dstProf.korfModelByte) {
      patchedBytes[5] = dstProf.korfModelByte;
      patchedOffsets.push(5);
    }
  }

  const uniqueOffsets = Array.from(new Set(patchedOffsets)).sort((a, b) => a - b);
  const patchedHeaderHex = bytesToHex(patchedBytes, 20);
  const wasPatched = uniqueOffsets.length > 0;

  return {
    patchedBytes,
    summary: {
      path,
      fileName,
      ext,
      sizeBytes: sourceBytes.byteLength,
      originalHeaderHex,
      patchedHeaderHex,
      patchedOffsets: uniqueOffsets,
      wasPatched,
      reasonAr: wasPatched
        ? `تعديل ${uniqueOffsets.length} بايت ترويسة (${sourceModel.toUpperCase()} ← ${targetModel.toUpperCase()})`
        : 'الترويسة متوافقة مسبقاً',
      reasonEn: wasPatched
        ? `Patched ${uniqueOffsets.length} header byte(s) (${sourceModel.toUpperCase()} -> ${targetModel.toUpperCase()})`
        : 'Header already compatible',
    },
  };
}

export function previewSetBinaryPatches(
  parsedSet: ParsedPaSet | null,
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId
): BinaryPatchSummary[] {
  if (!parsedSet) return [];
  const summaries: BinaryPatchSummary[] = [];

  for (const [path, bytes] of parsedSet.rawFilesMap.entries()) {
    const ext = getExtUpper(path);
    if (!PATCHABLE_EXTENSIONS.has(ext)) continue;
    const { summary } = patchKorgBinaryFile(path, bytes, sourceModel, targetModel);
    summaries.push(summary);
  }

  return summaries;
}

export function inspectPcmMemory(
  parsedSet: ParsedPaSet | null,
  targetModel: KorgPaModelId
): PcmMemoryReport {
  const pcmBytes = parsedSet?.pcmTotalBytes || 0;
  const pcmMb = pcmBytes / (1024 * 1024);

  const reclaimablePcmBytes = parsedSet
    ? parsedSet.unusedSoundAndPcmAssets
        .filter((a) => a.kind === 'pcm' || a.kind === 'multisample')
        .reduce((sum, a) => sum + a.sizeBytes, 0)
    : 0;
  const reclaimablePcmMb = reclaimablePcmBytes / (1024 * 1024);

  const targetStandardMb =
    targetModel === 'pa3x'
      ? 256
      : targetModel === 'pa3x_le'
      ? 128
      : PA_MODEL_SPECS[targetModel].maxPcmMb;
  const targetExpandedMb =
    targetModel === 'pa3x'
      ? 512
      : targetModel === 'pa3x_le'
      ? 256
      : PA_MODEL_SPECS[targetModel].maxPcmMb;

  return {
    pcmBytes,
    pcmMb,
    reclaimablePcmBytes,
    reclaimablePcmMb,
    targetStandardMb,
    targetExpandedMb,
    exceedsStandard: pcmMb > targetStandardMb,
    exceedsExpanded: pcmMb > targetExpandedMb,
  };
}

export interface ModelDowngradeDiagnosis {
  isNextGenToLegacyDowngrade: boolean;
  kstCount: number;
  extraBanksForTarget: string[];
  hasLargeOrCompressedPcm: boolean;
  pcmMb: number;
}

export function inspectModelCompatibility(
  parsedSet: ParsedPaSet | null,
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId
): ModelDowngradeDiagnosis {
  const isNextGenSource = sourceModel === 'pa5x' || sourceModel === 'pa4x' || sourceModel === 'pa1000' || sourceModel === 'pa700';
  const isLegacyTarget = targetModel === 'pa3x' || targetModel === 'pa3x_le' || targetModel === 'pa900' || targetModel === 'pa600';
  const dstSpec = PA_MODEL_SPECS[targetModel];

  if (!parsedSet) {
    return {
      isNextGenToLegacyDowngrade: isNextGenSource && isLegacyTarget,
      kstCount: 0,
      extraBanksForTarget: [],
      hasLargeOrCompressedPcm: false,
      pcmMb: 0,
    };
  }

  const kstCount = parsedSet.assets.filter((a) => a.fileName.toUpperCase().endsWith('.KST')).length;
  const extraBanksForTarget: string[] = [];

  for (const asset of parsedSet.assets) {
    if (asset.kind !== 'sound_bank') continue;
    const info = inferBankFromFileName(asset.fileName, 0);
    if (info.bankType === 'user_dk' && info.userBankIndex > dstSpec.userDkBanks) {
      extraBanksForTarget.push(asset.fileName);
    } else if (info.bankType === 'user_sound' && info.userBankIndex > dstSpec.userSoundBanks) {
      extraBanksForTarget.push(asset.fileName);
    }
  }

  const pcmMb = parsedSet.pcmTotalBytes / (1024 * 1024);
  const hasLargeOrCompressedPcm = parsedSet.pcmCount > 0 && (pcmMb > dstSpec.maxPcmMb || isNextGenSource);

  return {
    isNextGenToLegacyDowngrade: isNextGenSource && isLegacyTarget,
    kstCount,
    extraBanksForTarget,
    hasLargeOrCompressedPcm,
    pcmMb,
  };
}

function toCleanSetRelativePath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const setIdx = parts.findIndex((seg) => /\.SET$/i.test(seg));
  if (setIdx >= 0 && setIdx < parts.length - 1) {
    return parts.slice(setIdx + 1).join('/');
  }
  const knownIdx = parts.findIndex((seg) =>
    /^(SOUND|STYLE|PCM|MULTISMP|PERFORM|KEYBOARDSET|PAD|GLOBAL|SONGBOOK)$/i.test(seg)
  );
  if (knownIdx >= 0) {
    return parts.slice(knownIdx).join('/');
  }
  return parts.length > 1 ? parts.slice(1).join('/') : normalized;
}

export async function exportConvertedArchive(
  convertedSounds: ConvertedSoundEntry[],
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId,
  parsedSet?: ParsedPaSet | null
): Promise<{ blob: Blob; filename: string; patchedCount: number; patchSummaries: BinaryPatchSummary[] }> {
  const zip = new JSZip();
  const patchSummaries: BinaryPatchSummary[] = [];
  let patchedCount = 0;

  const baseName = sanitizeSetFolderName(parsedSet?.setName || 'KORG_SOUNDS');
  const setFolder = `${baseName}_${targetModel.toUpperCase()}.SET`;

  if (parsedSet) {
    for (const [path, data] of parsedSet.rawFilesMap.entries()) {
      const innerPath = toCleanSetRelativePath(path);
      const ext = getExtUpper(path);
      if (PATCHABLE_EXTENSIONS.has(ext)) {
        const { patchedBytes, summary } = patchKorgBinaryFile(path, data, sourceModel, targetModel);
        zip.file(`${setFolder}/${innerPath}`, patchedBytes);
        patchSummaries.push(summary);
        if (summary.wasPatched) patchedCount++;
      } else {
        zip.file(`${setFolder}/${innerPath}`, data);
      }
    }
  }

  const csvLines = [
    'Name,Source_File,Source_MSB,Source_LSB,Source_PC,Target_Model,Target_MSB,Target_LSB,Target_PC,Target_Bank',
    ...convertedSounds.map((c) =>
      `"${c.original.name.replace(/"/g, '""')}","${c.original.sourceFile}",${c.original.msb},${c.original.lsb},${c.original.pc},${targetModel.toUpperCase()},${c.targetMsb},${c.targetLsb},${c.targetPc},"${c.targetBankLabel}"`
    ),
  ];

  const patchReportLines = patchSummaries.map(
    (p) => `${p.path} | ${p.wasPatched ? 'PATCHED' : 'OK'} | Offsets: [${p.patchedOffsets.join(',')}] | Before: ${p.originalHeaderHex} -> After: ${p.patchedHeaderHex}`
  );

  const report = [
    `KORG PA MODEL CONVERSION & BINARY PATCH REPORT`,
    `Source Model: ${PA_MODEL_SPECS[sourceModel].label}`,
    `Target Model: ${PA_MODEL_SPECS[targetModel].label}`,
    `Output SET Folder: ${setFolder}/`,
    `Binary Patched Files (.PCG/.KMP/.STY/.PRF/.PAD): ${patchedCount} / ${patchSummaries.length}`,
    `Converted Sound Entries: ${convertedSounds.length}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    'NOTE: Browser-side patching updates KORG header markers and MIDI Bank/PC tables.',
    'Full Pa4X -> Pa3X downgrade with compressed PCM/DNC2/KST requires desktop KORG PA Manager.',
    '',
    '--- BINARY HEADER PATCH DETAILS ---',
    ...patchReportLines,
  ].join('\n');

  zip.file('KORG_CONVERTED_BANKS.csv', csvLines.join('\n'));
  zip.file('CONVERSION_REPORT.txt', report);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return {
    blob,
    filename: `${baseName}_${targetModel.toUpperCase()}_PATCHED.SET.zip`,
    patchedCount,
    patchSummaries,
  };
}

export interface SingleSoundExportResult {
  blob: Blob;
  filename: string;
  soundCount: number;
  pcgCount: number;
  sampleCount: number;
  patchedCount: number;
  includedFiles: string[];
}

/**
 * Extracts and packages ONLY the user-selected sound(s) (with their .PCG bank & linked .KMP/.KSF/.PCM samples)
 * from ANY KORG Pa model into a clean standalone .SET.zip ready to load on the keyboard.
 */
export async function exportSelectedSoundsPackage(
  selectedSounds: ConvertedSoundEntry[],
  sourceModel: KorgPaModelId,
  targetModel: KorgPaModelId,
  parsedSet?: ParsedPaSet | null
): Promise<SingleSoundExportResult> {
  const zip = new JSZip();
  const includedFiles: string[] = [];
  let pcgCount = 0;
  let sampleCount = 0;
  let patchedCount = 0;

  const firstSoundLabel = selectedSounds[0]?.original.name || parsedSet?.setName || 'SELECTED_SOUND';
  const baseName = sanitizeSetFolderName(
    selectedSounds.length === 1 ? firstSoundLabel : `${parsedSet?.setName || 'KORG'}_SELECTED`
  );
  const setFolder = `${baseName}_${targetModel.toUpperCase()}.SET`;

  if (parsedSet && selectedSounds.length > 0) {
    const selectedSourceFiles = new Set(selectedSounds.map((s) => s.original.sourceFile.toUpperCase()));
    const selectedNameTokens = new Set<string>();
    selectedSounds.forEach((s) => {
      const upper = s.original.name.trim().toUpperCase();
      if (upper.length >= 2) selectedNameTokens.add(upper);
      upper.split(/[\s._-]+/).forEach((tok) => {
        if (tok.length >= 3) selectedNameTokens.add(tok);
      });
    });

    // 1. Collect matching .PCG Sound Bank file(s)
    const matchedPcgAssets = parsedSet.assets.filter(
      (a) => a.kind === 'sound_bank' && selectedSourceFiles.has(a.fileName.toUpperCase())
    );

    const bankTokens = new Set<string>(selectedNameTokens);
    for (const pcgAsset of matchedPcgAssets) {
      bankTokens.add(stripExtension(pcgAsset.fileName).toUpperCase());
      pcgAsset.extractedNames.forEach((tok) => {
        const u = tok.trim().toUpperCase();
        if (u.length >= 3) bankTokens.add(u);
      });

      const rawBytes = parsedSet.rawFilesMap.get(pcgAsset.path);
      if (!rawBytes) continue;
      const innerPath = `SOUND/${pcgAsset.fileName}`;
      const { patchedBytes, summary } = patchKorgBinaryFile(pcgAsset.path, rawBytes, sourceModel, targetModel);
      zip.file(`${setFolder}/${innerPath}`, patchedBytes);
      includedFiles.push(innerPath);
      pcgCount++;
      if (summary.wasPatched) patchedCount++;
    }

    // 2. Collect linked .KMP / .KSF / .PCM sample assets referenced by the selected sound(s) / .PCG
    const allSampleAssets = parsedSet.assets.filter(
      (a) => a.kind === 'multisample' || a.kind === 'pcm'
    );
    const matchedSampleAssets = allSampleAssets.filter((asset) => {
      const stemUpper = stripExtension(asset.fileName).toUpperCase();
      if (selectedSourceFiles.has(asset.fileName.toUpperCase())) return true;
      if (asset.usedBy.some((u) => selectedSourceFiles.has(u.toUpperCase()))) return true;
      for (const tok of bankTokens) {
        if (stemUpper.includes(tok) || tok.includes(stemUpper)) return true;
        if (asset.extractedNames.some((n) => n.toUpperCase().includes(tok))) return true;
      }
      return false;
    });

    // Fallback: Korg Pa sets often store shared samples in unnamed RAM.PCM / 000001.PCM files;
    // include the set's .PCM files when matched by .PCG or if no narrower .PCM matched so the sound won't load silent.
    const hasPcmMatched = matchedSampleAssets.some((a) => a.kind === 'pcm');
    const finalSamples =
      hasPcmMatched || matchedPcgAssets.length === 0
        ? matchedSampleAssets
        : [
            ...matchedSampleAssets,
            ...allSampleAssets.filter((a) => a.kind === 'pcm' && !matchedSampleAssets.includes(a)),
          ];

    for (const sampleAsset of finalSamples) {
      const rawBytes = parsedSet.rawFilesMap.get(sampleAsset.path);
      if (!rawBytes) continue;
      const folder = sampleAsset.kind === 'pcm' ? 'PCM' : 'MULTISMP';
      const innerPath = `${folder}/${sampleAsset.fileName}`;
      if (PATCHABLE_EXTENSIONS.has(getExtUpper(sampleAsset.fileName))) {
        const { patchedBytes, summary } = patchKorgBinaryFile(sampleAsset.path, rawBytes, sourceModel, targetModel);
        zip.file(`${setFolder}/${innerPath}`, patchedBytes);
        if (summary.wasPatched) patchedCount++;
      } else {
        zip.file(`${setFolder}/${innerPath}`, rawBytes);
      }
      includedFiles.push(innerPath);
      sampleCount++;
    }
  }

  const csvLines = [
    'Sound_Name,Source_File,Source_Model,Source_MSB,Source_LSB,Source_PC,Target_Model,Target_MSB,Target_LSB,Target_PC,Target_Bank',
    ...selectedSounds.map((c) =>
      `"${c.original.name.replace(/"/g, '""')}","${c.original.sourceFile}",${sourceModel.toUpperCase()},${c.original.msb},${c.original.lsb},${c.original.pc},${targetModel.toUpperCase()},${c.targetMsb},${c.targetLsb},${c.targetPc},"${c.targetBankLabel}"`
    ),
  ];

  const instructions = [
    `KORG PA SINGLE / SELECTED SOUND READY PACKAGE`,
    `==============================================`,
    `Source Model: ${PA_MODEL_SPECS[sourceModel].label}`,
    `Target Model: ${PA_MODEL_SPECS[targetModel].label}`,
    `Selected Sounds (${selectedSounds.length}): ${selectedSounds.map((s) => s.original.name).join(', ')}`,
    `Included .PCG Sound Banks: ${pcgCount}`,
    `Included .KMP / .KSF / .PCM Samples: ${sampleCount}`,
    `Header-Patched Binary Files: ${patchedCount}`,
    '',
    'HOW TO LOAD ON YOUR KORG PA KEYBOARD:',
    '1. Extract this ZIP and copy the folder "' + setFolder + '" onto your USB flash drive.',
    '2. On Korg PA: Press MEDIA -> Load -> Open "' + setFolder + '" -> Open SOUND.',
    '3. Select the .PCG bank or open it to pick the individual sound and press Load.',
    '   (KORG PA automatically loads the linked PCM/KMP samples from the same .SET folder.)',
    '',
    '--- SELECTED SOUNDS COORDINATES ---',
    ...selectedSounds.map(
      (s, i) => `${i + 1}. ${s.original.name} | From: ${s.original.sourceFile} | Target MIDI: MSB=${s.targetMsb} LSB=${s.targetLsb} PC=${s.targetPc} (${s.targetBankLabel})`
    ),
  ].join('\n');

  zip.file(`${setFolder}/SELECTED_SOUNDS.csv`, csvLines.join('\n'));
  zip.file(`${setFolder}/LOAD_INSTRUCTIONS.txt`, instructions);

  // Fast STORE compression for mobile speed
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });

  return {
    blob,
    filename: `${baseName}_${targetModel.toUpperCase()}_READY.SET.zip`,
    soundCount: selectedSounds.length,
    pcgCount,
    sampleCount,
    patchedCount,
    includedFiles,
  };
}

const STAGE_COLORS: CustomPadButton['color'][] = [
  'purple',
  'cyan',
  'emerald',
  'blue',
  'pink',
  'orange',
  'red',
  'amber',
  'green',
];

/**
 * Imports up to 12 selected converted sounds into a chosen Stage Sound Bank (B1..B16)
 * without overwriting the other banks or untouched slots.
 */
export function importSelectedSoundsToStageBank(
  convertedSounds: ConvertedSoundEntry[],
  targetPage: number = 1
): number {
  const safePage = Math.max(1, Math.min(16, Math.round(Number(targetPage) || 1)));
  const existingRaw = localStorage.getItem('korg_arabscale_sounds');
  let existingPads: CustomPadButton[] = [];
  try {
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw);
      if (Array.isArray(parsed)) existingPads = parsed;
    }
  } catch {
    existingPads = [];
  }

  const slice = convertedSounds.slice(0, 12);
  if (slice.length === 0) return 0;

  const targetPageExisting = existingPads.filter((p) => (p.page ?? 1) === safePage);
  const updatedTargetPads: CustomPadButton[] = Array.from({ length: 12 }, (_, idx) => {
    const conv = slice[idx];
    const padId = safePage === 1 ? `snd_${idx}` : `snd_b${safePage}_${idx}`;
    const defaultBank = Math.max(0, Math.min(15, safePage - 1));
    const defaultPerf = (idx % 32) + 1;
    const fallback: CustomPadButton = targetPageExisting[idx] || {
      id: padId,
      slotIndex: idx,
      page: safePage,
      type: 'sound',
      name: `PERF ${defaultPerf}`,
      msb: 1,
      lsb: defaultBank,
      pc: defaultPerf - 1,
      bankNumber: defaultBank,
      performanceNumber: defaultPerf,
      color: STAGE_COLORS[(idx + safePage) % STAGE_COLORS.length],
      channel: 'ch16',
    };

    if (!conv) return fallback;

    const importedBank = Math.max(0, Math.min(15, conv.targetLsb >= 64 ? (conv.targetLsb - 64) % 16 : conv.targetLsb));
    const importedPerf = (Math.max(0, Math.round(conv.targetPc)) % 32) + 1;
    return {
      ...fallback,
      id: fallback.id || padId,
      slotIndex: idx,
      page: safePage,
      type: 'sound',
      name: conv.original.name.slice(0, 14),
      msb: 1,
      lsb: importedBank,
      pc: importedPerf - 1,
      bankNumber: importedBank,
      performanceNumber: importedPerf,
      color: fallback.color || STAGE_COLORS[(idx + safePage) % STAGE_COLORS.length],
      channel: 'ch16',
      isEmpty: false,
    };
  });

  const otherBankPads = existingPads.filter((p) => (p.page ?? 1) !== safePage);
  localStorage.setItem('korg_arabscale_sounds', JSON.stringify([...updatedTargetPads, ...otherBankPads]));
  return slice.length;
}

/**
 * Backward-compatible wrapper importing converted sounds into Stage Sound Bank B1.
 */
export function importConvertedSoundsToStageButtons(convertedSounds: ConvertedSoundEntry[]): number {
  return importSelectedSoundsToStageBank(convertedSounds, 1);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// FEATURE #3: MOBILE SET COMBINER (STORE COMPRESSION + PROPER NUMBERING)
// ============================================================================

export interface CombinedSetOptions {
  mergedName: string;
  setA: ParsedPaSet | null;
  setB: ParsedPaSet | null;
  selectedSoundPathsA: Set<string>;
  selectedSoundPathsB: Set<string>;
  selectedStylePathsA: Set<string>;
  selectedStylePathsB: Set<string>;
  includeSupportingAssets?: boolean;
}

export interface CombinedSetResult {
  blob: Blob;
  filename: string;
  soundBanksCount: number;
  styleBanksCount: number;
  supportingFilesCount: number;
  totalFilesCount: number;
  totalBytes: number;
  manifestLines: string[];
}

function sanitizeSetFolderName(raw: string): string {
  const cleaned = raw.trim().replace(/\.SET$/i, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return (cleaned || 'MERGED_KORG').slice(0, 28).toUpperCase();
}

function isDrumKitPcg(fileName: string): boolean {
  const upper = fileName.toUpperCase();
  return upper.includes('DK') || upper.includes('DRUM');
}

export async function buildCombinedSetZip(options: CombinedSetOptions): Promise<CombinedSetResult> {
  const zip = new JSZip();
  const baseName = sanitizeSetFolderName(options.mergedName);
  const rootFolder = `${baseName}.SET`;

  let userSoundCounter = 1;
  let userDkCounter = 1;
  let styleBankCounter = 1;
  let supportingFilesCount = 0;
  let totalFilesCount = 0;
  let totalBytes = 0;
  const manifestLines: string[] = [
    `KORG PA MOBILE SET COMBINER MANIFEST`,
    `Output SET Folder: ${rootFolder}`,
    `Compression: STORE (Fast Mobile USB Ready)`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '--- SOUND BANKS (.PCG) ---',
  ];

  const writeZipFile = (relPath: string, data: Uint8Array) => {
    zip.file(`${rootFolder}/${relPath}`, data);
    totalFilesCount++;
    totalBytes += data.byteLength;
  };

  // 1. Collect & sequentially renumber selected .PCG Sound Banks (Set A then Set B)
  const addSoundBanksFromSet = (tag: 'SET_A' | 'SET_B', set: ParsedPaSet | null, selectedPaths: Set<string>) => {
    if (!set) return;
    const assets = set.assets.filter((a) => a.kind === 'sound_bank' && selectedPaths.has(a.path));
    assets.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));

    for (const asset of assets) {
      const data = set.rawFilesMap.get(asset.path);
      if (!data) continue;
      let targetFileName: string;
      if (isDrumKitPcg(asset.fileName)) {
        targetFileName = userDkCounter === 1 ? 'USERDK.PCG' : `USERDK${String(userDkCounter).padStart(2, '0')}.PCG`;
        userDkCounter++;
      } else {
        targetFileName = `USER${String(userSoundCounter).padStart(2, '0')}.PCG`;
        userSoundCounter++;
      }
      const targetRel = `SOUND/${targetFileName}`;
      writeZipFile(targetRel, data);
      manifestLines.push(`[${tag}] ${asset.path} -> ${targetRel} (${formatBytes(data.byteLength)})`);
    }
  };

  addSoundBanksFromSet('SET_A', options.setA, options.selectedSoundPathsA);
  addSoundBanksFromSet('SET_B', options.setB, options.selectedSoundPathsB);

  manifestLines.push('', '--- STYLE BANKS (.STY) ---');

  // 2. Collect & sequentially renumber selected .STY Style Banks (Set A then Set B)
  const addStyleBanksFromSet = (tag: 'SET_A' | 'SET_B', set: ParsedPaSet | null, selectedPaths: Set<string>) => {
    if (!set) return;
    const assets = set.assets.filter((a) => a.kind === 'style' && selectedPaths.has(a.path));
    assets.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));

    for (const asset of assets) {
      const data = set.rawFilesMap.get(asset.path);
      if (!data) continue;
      const targetFileName = `USER${String(styleBankCounter).padStart(2, '0')}.STY`;
      styleBankCounter++;
      const targetRel = `STYLE/${targetFileName}`;
      writeZipFile(targetRel, data);
      manifestLines.push(`[${tag}] ${asset.path} -> ${targetRel} (${formatBytes(data.byteLength)})`);
    }
  };

  addStyleBanksFromSet('SET_A', options.setA, options.selectedStylePathsA);
  addStyleBanksFromSet('SET_B', options.setB, options.selectedStylePathsB);

  const soundBanksCount = (userSoundCounter - 1) + (userDkCounter - 1);
  const styleBanksCount = styleBankCounter - 1;

  // 3. Optionally include PCM / Multisample / Performance / Pad assets from any set that contributed banks
  const includeSupport = options.includeSupportingAssets !== false;
  if (includeSupport) {
    const usedRelativePaths = new Set<string>();
    const addSupportFromSet = (tag: 'A' | 'B', set: ParsedPaSet | null, hasSelected: boolean) => {
      if (!set || !hasSelected) return;
      for (const asset of set.assets) {
        if (
          asset.kind !== 'pcm' &&
          asset.kind !== 'multisample' &&
          asset.kind !== 'pad' &&
          asset.kind !== 'performance'
        ) {
          continue;
        }
        const data = set.rawFilesMap.get(asset.path);
        if (!data) continue;
        const folder =
          asset.kind === 'pcm'
            ? 'PCM'
            : asset.kind === 'multisample'
            ? 'MULTISMP'
            : asset.kind === 'pad'
            ? 'PAD'
            : 'PERFORM';

        let targetRel = `${folder}/${asset.fileName}`;
        if (usedRelativePaths.has(targetRel.toUpperCase())) {
          const dot = asset.fileName.lastIndexOf('.');
          const stem = dot > 0 ? asset.fileName.slice(0, dot) : asset.fileName;
          const ext = dot > 0 ? asset.fileName.slice(dot) : '';
          targetRel = `${folder}/${stem}_${tag}${ext}`;
        }
        usedRelativePaths.add(targetRel.toUpperCase());
        writeZipFile(targetRel, data);
        supportingFilesCount++;
      }
    };

    addSupportFromSet(
      'A',
      options.setA,
      options.selectedSoundPathsA.size > 0 || options.selectedStylePathsA.size > 0
    );
    addSupportFromSet(
      'B',
      options.setB,
      options.selectedSoundPathsB.size > 0 || options.selectedStylePathsB.size > 0
    );
  }

  manifestLines.push(
    '',
    `Total Sound Banks (.PCG): ${soundBanksCount}`,
    `Total Style Banks (.STY): ${styleBanksCount}`,
    `Supporting Assets (PCM/KMP/PAD/PRF): ${supportingFilesCount}`
  );
  zip.file(`${rootFolder}/MERGE_MANIFEST.txt`, manifestLines.join('\n'));

  // Fast STORE compression (zero CPU bottleneck on mobile)
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });

  return {
    blob,
    filename: `${baseName}.SET.zip`,
    soundBanksCount,
    styleBanksCount,
    supportingFilesCount,
    totalFilesCount,
    totalBytes,
    manifestLines,
  };
}

// ============================================================================
// FEATURE #4: REAL KORG .SET.zip SINGLE SOUND / PERFORMANCE EXTRACTOR
// ============================================================================

export interface ExtractableSetItem {
  id: string;
  itemType: 'sound' | 'performance';
  name: string;
  sourceFile: string;
  sourcePath: string;
  bankLabel: string;
  midiCoord: string;
  msb: number;
  lsb: number;
  pc: number;
  isUsedInSet: boolean;
}

export interface PrunedSoundPackPlan {
  soundAssets: ParsedSetAsset[];
  multisampleAssets: ParsedSetAsset[];
  pcmAssets: ParsedSetAsset[];
  performAssets: ParsedSetAsset[];
  totalBytes: number;
}

export interface ExtractedSinglePackResult {
  blob: Blob;
  filename: string;
  setFolderName: string;
  targetModel: PaExtractorTargetModel;
  soundFilesCount: number;
  multisampleFilesCount: number;
  pcmFilesCount: number;
  performFilesCount: number;
  patchedCount: number;
  totalBytes: number;
  includedPaths: string[];
}

export function buildExtractableSetItems(parsedSet: ParsedPaSet | null): ExtractableSetItem[] {
  if (!parsedSet) return [];
  const items: ExtractableSetItem[] = [];

  const assetByFileUpper = new Map<string, ParsedSetAsset>();
  for (const asset of parsedSet.assets) {
    if (asset.kind === 'sound_bank') {
      assetByFileUpper.set(asset.fileName.toUpperCase(), asset);
    }
  }

  for (const snd of parsedSet.extractedSounds) {
    const matchedAsset = assetByFileUpper.get(snd.sourceFile.toUpperCase());
    if (!matchedAsset) continue;
    const bankLabel =
      snd.bankType === 'user_dk'
        ? `USER DK ${snd.userBankIndex}`
        : snd.bankType === 'user_sound'
        ? `USER 0${snd.userBankIndex}`
        : `SOUND`;
    items.push({
      id: `item_${snd.id}`,
      itemType: 'sound',
      name: snd.name,
      sourceFile: snd.sourceFile,
      sourcePath: matchedAsset.path,
      bankLabel,
      midiCoord: `${snd.msb}·${snd.lsb}·${snd.pc}`,
      msb: snd.msb,
      lsb: snd.lsb,
      pc: snd.pc,
      isUsedInSet: snd.isUsedInSet,
    });
  }

  const perfAssets = parsedSet.assets.filter((a) => a.kind === 'performance');
  perfAssets.forEach((pa, idx) => {
    const cleanFile = stripExtension(pa.fileName);
    const names = pa.extractedNames.length > 0 ? pa.extractedNames.slice(0, 20) : [cleanFile];
    names.forEach((rawName, j) => {
      const displayName = rawName.slice(0, 22);
      const triplet = pa.referencedTriplets[j] || pa.referencedTriplets[0];
      const msb = triplet ? triplet.msb : 0;
      const lsb = triplet ? triplet.lsb : (idx % 16);
      const pc = triplet ? triplet.pc : (j % 32);
      items.push({
        id: `item_prf_${idx}_${j}`,
        itemType: 'performance',
        name: displayName,
        sourceFile: pa.fileName,
        sourcePath: pa.path,
        bankLabel: pa.fileName.toUpperCase().endsWith('.KST') ? 'KBD SET (.KST)' : 'PERFORM (.PRF)',
        midiCoord: `${msb}·${lsb}·${pc}`,
        msb,
        lsb,
        pc,
        isUsedInSet: true,
      });
    });
  });

  return items;
}

function addTokensFromString(target: Set<string>, text: string) {
  const upper = text.trim().toUpperCase();
  if (upper.length >= 2) target.add(upper);
  upper.split(/[\s._\-/\\]+/).forEach((tok) => {
    if (tok.length >= 3 && !SYSTEM_NOISE_TOKENS.has(tok)) {
      target.add(tok);
    }
  });
}

function assetMatchesTokens(asset: ParsedSetAsset, tokens: Set<string>, holderFileNames: Set<string>): boolean {
  const fileUpper = asset.fileName.toUpperCase();
  const stemUpper = stripExtension(asset.fileName).toUpperCase();
  if (holderFileNames.has(fileUpper)) return true;
  if (asset.usedBy.some((u) => holderFileNames.has(u.toUpperCase()))) return true;
  for (const tok of tokens) {
    if (stemUpper === tok || (tok.length >= 4 && stemUpper.includes(tok)) || (stemUpper.length >= 4 && tok.includes(stemUpper))) {
      return true;
    }
    if (asset.extractedNames.some((n) => {
      const nu = n.toUpperCase();
      return nu === tok || (tok.length >= 4 && nu.includes(tok));
    })) {
      return true;
    }
  }
  return false;
}

export function planSingleSoundPackDependencies(
  parsedSet: ParsedPaSet | null,
  selectedItem: ExtractableSetItem | null
): PrunedSoundPackPlan {
  if (!parsedSet || !selectedItem) {
    return { soundAssets: [], multisampleAssets: [], pcmAssets: [], performAssets: [], totalBytes: 0 };
  }

  const tokens = new Set<string>();
  addTokensFromString(tokens, selectedItem.name);
  addTokensFromString(tokens, stripExtension(selectedItem.sourceFile));

  const soundAssets: ParsedSetAsset[] = [];
  const performAssets: ParsedSetAsset[] = [];

  if (selectedItem.itemType === 'sound') {
    const primaryPcg = parsedSet.assets.find(
      (a) => a.kind === 'sound_bank' && a.path === selectedItem.sourcePath
    ) || parsedSet.assets.find(
      (a) => a.kind === 'sound_bank' && a.fileName.toUpperCase() === selectedItem.sourceFile.toUpperCase()
    );
    if (primaryPcg) {
      soundAssets.push(primaryPcg);
      addTokensFromString(tokens, stripExtension(primaryPcg.fileName));
      primaryPcg.extractedNames.forEach((n) => addTokensFromString(tokens, n));
    }

    const pcgBankInfo = inferBankFromFileName(selectedItem.sourceFile, 0);
    for (const pa of parsedSet.assets) {
      if (pa.kind !== 'performance') continue;
      const matchesTriplet = pa.referencedTriplets.some(
        (t) => t.msb === pcgBankInfo.msb && t.lsb === pcgBankInfo.lsb
      );
      const matchesName = assetMatchesTokens(pa, tokens, new Set([selectedItem.sourceFile.toUpperCase()]));
      if (matchesTriplet || matchesName) {
        performAssets.push(pa);
        pa.extractedNames.forEach((n) => addTokensFromString(tokens, n));
      }
    }
  } else {
    const primaryPerf = parsedSet.assets.find(
      (a) => a.kind === 'performance' && a.path === selectedItem.sourcePath
    );
    if (primaryPerf) {
      performAssets.push(primaryPerf);
      addTokensFromString(tokens, stripExtension(primaryPerf.fileName));
      primaryPerf.extractedNames.forEach((n) => addTokensFromString(tokens, n));

      const perfTriplets = primaryPerf.referencedTriplets;
      for (const pcg of parsedSet.assets) {
        if (pcg.kind !== 'sound_bank') continue;
        const bankInfo = inferBankFromFileName(pcg.fileName, 0);
        const matchesTriplet = perfTriplets.some((t) => t.msb === bankInfo.msb && t.lsb === bankInfo.lsb);
        const matchesName = assetMatchesTokens(pcg, tokens, new Set([primaryPerf.fileName.toUpperCase()]));
        if (matchesTriplet || matchesName) {
          soundAssets.push(pcg);
          addTokensFromString(tokens, stripExtension(pcg.fileName));
          pcg.extractedNames.forEach((n) => addTokensFromString(tokens, n));
        }
      }
    }
  }

  const holderFiles = new Set<string>([
    ...soundAssets.map((a) => a.fileName.toUpperCase()),
    ...performAssets.map((a) => a.fileName.toUpperCase()),
  ]);

  const multisampleAssets = parsedSet.assets.filter(
    (a) => a.kind === 'multisample' && assetMatchesTokens(a, tokens, holderFiles)
  );

  for (const ms of multisampleAssets) {
    holderFiles.add(ms.fileName.toUpperCase());
    addTokensFromString(tokens, stripExtension(ms.fileName));
    ms.extractedNames.forEach((n) => addTokensFromString(tokens, n));
  }

  const allPcm = parsedSet.assets.filter((a) => a.kind === 'pcm');
  let pcmAssets = allPcm.filter((a) => assetMatchesTokens(a, tokens, holderFiles));

  // If no named PCM matched directly and there is a generic/shared RAM PCM in the set used by samples,
  // include only generic/used RAM PCM files so the keyboard sound doesn't load silent.
  if (pcmAssets.length === 0 && (soundAssets.length > 0 || multisampleAssets.length > 0)) {
    pcmAssets = allPcm.filter((a) => {
      const upper = stripExtension(a.fileName).toUpperCase();
      return /^(RAM|USERPCM|PCM\d*|SAMPLE\d*)$/i.test(upper) || (a.isUsed && a.usedBy.some((u) => holderFiles.has(u.toUpperCase())));
    });
  }

  const totalBytes = [...soundAssets, ...multisampleAssets, ...pcmAssets, ...performAssets].reduce(
    (sum, a) => sum + a.sizeBytes,
    0
  );

  return {
    soundAssets,
    multisampleAssets,
    pcmAssets,
    performAssets,
    totalBytes,
  };
}

/**
 * Packages ONLY the selected Sound or Performance along with its pruned SOUND/, MULTISMP/, PCM/, and PERFORM/
 * folders into a valid KORG .SET.zip archive for manual USB loading via MEDIA > Load across all Korg Pa models.
 */
export async function extractSingleSoundPackZip(
  parsedSet: ParsedPaSet,
  selectedItem: ExtractableSetItem,
  sourceModel: KorgPaModelId,
  targetModel: PaExtractorTargetModel
): Promise<ExtractedSinglePackResult> {
  const zip = new JSZip();
  const plan = planSingleSoundPackDependencies(parsedSet, selectedItem);

  const itemBase = sanitizeSetFolderName(selectedItem.name);
  const modelTag = targetModel === 'universal' ? 'ALL_PA' : targetModel.toUpperCase();
  const setFolderName = `${itemBase}_${modelTag}.SET`;

  // Ensure canonical KORG Pa folder tree exists in the exported .SET archive
  zip.folder(`${setFolderName}/SOUND`);
  zip.folder(`${setFolderName}/MULTISMP`);
  zip.folder(`${setFolderName}/PCM`);
  zip.folder(`${setFolderName}/PERFORM`);

  const includedPaths: string[] = [];
  let patchedCount = 0;

  const writePrunedAssets = (assets: ParsedSetAsset[], folderName: 'SOUND' | 'MULTISMP' | 'PCM' | 'PERFORM') => {
    for (const asset of assets) {
      const rawBytes = parsedSet.rawFilesMap.get(asset.path);
      if (!rawBytes) continue;
      const relPath = `${folderName}/${asset.fileName}`;
      const ext = getExtUpper(asset.fileName);

      if (targetModel !== 'universal' && targetModel !== sourceModel && PATCHABLE_EXTENSIONS.has(ext)) {
        const { patchedBytes, summary } = patchKorgBinaryFile(asset.path, rawBytes, sourceModel, targetModel);
        zip.file(`${setFolderName}/${relPath}`, patchedBytes);
        if (summary.wasPatched) patchedCount++;
      } else {
        zip.file(`${setFolderName}/${relPath}`, rawBytes);
      }
      includedPaths.push(relPath);
    }
  };

  writePrunedAssets(plan.soundAssets, 'SOUND');
  writePrunedAssets(plan.multisampleAssets, 'MULTISMP');
  writePrunedAssets(plan.pcmAssets, 'PCM');
  writePrunedAssets(plan.performAssets, 'PERFORM');

  const modelOption = PA_EXTRACTOR_MODEL_OPTIONS.find((m) => m.id === targetModel);
  const instructions = [
    `KORG PA SINGLE SOUND / PERFORMANCE EXTRACTED PACK`,
    `==================================================`,
    `Selected Item: ${selectedItem.name} (${selectedItem.itemType.toUpperCase()})`,
    `Source File: ${selectedItem.sourcePath}`,
    `MIDI Coordinate: ${selectedItem.midiCoord} (${selectedItem.bankLabel})`,
    `Target Compatibility: ${modelOption ? modelOption.labelEn : modelTag}`,
    `Header-Patched Files: ${patchedCount}`,
    ``,
    `PRUNED FOLDERS INCLUDED:`,
    `- SOUND/: ${plan.soundAssets.length} file(s)`,
    `- MULTISMP/: ${plan.multisampleAssets.length} file(s)`,
    `- PCM/: ${plan.pcmAssets.length} file(s)`,
    `- PERFORM/: ${plan.performAssets.length} file(s)`,
    ``,
    `HOW TO LOAD ON YOUR KORG PA KEYBOARD (USB):`,
    `1. Extract this .SET.zip archive and copy the "${setFolderName}" folder to your USB drive.`,
    `2. Insert USB into KORG Pa (Pa3X / Pa4X / Pa600 / Pa700 / Pa900 / Pa1000 / Pa5X).`,
    `3. Press MEDIA -> Load -> Open "${setFolderName}" -> Open SOUND or PERFORM.`,
    `4. Select the extracted item and press Load (linked PCM/MULTISMP load automatically).`,
    ``,
    `FILES IN ARCHIVE:`,
    ...includedPaths.map((p) => `  * ${setFolderName}/${p}`),
  ].join('\n');

  zip.file(`${setFolderName}/LOAD_INSTRUCTIONS.txt`, instructions);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });

  return {
    blob,
    filename: `${itemBase}_${modelTag}.SET.zip`,
    setFolderName,
    targetModel,
    soundFilesCount: plan.soundAssets.length,
    multisampleFilesCount: plan.multisampleAssets.length,
    pcmFilesCount: plan.pcmAssets.length,
    performFilesCount: plan.performAssets.length,
    patchedCount,
    totalBytes: plan.totalBytes,
    includedPaths,
  };
}


