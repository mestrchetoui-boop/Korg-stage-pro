import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FolderCog,
  Upload,
  FolderOpen,
  Trash2,
  Download,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  Music,
  HardDrive,
  FileArchive,
  Layers,
  Check,
  LayoutGrid,
  Plus,
  Cpu,
  AlertTriangle,
  GitMerge,
  Package,
  PackageCheck,
  Search,
  Radio,
} from 'lucide-react';
import {
  KorgPaModelId,
  PaExtractorTargetModel,
  PA_MODEL_SPECS,
  PA_EXTRACTOR_MODEL_OPTIONS,
  ParsedPaSet,
  ExtractedSoundBankEntry,
  ExtractableSetItem,
  ExtractedSinglePackResult,
  analyzeUploadedZip,
  analyzeUploadedFiles,
  analyzeUploadedEntries,
  buildCleanSetZip,
  parseTextSoundList,
  convertSoundsBetweenModels,
  previewSetBinaryPatches,
  inspectPcmMemory,
  inspectModelCompatibility,
  exportConvertedArchive,
  exportSelectedSoundsPackage,
  importSelectedSoundsToStageBank,
  buildCombinedSetZip,
  buildExtractableSetItems,
  planSingleSoundPackDependencies,
  extractSingleSoundPackZip,
  triggerBlobDownload,
  formatBytes,
} from '../services/paSetManager';

interface PaManagerSectionProps {
  isPro: boolean;
  onRequirePro: (featureLabel?: string) => void;
  onPadsImported: () => void;
  onGoToStage: () => void;
  lang: 'ar' | 'en';
}

export const PaManagerSection: React.FC<PaManagerSectionProps> = ({
  isPro,
  onRequirePro,
  onPadsImported,
  onGoToStage,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [activeTool, setActiveTool] = useState<'cleaner' | 'converter' | 'combiner' | 'extractor'>('cleaner');
  const [parsedSet, setParsedSet] = useState<ParsedPaSet | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Cleaner state
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());
  const [cleanerFilter, setCleanerFilter] = useState<'unused' | 'used' | 'all'>('unused');

  // Converter state
  const [sourceModel, setSourceModel] = useState<KorgPaModelId>('pa4x');
  const [targetModel, setTargetModel] = useState<KorgPaModelId>('pa3x');
  const [manualTextInput, setManualTextInput] = useState<string>('');
  const [manualSounds, setManualSounds] = useState<ExtractedSoundBankEntry[]>([]);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [importedToStage, setImportedToStage] = useState<boolean>(false);
  const [selectedConverterSoundIds, setSelectedConverterSoundIds] = useState<Set<string>>(new Set());
  const [converterSearchQuery, setConverterSearchQuery] = useState<string>('');
  const [targetStageBank, setTargetStageBank] = useState<number>(1);
  const [isExportingSingleSound, setIsExportingSingleSound] = useState<boolean>(false);

  // Feature #3: Mobile Set Combiner state
  const [setA, setSetA] = useState<ParsedPaSet | null>(null);
  const [setB, setSetB] = useState<ParsedPaSet | null>(null);
  const [selectedSoundPathsA, setSelectedSoundPathsA] = useState<Set<string>>(new Set());
  const [selectedSoundPathsB, setSelectedSoundPathsB] = useState<Set<string>>(new Set());
  const [selectedStylePathsA, setSelectedStylePathsA] = useState<Set<string>>(new Set());
  const [selectedStylePathsB, setSelectedStylePathsB] = useState<Set<string>>(new Set());
  const [mergedSetName, setMergedSetName] = useState<string>('WAEL_COMBINED');
  const [includeSupportingAssets, setIncludeSupportingAssets] = useState<boolean>(true);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [lastMergeManifest, setLastMergeManifest] = useState<string[] | null>(null);

  // Feature #4: Real Single Sound / Performance Pack Extractor (.SET.zip)
  const [extractorTargetModel, setExtractorTargetModel] = useState<PaExtractorTargetModel>('universal');
  const [extractorTypeFilter, setExtractorTypeFilter] = useState<'all' | 'sound' | 'performance'>('all');
  const [extractorSearch, setExtractorSearch] = useState<string>('');
  const [selectedExtractorItemId, setSelectedExtractorItemId] = useState<string | null>(null);
  const [isExtractingPack, setIsExtractingPack] = useState<boolean>(false);
  const [lastExtractedPack, setLastExtractedPack] = useState<ExtractedSinglePackResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const setAInputRef = useRef<HTMLInputElement>(null);
  const setBInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, [isPro]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
  };

  const applyParsedResult = (result: ParsedPaSet) => {
    setParsedSet(result);
    setSelectedForRemoval(new Set(result.unusedSoundAndPcmAssets.map((a) => a.path)));
    setSelectedConverterSoundIds(new Set(result.extractedSounds.slice(0, 1).map((s) => s.id)));
    const firstExtractable = buildExtractableSetItems(result)[0];
    setSelectedExtractorItemId(firstExtractable ? firstExtractable.id : null);
    setLastExtractedPack(null);
    setImportedToStage(false);
    setScanError(null);
    showToast(
      isAr
        ? `تم فحص السيت (${result.setName}): ${result.totalFiles} ملفاً، تم العثور على ${result.unusedSoundAndPcmAssets.length} عنصر غير مستخدم.`
        : `Scanned ${result.setName}: ${result.totalFiles} files, ${result.unusedSoundAndPcmAssets.length} unused assets found.`
    );
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!isPro) {
      onRequirePro(isAr ? 'إدارة السيتات / PA Manager' : 'PA Manager');
      return;
    }
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanError(null);
    try {
      const first = files[0];
      if (files.length === 1 && /\.zip$/i.test(first.name)) {
        const result = await analyzeUploadedZip(first);
        applyParsedResult(result);
      } else {
        const result = await analyzeUploadedFiles(files);
        applyParsedResult(result);
      }
    } catch {
      setScanError(
        isAr
          ? 'تعذر قراءة الملف المرفوع. تأكد من رفع ملف .SET.zip أو اختيار ملفات السيت (.PCG / .STY / .PAD / .PCM / .KMP) بعد فك الضغط.'
          : 'Failed to parse uploaded files. Please upload a valid .SET.zip archive or .PCG/.STY/.PAD/.PCM files.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handlePickSetFolder = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'إدارة السيتات / PA Manager' : 'PA Manager');
      return;
    }

    const winWithDirPicker = window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    };

    if (typeof winWithDirPicker.showDirectoryPicker === 'function') {
      try {
        const rootHandle = await winWithDirPicker.showDirectoryPicker();
        setIsScanning(true);
        setScanError(null);

        const collected: Array<{ relativePath: string; file: File }> = [];
        const walkDir = async (dirHandle: FileSystemDirectoryHandle, prefix: string) => {
          const iter = (dirHandle as unknown as {
            values: () => AsyncIterable<FileSystemHandle>;
          }).values();
          for await (const handle of iter) {
            if (handle.kind === 'file') {
              const file = await (handle as FileSystemFileHandle).getFile();
              collected.push({ relativePath: `${prefix}${handle.name}`, file });
            } else if (handle.kind === 'directory') {
              await walkDir(handle as FileSystemDirectoryHandle, `${prefix}${handle.name}/`);
            }
          }
        };

        await walkDir(rootHandle, `${rootHandle.name}/`);
        if (collected.length > 0) {
          const result = await analyzeUploadedEntries(collected);
          applyParsedResult(result);
          setIsScanning(false);
          return;
        }
        setIsScanning(false);
      } catch (err) {
        setIsScanning(false);
        // User cancelled directory picker
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // SecurityError in iframe or unsupported -> fall back to webkitdirectory input
      }
    }

    folderInputRef.current?.click();
  };

  const handleDropSetFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPro) {
      onRequirePro(isAr ? 'إدارة السيتات / PA Manager' : 'PA Manager');
      return;
    }
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) {
      await handleUploadFiles(e.dataTransfer?.files || null);
      return;
    }

    setIsScanning(true);
    setScanError(null);
    try {
      const collected: Array<{ relativePath: string; file: File }> = [];
      const readEntry = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            (entry as FileSystemFileEntry).file(
              (file) => {
                collected.push({ relativePath: `${prefix}${file.name}`, file });
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          const readAll = async (): Promise<FileSystemEntry[]> => {
            const all: FileSystemEntry[] = [];
            while (true) {
              const batch = await new Promise<FileSystemEntry[]>((resolve) =>
                reader.readEntries(resolve, () => resolve([]))
              );
              if (batch.length === 0) break;
              all.push(...batch);
            }
            return all;
          };
          const children = await readAll();
          for (const child of children) {
            await readEntry(child, `${prefix}${entry.name}/`);
          }
        }
      };

      const fsEntries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const fsEntry = items[i].webkitGetAsEntry?.();
        if (fsEntry) fsEntries.push(fsEntry);
      }

      if (fsEntries.length > 0) {
        for (const entry of fsEntries) {
          await readEntry(entry, '');
        }
        if (collected.length > 0) {
          const result = await analyzeUploadedEntries(collected);
          applyParsedResult(result);
          return;
        }
      }

      await handleUploadFiles(e.dataTransfer?.files || null);
    } catch {
      setScanError(
        isAr
          ? 'تعذر قراءة المجلد المسحوب. جرّب ضغط مجلد .SET بصيغة .zip ثم رفعه.'
          : 'Failed to read dropped folder. Try zipping the .SET folder as .zip and uploading it.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const toggleAssetRemoval = (path: string) => {
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSelectAllUnused = () => {
    if (!parsedSet) return;
    setSelectedForRemoval(new Set(parsedSet.unusedSoundAndPcmAssets.map((a) => a.path)));
  };

  const handleClearSelection = () => {
    setSelectedForRemoval(new Set());
  };

  const handleDownloadCleanSet = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'تنظيف وتصدير السيت النظيف' : 'Clean & Export SET');
      return;
    }
    if (!parsedSet) return;
    if (selectedForRemoval.size === 0) {
      showToast(isAr ? 'اختر ملفاً واحداً على الأقل للحذف قبل التنزيل' : 'Select at least one unused item to remove');
      return;
    }

    const res = await buildCleanSetZip(parsedSet, selectedForRemoval);
    triggerBlobDownload(res.blob, res.filename);
    showToast(
      isAr
        ? `تم حذف ${res.removedCount} ملف غير مستعمل وتوفير ${formatBytes(res.savedBytes)} — جاري تنزيل ${res.filename}`
        : `Removed ${res.removedCount} unused files (${formatBytes(res.savedBytes)} saved) — Downloading ${res.filename}`
    );
  };

  const combinedSourceSounds = useMemo(() => {
    const fromSet = parsedSet?.extractedSounds || [];
    return [...fromSet, ...manualSounds];
  }, [parsedSet, manualSounds]);

  const convertedSounds = useMemo(() => {
    return convertSoundsBetweenModels(combinedSourceSounds, sourceModel, targetModel);
  }, [combinedSourceSounds, sourceModel, targetModel]);

  const filteredConvertedSounds = useMemo(() => {
    const q = converterSearchQuery.trim().toLowerCase();
    if (!q) return convertedSounds;
    return convertedSounds.filter(
      (item) =>
        item.original.name.toLowerCase().includes(q) ||
        item.original.sourceFile.toLowerCase().includes(q) ||
        item.targetBankLabel.toLowerCase().includes(q)
    );
  }, [convertedSounds, converterSearchQuery]);

  const selectedConvertedSounds = useMemo(() => {
    return convertedSounds.filter((item) => selectedConverterSoundIds.has(item.original.id));
  }, [convertedSounds, selectedConverterSoundIds]);

  const binaryPatchPreviews = useMemo(() => {
    return previewSetBinaryPatches(parsedSet, sourceModel, targetModel);
  }, [parsedSet, sourceModel, targetModel]);

  const pcmMemoryReport = useMemo(() => {
    return inspectPcmMemory(parsedSet, targetModel);
  }, [parsedSet, targetModel]);

  const modelCompatibility = useMemo(() => {
    return inspectModelCompatibility(parsedSet, sourceModel, targetModel);
  }, [parsedSet, sourceModel, targetModel]);

  const toggleConverterSoundSelection = (id: string) => {
    setSelectedConverterSoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddManualList = () => {
    const parsed = parseTextSoundList(manualTextInput);
    if (parsed.length === 0) {
      showToast(isAr ? 'اكتب سطراً واحداً على الأقل بصيغة: الاسم, MSB, LSB, PC' : 'Enter at least one line: Name, MSB, LSB, PC');
      return;
    }
    setManualSounds((prev) => [...prev, ...parsed]);
    setSelectedConverterSoundIds((prev) => {
      const next = new Set(prev);
      parsed.forEach((p) => next.add(p.id));
      return next;
    });
    setManualTextInput('');
    setShowManualInput(false);
    showToast(isAr ? `تمت إضافة ${parsed.length} صوتاً إلى قائمة التحويل` : `Added ${parsed.length} sounds to converter`);
  };

  const handleExportSelectedReadySounds = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'تصدير صوت جاهز للأورج' : 'Ready Sound Package Export');
      return;
    }
    const targetList = selectedConvertedSounds.length > 0 ? selectedConvertedSounds : convertedSounds.slice(0, 1);
    if (targetList.length === 0) {
      showToast(isAr ? 'اختر صوتاً واحداً على الأقل من الجدول أولاً' : 'Select at least one sound first');
      return;
    }
    setIsExportingSingleSound(true);
    try {
      const res = await exportSelectedSoundsPackage(targetList, sourceModel, targetModel, parsedSet);
      triggerBlobDownload(res.blob, res.filename);
      showToast(
        isAr
          ? `تم تجهيز ${res.soundCount} صوت (${res.pcgCount} PCG + ${res.sampleCount} سامبل) في ملف جاهز للأورج: ${res.filename}`
          : `Exported ${res.soundCount} ready sound(s) (${res.pcgCount} PCG + ${res.sampleCount} samples): ${res.filename}`
      );
    } catch {
      showToast(isAr ? 'تعذر تجهيز حزمة الصوت المختار' : 'Failed to build selected sound package');
    } finally {
      setIsExportingSingleSound(false);
    }
  };

  const handleExportConvertedSet = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'تحويل وتصدير السيت' : 'Export Converted SET');
      return;
    }
    if (convertedSounds.length === 0 && binaryPatchPreviews.length === 0) return;
    const res = await exportConvertedArchive(convertedSounds, sourceModel, targetModel, parsedSet);
    triggerBlobDownload(res.blob, res.filename);
    showToast(
      isAr
        ? `تم تعديل ترويسة ${res.patchedCount} ملف (.PCG/.KMP/.STY/.PRF) وتغليف ${res.filename} بنجاح!`
        : `Patched ${res.patchedCount} binary headers and packaged ${res.filename}!`
    );
  };

  const handleImportToAppButtons = () => {
    if (!isPro) {
      onRequirePro(isAr ? 'إمبورت الأصوات لأزرار التطبيق' : 'Import Sounds to Stage Buttons');
      return;
    }
    const targetList = selectedConvertedSounds.length > 0 ? selectedConvertedSounds : convertedSounds.slice(0, 12);
    if (targetList.length === 0) return;
    const count = importSelectedSoundsToStageBank(targetList, targetStageBank);
    setImportedToStage(true);
    onPadsImported();
    showToast(
      isAr
        ? `تم إمبورت ${count} صوتاً مختاراً داخل أزرار بنك B${targetStageBank} في شاشة المسرح بنجاح!`
        : `Imported ${count} selected sound(s) into Stage Bank B${targetStageBank}!`
    );
  };

  const selectedRemovalBytes = useMemo(() => {
    if (!parsedSet) return 0;
    return parsedSet.assets
      .filter((a) => selectedForRemoval.has(a.path))
      .reduce((sum, a) => sum + a.sizeBytes, 0);
  }, [parsedSet, selectedForRemoval]);

  const visibleCleanerAssets = useMemo(() => {
    if (!parsedSet) return [];
    const pool = parsedSet.assets.filter(
      (a) => a.kind === 'sound_bank' || a.kind === 'pcm' || a.kind === 'multisample'
    );
    if (cleanerFilter === 'unused') return pool.filter((a) => !a.isUsed);
    if (cleanerFilter === 'used') return pool.filter((a) => a.isUsed);
    return pool;
  }, [parsedSet, cleanerFilter]);

  const extractableItems = useMemo(() => {
    return buildExtractableSetItems(parsedSet);
  }, [parsedSet]);

  const filteredExtractorItems = useMemo(() => {
    const q = extractorSearch.trim().toLowerCase();
    return extractableItems.filter((item) => {
      if (extractorTypeFilter !== 'all' && item.itemType !== extractorTypeFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sourceFile.toLowerCase().includes(q) ||
        item.bankLabel.toLowerCase().includes(q) ||
        item.midiCoord.toLowerCase().includes(q)
      );
    });
  }, [extractableItems, extractorTypeFilter, extractorSearch]);

  const selectedExtractorItem = useMemo<ExtractableSetItem | null>(() => {
    if (extractableItems.length === 0) return null;
    return (
      extractableItems.find((item) => item.id === selectedExtractorItemId) ||
      filteredExtractorItems[0] ||
      extractableItems[0]
    );
  }, [extractableItems, filteredExtractorItems, selectedExtractorItemId]);

  const extractorPlan = useMemo(() => {
    return planSingleSoundPackDependencies(parsedSet, selectedExtractorItem);
  }, [parsedSet, selectedExtractorItem]);

  const applySlotSet = (slot: 'A' | 'B', loaded: ParsedPaSet) => {
    const soundPaths = new Set(loaded.assets.filter((a) => a.kind === 'sound_bank').map((a) => a.path));
    const stylePaths = new Set(loaded.assets.filter((a) => a.kind === 'style').map((a) => a.path));
    if (slot === 'A') {
      setSetA(loaded);
      setSelectedSoundPathsA(soundPaths);
      setSelectedStylePathsA(stylePaths);
    } else {
      setSetB(loaded);
      setSelectedSoundPathsB(soundPaths);
      setSelectedStylePathsB(stylePaths);
    }
    setLastMergeManifest(null);
    showToast(
      isAr
        ? `تم تحميل Set ${slot} (${loaded.setName}): ${soundPaths.size} بنك أصوات · ${stylePaths.size} إيقاع`
        : `Loaded Set ${slot} (${loaded.setName}): ${soundPaths.size} PCG · ${stylePaths.size} STY`
    );
  };

  const handleLoadCombinerZip = async (slot: 'A' | 'B', files: FileList | null) => {
    if (!isPro) {
      onRequirePro(isAr ? 'دمج السيتات (Mobile Set Combiner)' : 'Mobile Set Combiner');
      return;
    }
    if (!files || files.length === 0) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const first = files[0];
      const loaded =
        files.length === 1 && /\.zip$/i.test(first.name)
          ? await analyzeUploadedZip(first)
          : await analyzeUploadedFiles(files);
      applySlotSet(slot, loaded);
    } catch {
      setScanError(
        isAr
          ? `تعذر قراءة ملفات Set ${slot}. تأكد من رفع .SET.zip أو ملفات .PCG / .STY صالحة.`
          : `Failed to parse Set ${slot}. Please upload a valid .SET.zip or .PCG/.STY files.`
      );
    } finally {
      setIsScanning(false);
    }
  };

  const toggleCombinerSelection = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    path: string
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleExportCombinedSet = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'دمج السيتات (Mobile Set Combiner)' : 'Mobile Set Combiner');
      return;
    }
    const totalPicked =
      selectedSoundPathsA.size +
      selectedSoundPathsB.size +
      selectedStylePathsA.size +
      selectedStylePathsB.size;
    if (totalPicked === 0) {
      showToast(isAr ? 'اختر بنك أصوات (.PCG) أو إيقاع (.STY) واحداً على الأقل للدمج' : 'Select at least one .PCG or .STY bank to merge');
      return;
    }
    setIsMerging(true);
    try {
      const result = await buildCombinedSetZip({
        mergedName: mergedSetName,
        setA,
        setB,
        selectedSoundPathsA,
        selectedSoundPathsB,
        selectedStylePathsA,
        selectedStylePathsB,
        includeSupportingAssets,
      });
      setLastMergeManifest(result.manifestLines);
      triggerBlobDownload(result.blob, result.filename);
      showToast(
        isAr
          ? `تم دمج ${result.soundBanksCount} بنك أصوات و ${result.styleBanksCount} بنك إيقاعات (STORE) — جاري تنزيل ${result.filename}`
          : `Merged ${result.soundBanksCount} PCG & ${result.styleBanksCount} STY banks (STORE) — Downloading ${result.filename}`
      );
    } catch {
      showToast(isAr ? 'حدث خطأ أثناء دمج السيتين' : 'Error merging sets');
    } finally {
      setIsMerging(false);
    }
  };

  const handleExtractSingleSoundPack = async () => {
    if (!isPro) {
      onRequirePro(isAr ? 'استخراج حزمة صوت مفرد (.SET.zip)' : 'Extract Single Sound Pack (.SET.zip)');
      return;
    }
    if (!parsedSet || !selectedExtractorItem) return;
    setIsExtractingPack(true);
    try {
      const result = await extractSingleSoundPackZip(
        parsedSet,
        selectedExtractorItem,
        sourceModel,
        extractorTargetModel
      );
      setLastExtractedPack(result);
      triggerBlobDownload(result.blob, result.filename);
      showToast(
        isAr
          ? `تم استخراج "${selectedExtractorItem.name}" في حزمة ${result.filename} (${result.soundFilesCount} SOUND · ${result.multisampleFilesCount} MULTISMP · ${result.pcmFilesCount} PCM · ${result.performFilesCount} PERFORM)`
          : `Extracted "${selectedExtractorItem.name}" into ${result.filename} (${result.soundFilesCount} SOUND · ${result.multisampleFilesCount} MULTISMP · ${result.pcmFilesCount} PCM · ${result.performFilesCount} PERFORM)`
      );
    } catch {
      showToast(isAr ? 'تعذر استخراج حزمة الصوت المختار' : 'Failed to extract single sound pack');
    } finally {
      setIsExtractingPack(false);
    }
  };

  // Locked PRO Gate when not activated
  if (!isPro) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-b from-[#1a1329] to-neutral-950 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRO FEATURE · ميزة احترافية مقفلة</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isAr ? 'إدارة السيتات الاحترافية (PA Manager)' : 'KORG PA Set Manager (PRO)'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
              {isAr
                ? 'هذه الصفحة متاحة حصرياً في النسخة الكاملة (PRO). قم بتفعيل التطبيق لفتح أدوات فحص وتنظيف السيتات وتحويل الموديلات وبناء الأزرار تلقائياً.'
                : 'This dedicated workspace is exclusive to the PRO version. Unlock PRO to clean unused PCM/Sounds and convert KORG PA models.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start text-xs">
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>{isAr ? '1. فحص وتنظيف السيت (Clean PCM / Sounds)' : '1. Clean Unused Sounds / PCM'}</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                {isAr
                  ? 'رفع مجلد السيت أو ملف .SET.zip، كشف الأصوات والسامبلات غير المستخدمة في الإيقاعات والأداء، وحذفها لتنزيل نسخة خفيفة توفر مساحة الذاكرة.'
                  : 'Upload .SET.zip or folders, detect orphaned Sounds & PCM samples unused by Styles/Performances, and export a lightweight clean SET.'}
              </p>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4" />
                <span>{isAr ? '2. تحويل الموديلات والأزرار (PA Converter)' : '2. PA Model & Button Converter'}</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                {isAr
                  ? 'تحويل بنوك الأصوات بين جميع موديلات KORG PA مع تعديل MSB/LSB/PC تلقائياً، وتحويلها لأزرار جاهزة داخل تطبيقنا بضغطة زر.'
                  : 'Remap sound banks across all KORG PA models with automatic MSB/LSB/PC adjustments and 1-click Stage button import.'}
              </p>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <GitMerge className="w-4 h-4" />
                <span>{isAr ? '3. دمج سيتين في سيت واحد (Set Combiner)' : '3. Mobile Set Combiner'}</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                {isAr
                  ? 'اختر بنوك .PCG و .STY من سيتين مختلفين وادمجها في سيت واحد مرقم وجاهز لفلاشة USB بسرعة STORE.'
                  : 'Merge specific .PCG and .STY banks from two .SET.zip archives into one cleanly numbered USB-ready .SET.zip.'}
              </p>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4" />
                <span>{isAr ? '4. استخراج حزمة صوت مفرد (.SET.zip)' : '4. Extract Single Sound Pack (.SET.zip)'}</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                {isAr
                  ? 'اختر أي صوت أو أداء من السيت واستخرجه في أرشيف .SET.zip نظيف يحتوي فقط على مجلدات SOUND/ و MULTISMP/ و PCM/ و PERFORM/ متوافق مع جميع موديلات KORG Pa عبر USB.'
                  : 'Select any Sound or Performance from a loaded .SET and download a pruned .SET.zip containing only its SOUND/, MULTISMP/, PCM/, and PERFORM/ folders for USB loading across all KORG Pa models.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRequirePro(isAr ? 'إدارة السيتات (PA Manager)' : 'PA Manager')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-sm inline-flex items-center gap-2 shadow-xl transition-all active:scale-95"
          >
            <Lock className="w-4 h-4" />
            <span>{isAr ? 'تفعيل النسخة الكاملة (PRO) الآن' : 'Unlock PRO Version Now'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Page Header & Upload Controls (supports Drag & Drop for extracted .SET folders & .zip) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropSetFiles}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FolderCog className="w-5 h-5 text-amber-400" />
              <span>{isAr ? 'إدارة السيتات الاحترافية (PA Manager)' : 'KORG PA Set Manager'}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isAr
                ? 'ارفع ملف سيت مضغوط (.SET.zip) أو مجلد .SET مفكوك الضغط أو حدد ملفات السيت (.PCG / .STY / .PCM / .KST) لفحصها وتحويل بنوكها.'
                : 'Upload a .SET.zip archive, an extracted .SET folder, or individual .PCG / .STY / .PCM / .KST files.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                handleUploadFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              onChange={(e) => {
                handleUploadFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            <button
              type="button"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>{isScanning ? (isAr ? 'جاري الفحص...' : 'Scanning...') : (isAr ? 'رفع .SET.zip أو ملفات' : 'Upload .SET.zip / Files')}</span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={handlePickSetFolder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e1533] hover:bg-[#2c1e4c] border border-purple-500/40 text-purple-200 font-bold text-xs transition-all active:scale-95"
            >
              <FolderOpen className="w-4 h-4 text-purple-300" />
              <span>{isAr ? 'رفع مجلد .SET' : 'Upload .SET Folder'}</span>
            </button>
          </div>
        </div>

        {scanError && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Loaded Set Overview Strip */}
        {parsedSet ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-500 block">{isAr ? 'السيت المحمّل' : 'Loaded SET'}</span>
              <span className="font-black text-amber-300 truncate block mt-0.5">{parsedSet.setName}</span>
              <span className="text-[10px] font-mono text-neutral-400">{formatBytes(parsedSet.totalSizeBytes)}</span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <span className="text-[10px] text-neutral-500 block">{isAr ? 'الإيقاعات (.STY)' : 'Styles (.STY)'}</span>
              <span className="text-base font-mono font-black text-yellow-400">{parsedSet.stylesCount}</span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <span className="text-[10px] text-neutral-500 block">{isAr ? 'الأداء والباد' : 'Perform / Pad'}</span>
              <span className="text-base font-mono font-black text-purple-300">{parsedSet.performancesCount + parsedSet.padsCount}</span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <span className="text-[10px] text-neutral-500 block">{isAr ? 'بنوك الأصوات (.PCG)' : 'Sound Banks'}</span>
              <span className="text-base font-mono font-black text-cyan-400">{parsedSet.soundsCount}</span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <span className="text-[10px] text-neutral-500 block">{isAr ? 'ملفات PCM / KMP' : 'PCM / Samples'}</span>
              <span className="text-base font-mono font-black text-emerald-400">{parsedSet.pcmCount}</span>
            </div>
            <div className="bg-neutral-950 border border-rose-500/30 rounded-xl p-3">
              <span className="text-[10px] text-rose-300/80 block">{isAr ? 'مساحة قابلة للتوفير' : 'Reclaimable Space'}</span>
              <span className="text-base font-mono font-black text-rose-400">{formatBytes(parsedSet.reclaimableBytes)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-950/70 border border-dashed border-neutral-800 rounded-xl p-5 text-center text-xs text-neutral-400 space-y-1.5">
            <FileArchive className="w-7 h-7 text-amber-400/70 mx-auto" />
            <div className="font-bold text-neutral-200">
              {isAr ? 'لم يتم رفع أي ملف سيت بعد' : 'No KORG SET loaded yet'}
            </div>
            <p className="text-[11px] text-neutral-500">
              {isAr
                ? 'اضغط على "رفع .SET.zip أو ملفات" لاختيار ملف سيت من هاتفك وفحصه محلياً بالكامل بدون إنترنت.'
                : 'Tap "Upload .SET.zip / Files" to analyze your KORG files completely offline on your device.'}
            </p>
          </div>
        )}

        {/* Tool Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTool('cleaner')}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTool === 'cleaner'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? '1. فحص وتنظيف السيت' : '1. Clean Unused PCM'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('converter')}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTool === 'converter'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? '2. تحويل الأصوات والموديلات' : '2. PA Model Converter'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('combiner')}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTool === 'combiner'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <GitMerge className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? '3. دمج سيتين في سيت واحد' : '3. Mobile Set Combiner'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('extractor')}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTool === 'extractor'
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <PackageCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? '4. استخراج حزمة صوت مفرد (.SET.zip)' : '4. Extract Single Sound Pack (.SET.zip)'}</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TOOL 1: CLEAN UNUSED SOUNDS / PCM                                   */}
      {/* =================================================================== */}
      {activeTool === 'cleaner' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'تقرير فحص الأصوات والسامبلات غير المستخدمة' : 'Unused Sounds & PCM Inspection Report'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? 'يتم مطابقة جميع ملفات .PCG و .PCM / .KMP مع الإيقاعات (.STY) والأداء (.PRF) والباد (.PAD) لتحديد الملفات غير المستعملة.'
                  : 'Cross-references .PCG & .PCM/.KMP files against Styles (.STY), Performances (.PRF), and Pads (.PAD).'}
              </p>
            </div>

            {parsedSet && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(
                  [
                    { id: 'unused', ar: `غير مستخدم (${parsedSet.unusedSoundAndPcmAssets.length})`, en: `Unused (${parsedSet.unusedSoundAndPcmAssets.length})` },
                    { id: 'used', ar: `مستخدم (${parsedSet.usedSoundAndPcmAssets.length})`, en: `Used (${parsedSet.usedSoundAndPcmAssets.length})` },
                    { id: 'all', ar: 'الكل', en: 'All' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCleanerFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      cleanerFilter === f.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isAr ? f.ar : f.en}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!parsedSet ? (
            <div className="py-10 text-center text-xs text-neutral-500">
              {isAr
                ? 'قم برفع ملف السيت (.SET.zip) أو ملفات .PCG / .STY / .PAD من الأعلى لبدء الفحص.'
                : 'Upload a .SET.zip or .PCG/.STY/.PAD files above to begin scanning.'}
            </div>
          ) : (
            <>
              {/* Selection Actions & Clean Export CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllUnused}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold"
                  >
                    {isAr ? 'تحديد كل غير المستخدم' : 'Select All Unused'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold"
                  >
                    {isAr ? 'إلغاء التحديد' : 'Clear Selection'}
                  </button>
                  <span className="text-neutral-400 font-mono">
                    {isAr
                      ? `المحدد للحذف: ${selectedForRemoval.size} ملف (${formatBytes(selectedRemovalBytes)})`
                      : `Selected to remove: ${selectedForRemoval.size} (${formatBytes(selectedRemovalBytes)})`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCleanSet}
                  disabled={selectedForRemoval.size === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'حذف الأصوات غير المستعملة وتنزيل السيت النظيف' : 'Remove Unused & Download Clean SET'}</span>
                </button>
              </div>

              {/* Assets List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {visibleCleanerAssets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                    {isAr
                      ? 'لا توجد ملفات في هذا التصنيف.'
                      : 'No assets match this filter.'}
                  </div>
                ) : (
                  visibleCleanerAssets.map((asset) => {
                    const checked = selectedForRemoval.has(asset.path);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => toggleAssetRemoval(asset.path)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          checked
                            ? 'bg-rose-950/25 border-rose-500/40'
                            : asset.isUsed
                            ? 'bg-neutral-950 border-emerald-500/25'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="mt-1 accent-rose-500 w-4 h-4 rounded shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-white truncate">{asset.fileName}</span>
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 uppercase">
                                {asset.kind === 'sound_bank' ? 'PCG' : asset.kind === 'pcm' ? 'PCM' : 'KMP/KSF'}
                              </span>
                              <span className="text-[11px] font-mono text-amber-300">{formatBytes(asset.sizeBytes)}</span>
                            </div>
                            <div className="text-[10px] font-mono text-neutral-500 truncate">{asset.path}</div>
                            {asset.extractedNames.length > 0 && (
                              <div className="text-[10px] text-neutral-400 truncate">
                                {isAr ? 'يحتوي: ' : 'Contains: '}
                                {asset.extractedNames.slice(0, 6).join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {asset.isUsed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isAr ? `مستخدم (${asset.usedBy.slice(0, 2).join(', ')})` : `Used (${asset.usedBy.slice(0, 2).join(', ')})`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'غير مستعمل (قابل للحذف)' : 'Unused (Safe to Clean)'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 2: PA MODEL CONVERTER & APP BUTTON IMPORTER                    */}
      {/* =================================================================== */}
      {activeTool === 'converter' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'محوّل بنوك الأصوات والموديلات (PA Model Converter)' : 'PA Model Bank Converter & Stage Importer'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? 'تعديل أرقام البنوك (MSB / LSB / PC) تلقائياً بين موديلات KORG Pa وتحويلها إلى أزرار جاهزة داخل التطبيق.'
                  : 'Automatically remaps MSB / LSB / PC sound banks across KORG Pa models and converts them into ready Stage buttons.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إدخال قائمة أصوات يدوياً' : 'Paste Sound List'}</span>
            </button>
          </div>

          {/* Model Selection Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs">
            <div className="md:col-span-5 space-y-1.5">
              <label className="font-bold text-neutral-300 block">
                {isAr ? 'من الموديل المصدر (Source):' : 'Source KORG Model:'}
              </label>
              <select
                value={sourceModel}
                onChange={(e) => setSourceModel(e.target.value as KorgPaModelId)}
                className="w-full bg-neutral-900 text-amber-300 font-bold border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
              >
                {Object.values(PA_MODEL_SPECS).map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-neutral-500 font-mono">
                {isAr
                  ? `بنوك User: ${PA_MODEL_SPECS[sourceModel].userSoundBanks} · ذاكرة PCM: ${
                      sourceModel === 'pa3x' ? '256 / 512 MB' : sourceModel === 'pa3x_le' ? '128 / 256 MB' : `${PA_MODEL_SPECS[sourceModel].maxPcmMb} MB`
                    }`
                  : `User Banks: ${PA_MODEL_SPECS[sourceModel].userSoundBanks} · Max PCM: ${
                      sourceModel === 'pa3x' ? '256 / 512 MB' : sourceModel === 'pa3x_le' ? '128 / 256 MB' : `${PA_MODEL_SPECS[sourceModel].maxPcmMb} MB`
                    }`}
              </div>
            </div>

            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const prevSrc = sourceModel;
                  setSourceModel(targetModel);
                  setTargetModel(prevSrc);
                }}
                className="p-2.5 rounded-xl bg-[#1e1533] hover:bg-[#2c1e4c] border border-purple-500/40 text-amber-300 transition-transform active:scale-90"
                title={isAr ? 'عكس الموديلات' : 'Swap Models'}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="font-bold text-neutral-300 block">
                {isAr ? 'إلى الموديل الهدف (Target):' : 'Target KORG Model:'}
              </label>
              <select
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value as KorgPaModelId)}
                className="w-full bg-neutral-900 text-cyan-300 font-bold border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
              >
                {Object.values(PA_MODEL_SPECS).map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-neutral-500 font-mono">
                {isAr
                  ? `بنوك User: ${PA_MODEL_SPECS[targetModel].userSoundBanks} · ذاكرة PCM: ${
                      targetModel === 'pa3x' ? '256 / 512 MB' : targetModel === 'pa3x_le' ? '128 / 256 MB' : `${PA_MODEL_SPECS[targetModel].maxPcmMb} MB`
                    }`
                  : `User Banks: ${PA_MODEL_SPECS[targetModel].userSoundBanks} · Max PCM: ${
                      targetModel === 'pa3x' ? '256 / 512 MB' : targetModel === 'pa3x_le' ? '128 / 256 MB' : `${PA_MODEL_SPECS[targetModel].maxPcmMb} MB`
                    }`}
              </div>
            </div>
          </div>

          {/* Optional Manual Sound List Input */}
          {showManualInput && (
            <div className="bg-neutral-950 border border-cyan-500/30 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="font-bold text-cyan-300">
                {isAr
                  ? 'أضف أسماء وأرقام بنوك الأصوات (سطر لكل صوت بالصيغة: الاسم, MSB, LSB, PC):'
                  : 'Enter Sound Bank entries (one per line: Name, MSB, LSB, PC):'}
              </div>
              <textarea
                rows={4}
                dir="ltr"
                value={manualTextInput}
                onChange={(e) => setManualTextInput(e.target.value)}
                placeholder={'Oud Solo, 121, 66, 12\nNay Kawala, 121, 67, 5\nTriton Lead, 121, 64, 81'}
                className="w-full bg-neutral-900 text-neutral-100 font-mono text-xs border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-bold"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={handleAddManualList}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black"
                >
                  {isAr ? 'إضافة وتحويل' : 'Add & Convert'}
                </button>
              </div>
            </div>
          )}

          {/* PCM Capacity Check & Memory Warning (e.g. Pa3X 128MB / 256MB) */}
          {parsedSet && (
            <div className={`rounded-xl border p-3.5 text-xs space-y-2 ${
              pcmMemoryReport.exceedsExpanded
                ? 'bg-red-950/40 border-red-500/50 text-red-100'
                : pcmMemoryReport.exceedsStandard
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                : 'bg-emerald-950/25 border-emerald-500/35 text-emerald-100'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  {pcmMemoryReport.exceedsStandard ? (
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${pcmMemoryReport.exceedsExpanded ? 'text-red-400' : 'text-amber-400'}`} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-black">
                      {pcmMemoryReport.exceedsExpanded
                        ? (isAr
                            ? `تحذير: حجم السامبلات (${pcmMemoryReport.pcmMb.toFixed(1)} MB) يتجاوز أقصى سعة لذاكرة ${targetModel.toUpperCase()} (${pcmMemoryReport.targetExpandedMb} MB)!`
                            : `Memory Warning: Total PCM (${pcmMemoryReport.pcmMb.toFixed(1)} MB) exceeds ${targetModel.toUpperCase()} max RAM (${pcmMemoryReport.targetExpandedMb} MB)!`)
                        : pcmMemoryReport.exceedsStandard
                        ? (isAr
                            ? `تنبيه ذاكرة ${targetModel.toUpperCase()}: حجم PCM (${pcmMemoryReport.pcmMb.toFixed(1)} MB) يتجاوز ${pcmMemoryReport.targetStandardMb} MB القياسية (يتطلب توسعة ${pcmMemoryReport.targetExpandedMb} MB).`
                            : `${targetModel.toUpperCase()} Notice: PCM (${pcmMemoryReport.pcmMb.toFixed(1)} MB) exceeds ${pcmMemoryReport.targetStandardMb} MB standard RAM (requires ${pcmMemoryReport.targetExpandedMb} MB).`)
                        : (isAr
                            ? `ذاكرة PCM متوافقة: ${pcmMemoryReport.pcmMb.toFixed(1)} MB (سعة ${targetModel.toUpperCase()}: ${
                                targetModel === 'pa3x'
                                  ? '256MB / 512MB'
                                  : targetModel === 'pa3x_le'
                                  ? '128MB / 256MB'
                                  : `${pcmMemoryReport.targetExpandedMb} MB`
                              })`
                            : `PCM Memory OK: ${pcmMemoryReport.pcmMb.toFixed(1)} MB (within ${targetModel.toUpperCase()} limit)`)}
                    </div>
                    <div className="text-[11px] opacity-85">
                      {pcmMemoryReport.exceedsStandard
                        ? (isAr
                            ? `يُرجى حذف الأصوات والسامبلات غير المستعملة أولاً لتقليص الحجم${pcmMemoryReport.reclaimablePcmBytes > 0 ? ` (متاح توفير ${formatBytes(pcmMemoryReport.reclaimablePcmBytes)})` : ''}.`
                            : `Clean unused sounds & PCM samples first to shrink size${pcmMemoryReport.reclaimablePcmBytes > 0 ? ` (${formatBytes(pcmMemoryReport.reclaimablePcmBytes)} reclaimable)` : ''}.`)
                        : (isAr
                            ? 'حجم السامبلات مناسب ولن يسبب رسالة Out of Memory عند التحميل على الأورج.'
                            : 'Sample footprint fits cleanly without triggering Out of Memory errors.')}
                    </div>
                  </div>
                </div>

                {pcmMemoryReport.exceedsStandard && (
                  <button
                    type="button"
                    onClick={() => setActiveTool('cleaner')}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-[11px] flex items-center gap-1.5 self-start sm:self-center shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تنظيف غير المستعمل أولاً' : 'Clean Unused First'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Honest Hardware Compatibility Notice for Next-Gen (Pa4X/Pa1000/Pa700) -> Legacy (Pa3X/Pa900/Pa600) */}
          {modelCompatibility.isNextGenToLegacyDowngrade && (
            <div className="rounded-xl border border-amber-500/45 bg-amber-950/30 p-3.5 text-xs space-y-1.5 text-amber-100">
              <div className="font-black text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isAr
                    ? `تنبيه مهم للتحويل من ${sourceModel.toUpperCase()} إلى ${targetModel.toUpperCase()}:`
                    : `Important Hardware Note (${sourceModel.toUpperCase()} → ${targetModel.toUpperCase()}):`}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-200">
                {isAr
                  ? 'أورج Pa4X يقرأ سيتات Pa3X مباشرة، لكن العكس (Pa4X → Pa3X) لا يشتغل بتعديل الترويسة فقط لأن Pa4X يستخدم سامبلات PCM مضغوطة، ومحرك DNC2، وملفات Keyboard Set (.KST) التي لا يفهمها Pa3X. هذه الأداة تضبط جدول MIDI (MSB/LSB/PC) وتنشئ أزرار التحكم داخل التطبيق وتفحص الذاكرة وتعدّل ترويسة الملفات، أما تحويل السامبلات المضغوطة فعلياً لتعزف من فلاشة USB على Pa3X فيتطلب فك ضغط PCM وإعادة بناء السيت عبر برنامج KORG PA Manager على الكمبيوتر.'
                  : 'Pa4X reads Pa3X sets natively, but downgrading Pa4X → Pa3X cannot convert compressed PCM samples, DNC2 engines, or .KST Keyboard Sets purely via browser header patching. This tool accurately remaps MIDI Bank/PC tables, creates Stage buttons, and inspects RAM, while full binary sample decompression for USB loading requires desktop KORG PA Manager.'}
              </p>
              {parsedSet && (modelCompatibility.kstCount > 0 || modelCompatibility.extraBanksForTarget.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-mono">
                  {modelCompatibility.kstCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200">
                      {isAr ? `تم رصد ${modelCompatibility.kstCount} ملف .KST (خاص بـ Pa4X غير مدعوم في Pa3X)` : `${modelCompatibility.kstCount} .KST files (unsupported on Pa3X)`}
                    </span>
                  )}
                  {modelCompatibility.extraBanksForTarget.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
                      {isAr ? `بنوك إضافية خارج سعة ${targetModel.toUpperCase()}: ${modelCompatibility.extraBanksForTarget.join(', ')}` : `Extra banks: ${modelCompatibility.extraBanksForTarget.join(', ')}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Binary Header Patching Preview (.PCG / .KMP / .STY / .PRF) */}
          {binaryPatchPreviews.length > 0 && (
            <div className="bg-neutral-950 border border-[#2d214c] rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>
                    {isAr
                      ? `معالجة البايتات الثنائية للترويسة (.PCG / .KMP / .STY / .PRF) — ${binaryPatchPreviews.filter(p => p.wasPatched).length} / ${binaryPatchPreviews.length} ملف جاهز للتعديل`
                      : `Binary Header Version Patching (.PCG / .KMP / .STY / .PRF) — ${binaryPatchPreviews.filter(p => p.wasPatched).length} / ${binaryPatchPreviews.length} files queued`}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300" dir="ltr">
                  {sourceModel.toUpperCase()} -&gt; {targetModel.toUpperCase()}
                </span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {binaryPatchPreviews.map((p) => (
                  <div
                    key={p.path}
                    className="bg-neutral-900/90 border border-neutral-800 rounded-lg px-2.5 py-2 flex flex-col gap-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                          .{p.ext}
                        </span>
                        <span className="font-mono font-bold text-white">{p.path}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${p.wasPatched ? 'text-emerald-300' : 'text-neutral-400'}`}>
                        {isAr ? p.reasonAr : p.reasonEn}
                      </span>
                    </div>
                    {p.wasPatched && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 text-[10px] font-mono" dir="ltr">
                        <div className="text-neutral-400 truncate">
                          <span className="text-rose-300">OLD:</span> {p.originalHeaderHex}
                        </div>
                        <div className="text-cyan-300 truncate">
                          <span className="text-emerald-300">NEW:</span> {p.patchedHeaderHex}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready Single/Selected Sound Export & Stage Bank Importer Bar */}
          <div className="bg-neutral-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="font-black text-cyan-300 flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `استخراج وتنزيل صوت معيّن جاهز للأورج / إمبورت للأزرار (${selectedConvertedSounds.length} صوت محدد من ${convertedSounds.length})`
                      : `Ready Sound Extractor & Importer (${selectedConvertedSounds.length} selected of ${convertedSounds.length})`}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {isAr
                    ? 'اختر أي صوت أو عدة أصوات من القائمة بالأسفل (من أي موديل KORG Pa): يمكنك تنزيله في ملف .SET.zip جاهز ليشتغل مباشرة على الأورج أو عمل إمبورت مباشر لأزرار التطبيق.'
                    : 'Check one or multiple sounds below from ANY KORG Pa .SET: download a standalone .SET.zip ready to load on the keyboard, or import directly into a Stage Bank.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-bold text-neutral-300">
                  {isAr ? 'بنك المسرح:' : 'Stage Bank:'}
                </label>
                <select
                  value={targetStageBank}
                  onChange={(e) => setTargetStageBank(Number(e.target.value))}
                  className="bg-neutral-900 text-amber-300 font-mono font-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
                >
                  {Array.from({ length: 16 }, (_, idx) => idx + 1).map((b) => (
                    <option key={b} value={b}>B{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={convertedSounds.length === 0 || isExportingSingleSound}
                onClick={handleExportSelectedReadySounds}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-neutral-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExportingSingleSound
                    ? (isAr ? 'جاري التجهيز...' : 'Packaging...')
                    : (isAr
                        ? `تنزيل الصوت المختار جاهز للأورج (.SET.zip · ${selectedConvertedSounds.length || 1})`
                        : `Download Ready Sound Package (.SET.zip · ${selectedConvertedSounds.length || 1})`)}
                </span>
              </button>

              <button
                type="button"
                disabled={convertedSounds.length === 0}
                onClick={handleImportToAppButtons}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-neutral-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>
                  {isAr
                    ? `إمبورت المختار لبنك B${targetStageBank} (${selectedConvertedSounds.length || Math.min(12, convertedSounds.length)})`
                    : `Import Selected to Bank B${targetStageBank}`}
                </span>
              </button>

              <button
                type="button"
                disabled={convertedSounds.length === 0 && binaryPatchPreviews.length === 0}
                onClick={handleExportConvertedSet}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
              >
                <FileArchive className="w-4 h-4" />
                <span>{isAr ? `تنزيل السيت الكامل (${targetModel.toUpperCase()})` : `Full ${targetModel.toUpperCase()} .SET.zip`}</span>
              </button>
            </div>
          </div>

          {importedToStage && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {isAr
                    ? `تم حفظ الأصوات المختارة في بنك B${targetStageBank} بشاشة المسرح بنجاح!`
                    : `Selected sounds are now live in Stage Bank B${targetStageBank}!`}
                </span>
              </span>
              <button
                type="button"
                onClick={onGoToStage}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-[11px]"
              >
                {isAr ? 'فتح شاشة المسرح الآن' : 'Go to Stage View'}
              </button>
            </div>
          )}

          {/* Sound Search & Selection Toolbar */}
          {convertedSounds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="text"
                  value={converterSearchQuery}
                  onChange={(e) => setConverterSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث باسم الصوت أو ملف .PCG (مثال: Nay, Oud, String)...' : 'Search sound name or .PCG bank...'}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg ps-8 pe-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedConverterSoundIds(new Set(filteredConvertedSounds.map((i) => i.original.id)))}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 font-bold text-[11px]"
                >
                  {isAr ? 'تحديد الكل' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConverterSoundIds(new Set(filteredConvertedSounds.slice(0, 12).map((i) => i.original.id)))}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-[11px]"
                >
                  {isAr ? 'أول 12 صوت' : 'First 12'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConverterSoundIds(new Set())}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold text-[11px]"
                >
                  {isAr ? 'إلغاء التحديد' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {/* Converted & Selectable Sound Table */}
          {convertedSounds.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
              {isAr
                ? 'ارفع ملف سيت (.SET.zip / .PCG) أو اضغط "إدخال قائمة أصوات يدوياً" لاختيار الأصوات وتنزيلها.'
                : 'Upload a .SET.zip / .PCG file or click "Paste Sound List" to browse and extract sounds.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-neutral-800 rounded-xl">
              <table className="w-full text-start text-xs">
                <thead className="bg-neutral-950 text-neutral-400 font-mono text-[11px] sticky top-0 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">✓</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الصوت' : 'Sound Name'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? `الأصل (${sourceModel.toUpperCase()})` : `Source (${sourceModel.toUpperCase()})`}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? `المحوّل (${targetModel.toUpperCase()})` : `Target (${targetModel.toUpperCase()})`}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'ملاحظة التوافق' : 'Mapping Note'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70 bg-neutral-900/40">
                  {filteredConvertedSounds.map((item) => {
                    const isChecked = selectedConverterSoundIds.has(item.original.id);
                    return (
                      <tr
                        key={item.original.id}
                        onClick={() => toggleConverterSoundSelection(item.original.id)}
                        className={`cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-950/30 hover:bg-emerald-950/45' : 'hover:bg-neutral-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="accent-emerald-500 w-4 h-4 rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.original.name}</div>
                          <div className="text-[10px] font-mono text-neutral-500">{item.original.sourceFile}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-300" dir="ltr">
                          {item.original.msb} · {item.original.lsb} · {item.original.pc}
                        </td>
                        <td className="py-2.5 px-3" dir="ltr">
                          <span className="font-mono font-bold text-cyan-300">
                            {item.targetMsb} · {item.targetLsb} · {item.targetPc}
                          </span>
                          <span className="ms-2 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-mono">
                            {item.targetBankLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-amber-300/90">
                          {isAr ? item.compatibilityNoteAr : item.compatibilityNoteEn}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 3: MOBILE SET COMBINER (دمج سيتين في سيت واحد)                */}
      {/* =================================================================== */}
      {activeTool === 'combiner' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? '3. دمج سيتين في سيت واحد (Mobile Set Combiner)' : '3. Mobile Set Combiner'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? 'حمّل ملفين (.SET.zip) وحدد بنوك الأصوات (.PCG) وبنوك الإيقاعات (.STY) المطلوبة من كل سيت، ثم صدّر سيت واحد مرقّم جاهز لليوإس بي بضغط STORE السريع.'
                  : 'Load two .SET.zip archives, pick specific .PCG Sound banks and .STY Style banks from Set A & Set B, and export a cleanly numbered USB-ready .SET.zip using fast STORE compression.'}
              </p>
            </div>
          </div>

          <input
            ref={setAInputRef}
            type="file"
            multiple
            accept=".zip,.pcg,.sty,.pad,.prf,.pcm,.kmp,.ksf"
            onChange={(e) => {
              handleLoadCombinerZip('A', e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={setBInputRef}
            type="file"
            multiple
            accept=".zip,.pcg,.sty,.pad,.prf,.pcm,.kmp,.ksf"
            onChange={(e) => {
              handleLoadCombinerZip('B', e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Two Set Loader & Selector Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(
              [
                {
                  slot: 'A' as const,
                  setObj: setA,
                  soundSel: selectedSoundPathsA,
                  setSoundSel: setSelectedSoundPathsA,
                  styleSel: selectedStylePathsA,
                  setStyleSel: setSelectedStylePathsA,
                  inputRef: setAInputRef,
                  accentBorder: 'border-amber-500/40',
                  accentBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
                  btnClass: 'bg-amber-500 hover:bg-amber-400 text-neutral-950',
                },
                {
                  slot: 'B' as const,
                  setObj: setB,
                  soundSel: selectedSoundPathsB,
                  setSoundSel: setSelectedSoundPathsB,
                  styleSel: selectedStylePathsB,
                  setStyleSel: setSelectedStylePathsB,
                  inputRef: setBInputRef,
                  accentBorder: 'border-cyan-500/40',
                  accentBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
                  btnClass: 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950',
                },
              ]
            ).map((cfg) => {
              const soundAssets = cfg.setObj?.assets.filter((a) => a.kind === 'sound_bank') || [];
              const styleAssets = cfg.setObj?.assets.filter((a) => a.kind === 'style') || [];
              return (
                <div
                  key={cfg.slot}
                  className={`bg-neutral-950 border ${cfg.accentBorder} rounded-xl p-4 space-y-3 text-xs`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md border font-mono font-black text-[11px] ${cfg.accentBadge}`}>
                        SET {cfg.slot}
                      </span>
                      <span className="font-bold text-white truncate">
                        {cfg.setObj ? cfg.setObj.setName : (isAr ? 'غير محمّل بعد' : 'Not loaded')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {parsedSet && !cfg.setObj && (
                        <button
                          type="button"
                          onClick={() => applySlotSet(cfg.slot, parsedSet)}
                          className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-[10px]"
                        >
                          {isAr ? 'استخدام السيت الحالي' : 'Use Current SET'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isScanning}
                        onClick={() => cfg.inputRef.current?.click()}
                        className={`px-3 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all active:scale-95 ${cfg.btnClass}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{cfg.setObj ? (isAr ? 'تغيير .SET.zip' : 'Change') : (isAr ? `رفع Set ${cfg.slot}` : `Load Set ${cfg.slot}`)}</span>
                      </button>
                    </div>
                  </div>

                  {!cfg.setObj ? (
                    <div className="py-8 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                      {isAr
                        ? `اضغط "رفع Set ${cfg.slot}" لاختيار ملف .SET.zip من هاتفك.`
                        : `Tap "Load Set ${cfg.slot}" to pick a .SET.zip archive.`}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* .PCG Sound Banks */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Music className="w-3.5 h-3.5" />
                            <span>{isAr ? `بنوك الأصوات (.PCG) — ${cfg.soundSel.size}/${soundAssets.length}` : `Sound Banks (.PCG) — ${cfg.soundSel.size}/${soundAssets.length}`}</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => cfg.setSoundSel(new Set(soundAssets.map((a) => a.path)))}
                              className="text-emerald-300 hover:underline font-bold"
                            >
                              {isAr ? 'تحديد الكل' : 'All'}
                            </button>
                            <span className="text-neutral-600">|</span>
                            <button
                              type="button"
                              onClick={() => cfg.setSoundSel(new Set())}
                              className="text-neutral-400 hover:underline font-bold"
                            >
                              {isAr ? 'مسح' : 'None'}
                            </button>
                          </div>
                        </div>

                        {soundAssets.length === 0 ? (
                          <div className="text-[11px] text-neutral-500 italic">
                            {isAr ? 'لا توجد ملفات .PCG في هذا السيت' : 'No .PCG files found'}
                          </div>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {soundAssets.map((asset) => {
                              const checked = cfg.soundSel.has(asset.path);
                              return (
                                <label
                                  key={asset.path}
                                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    checked
                                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleCombinerSelection(cfg.setSoundSel, asset.path)}
                                      className="accent-emerald-500 rounded shrink-0"
                                    />
                                    <span className="font-mono font-bold truncate">{asset.fileName}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                    {formatBytes(asset.sizeBytes)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* .STY Style Banks */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5" />
                            <span>{isAr ? `بنوك الإيقاعات (.STY) — ${cfg.styleSel.size}/${styleAssets.length}` : `Style Banks (.STY) — ${cfg.styleSel.size}/${styleAssets.length}`}</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => cfg.setStyleSel(new Set(styleAssets.map((a) => a.path)))}
                              className="text-emerald-300 hover:underline font-bold"
                            >
                              {isAr ? 'تحديد الكل' : 'All'}
                            </button>
                            <span className="text-neutral-600">|</span>
                            <button
                              type="button"
                              onClick={() => cfg.setStyleSel(new Set())}
                              className="text-neutral-400 hover:underline font-bold"
                            >
                              {isAr ? 'مسح' : 'None'}
                            </button>
                          </div>
                        </div>

                        {styleAssets.length === 0 ? (
                          <div className="text-[11px] text-neutral-500 italic">
                            {isAr ? 'لا توجد ملفات .STY في هذا السيت' : 'No .STY files found'}
                          </div>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {styleAssets.map((asset) => {
                              const checked = cfg.styleSel.has(asset.path);
                              return (
                                <label
                                  key={asset.path}
                                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    checked
                                      ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleCombinerSelection(cfg.setStyleSel, asset.path)}
                                      className="accent-cyan-500 rounded shrink-0"
                                    />
                                    <span className="font-mono font-bold truncate">{asset.fileName}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                    {formatBytes(asset.sizeBytes)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Merge Output Config & Export CTA */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-end justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1">
              <div className="space-y-1 min-w-[200px]">
                <label className="font-bold text-neutral-300 block">
                  {isAr ? 'اسم مجلد السيت المدمج (.SET):' : 'Merged SET Name:'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={mergedSetName}
                  onChange={(e) => setMergedSetName(e.target.value)}
                  placeholder="WAEL_COMBINED"
                  className="w-full bg-neutral-900 text-emerald-300 font-mono font-bold border border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <label className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSupportingAssets}
                  onChange={(e) => setIncludeSupportingAssets(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 rounded"
                />
                <span className="text-neutral-200 font-bold">
                  {isAr ? 'تضمين ملفات PCM / KMP / PAD المرتبطة' : 'Include linked PCM / KMP / PAD assets'}
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={
                isMerging ||
                selectedSoundPathsA.size +
                  selectedSoundPathsB.size +
                  selectedStylePathsA.size +
                  selectedStylePathsB.size ===
                  0
              }
              onClick={handleExportCombinedSet}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>
                {isMerging
                  ? (isAr ? 'جاري الدمج السريع...' : 'Merging...')
                  : (isAr ? 'دمج وتنزيل السيت الموحّد (.SET.zip · STORE)' : 'Merge & Download .SET.zip (STORE)')}
              </span>
            </button>
          </div>

          {lastMergeManifest && (
            <div className="bg-neutral-950 border border-emerald-500/35 rounded-xl p-3 space-y-1.5 text-[11px] font-mono" dir="ltr">
              <div className="font-bold text-emerald-300">MERGE_MANIFEST.txt</div>
              <div className="max-h-36 overflow-y-auto text-neutral-300 space-y-0.5">
                {lastMergeManifest.map((line, i) => (
                  <div key={i}>{line || '\u00A0'}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TOOL 4: EXTRACT SINGLE SOUND PACK (.SET.zip) FOR ALL KORG PA MODELS */}
      {/* =================================================================== */}
      {activeTool === 'extractor' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-purple-400" />
                <span>
                  {isAr
                    ? '4. استخراج حزمة صوت مفرد (.SET.zip) لجميع موديلات KORG Pa'
                    : '4. Extract Single Sound Pack (.SET.zip) — All KORG Pa Models'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? 'اختر أي صوت (Sound) أو أداء (Performance) من السيت المحمّل لاستخراج مجلدات SOUND/ و MULTISMP/ و PCM/ و PERFORM/ الخاصة به فقط في ملف .SET.zip جاهز للتحميل عبر الفلاشة (MEDIA > Load).'
                  : 'Pick any Sound or Performance from your loaded .SET to export a clean, pruned .SET.zip archive containing only its SOUND/, MULTISMP/, PCM/, and PERFORM/ folders for USB MEDIA > Load.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {extractorTargetModel !== 'universal' && (
                <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-[10px] font-bold text-neutral-400">
                    {isAr ? 'المصدر:' : 'Source:'}
                  </span>
                  <select
                    value={sourceModel}
                    onChange={(e) => setSourceModel(e.target.value as KorgPaModelId)}
                    className="bg-transparent text-[11px] font-bold text-cyan-300 focus:outline-none"
                  >
                    {(Object.keys(PA_MODEL_SPECS) as KorgPaModelId[]).map((id) => (
                      <option key={id} value={id} className="bg-neutral-950 text-white">
                        {PA_MODEL_SPECS[id].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-neutral-950 border border-purple-500/40 rounded-xl px-3 py-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="text-[11px] font-bold text-neutral-300">
                  {isAr ? 'الموديل المستهدف:' : 'Target Model:'}
                </span>
                <select
                  value={extractorTargetModel}
                  onChange={(e) => setExtractorTargetModel(e.target.value as PaExtractorTargetModel)}
                  className="bg-transparent text-xs font-black text-purple-200 focus:outline-none"
                >
                  {PA_EXTRACTOR_MODEL_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-neutral-950 text-white">
                      {isAr ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!parsedSet ? (
            <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
              {isAr
                ? 'قم برفع ملف سيت (.SET.zip أو مجلد .SET) من الأعلى لاختيار صوت أو أداء واستخراج حزمته المنفردة.'
                : 'Upload a .SET.zip archive or .SET folder above to select a Sound or Performance and extract its standalone pack.'}
            </div>
          ) : extractableItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
              {isAr
                ? 'لم يتم العثور على ملفات أصوات (.PCG) أو أداء (.PRF / .KST) قابلة للاستخراج داخل هذا السيت.'
                : 'No extractable Sound (.PCG) or Performance (.PRF / .KST) entries were detected in this set.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Searchable Sound & Performance Picker */}
              <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-col space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {(
                      [
                        { id: 'all', ar: `الكل (${extractableItems.length})`, en: `All (${extractableItems.length})` },
                        {
                          id: 'sound',
                          ar: `الأصوات (${extractableItems.filter((i) => i.itemType === 'sound').length})`,
                          en: `Sounds (${extractableItems.filter((i) => i.itemType === 'sound').length})`,
                        },
                        {
                          id: 'performance',
                          ar: `الأداء (${extractableItems.filter((i) => i.itemType === 'performance').length})`,
                          en: `Performances (${extractableItems.filter((i) => i.itemType === 'performance').length})`,
                        },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setExtractorTypeFilter(f.id)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all ${
                          extractorTypeFilter === f.id
                            ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {isAr ? f.ar : f.en}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[190px]">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute start-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={extractorSearch}
                      onChange={(e) => setExtractorSearch(e.target.value)}
                      placeholder={isAr ? 'بحث باسم الصوت أو الملف...' : 'Search Sound or Performance...'}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg ps-8 pe-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-neutral-800/70 border border-neutral-800/80 rounded-xl bg-neutral-900/40">
                  {filteredExtractorItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-500">
                      {isAr ? 'لا توجد نتائج مطابقة للبحث.' : 'No matching Sounds or Performances.'}
                    </div>
                  ) : (
                    filteredExtractorItems.map((item) => {
                      const isSelected = selectedExtractorItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedExtractorItemId(item.id);
                            setLastExtractedPack(null);
                          }}
                          className={`w-full text-start px-3 py-2.5 flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-purple-500/20 border-s-4 border-purple-400'
                              : 'hover:bg-neutral-900/80'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                item.itemType === 'sound'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {item.itemType === 'sound' ? 'SOUND' : 'PERFORM'}
                            </span>
                            <div className="min-w-0">
                              <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                {item.name}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono truncate" dir="ltr">
                                {item.bankLabel} · {item.sourceFile}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span dir="ltr" className="text-[11px] font-mono font-bold text-cyan-300 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded">
                              {item.midiCoord}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-300" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Pruned Binary Folders Preview & .SET.zip Export */}
              <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                {selectedExtractorItem && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-neutral-800">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                            {isAr ? 'العنصر المختار للاستخراج' : 'Selected Extraction Target'}
                          </div>
                          <h4 className="text-sm font-black text-white truncate mt-0.5">
                            {selectedExtractorItem.name}
                          </h4>
                          <div className="text-[11px] font-mono text-neutral-400 truncate" dir="ltr">
                            {selectedExtractorItem.sourcePath} · MIDI {selectedExtractorItem.midiCoord}
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-400/30 text-purple-200 font-mono font-bold text-[11px] shrink-0">
                          {formatBytes(extractorPlan.totalBytes)}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-300" />
                        <span>
                          {isAr
                            ? 'المجلدات الحقيقية المقتطعة داخل أرشيف .SET.zip:'
                            : 'Pruned Binary Folders Included in .SET.zip:'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(
                          [
                            {
                              folder: 'SOUND/',
                              count: extractorPlan.soundAssets.length,
                              files: extractorPlan.soundAssets.map((a) => a.fileName),
                              color: 'text-amber-300 border-amber-500/30 bg-amber-500/5',
                            },
                            {
                              folder: 'MULTISMP/',
                              count: extractorPlan.multisampleAssets.length,
                              files: extractorPlan.multisampleAssets.map((a) => a.fileName),
                              color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5',
                            },
                            {
                              folder: 'PCM/',
                              count: extractorPlan.pcmAssets.length,
                              files: extractorPlan.pcmAssets.map((a) => a.fileName),
                              color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5',
                            },
                            {
                              folder: 'PERFORM/',
                              count: extractorPlan.performAssets.length,
                              files: extractorPlan.performAssets.map((a) => a.fileName),
                              color: 'text-purple-300 border-purple-500/30 bg-purple-500/5',
                            },
                          ] as const
                        ).map((box) => (
                          <div key={box.folder} className={`rounded-xl border p-2.5 space-y-1 ${box.color}`}>
                            <div className="flex items-center justify-between font-mono text-[11px] font-black" dir="ltr">
                              <span>{box.folder}</span>
                              <span>{box.count}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono truncate" dir="ltr">
                              {box.files.length > 0 ? box.files.join(', ') : (isAr ? 'مجلد فارغ مهيّأ' : 'Initialized folder')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-neutral-800">
                      <button
                        type="button"
                        disabled={isExtractingPack}
                        onClick={handleExtractSingleSoundPack}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>
                          {isExtractingPack
                            ? (isAr ? 'جاري تجهيز ملف .SET.zip...' : 'Building .SET.zip Pack...')
                            : (isAr
                                ? `تنزيل حزمة "${selectedExtractorItem.name}" (.SET.zip)`
                                : `Download "${selectedExtractorItem.name}" (.SET.zip)`)}
                        </span>
                      </button>

                      {lastExtractedPack && (
                        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 text-[11px] space-y-1">
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span dir="ltr" className="truncate">{lastExtractedPack.filename}</span>
                          </div>
                          <p className="text-neutral-300 leading-relaxed">
                            {isAr
                              ? `فك الضغط على USB ثم من الأورج اضغط MEDIA > Load وافتح مجلد ${lastExtractedPack.setFolderName} لتحميل الصوت والسامبلات المرتبطة به يدوياً.`
                              : `Unzip to USB, then on your KORG Pa press MEDIA > Load and open ${lastExtractedPack.setFolderName} to load this sound pack.`}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {statusToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-[#1e1533] border border-amber-500 text-amber-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 max-w-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

    </div>
  );
};
