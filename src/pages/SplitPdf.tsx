import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  FileText,
  Scissors,
  Download,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
} from 'lucide-react';

type Range = { start: number; end: number; name: string };
type SplitResult = {
  id: number;
  name: string;
  pages: string;
  size: string;
  blob: Blob;
  url: string; // for preview
};

const humanFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
};

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Using click() directly is fine; revoke on the next frame to avoid revoking before navigation
  a.click();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
};

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const [ranges, setRanges] = useState<Range[]>([{ start: 1, end: 1, name: 'Pages 1-1' }]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [results, setResults] = useState<SplitResult[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timeouts = useRef<number[]>([]);

  const toast = useCallback((msg: string, kind: 'error' | 'success' | 'info' = 'info') => {
    if (kind === 'error') {
      setError(msg);
      const t = window.setTimeout(() => setError(''), 5000);
      timeouts.current.push(t);
    } else if (kind === 'success') {
      setSuccess(msg);
      const t = window.setTimeout(() => setSuccess(''), 5000);
      timeouts.current.push(t);
    }
  }, []);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((t) => clearTimeout(t));
      // cleanup any object URLs we created
      results.forEach((r) => URL.revokeObjectURL(r.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearResults = () => {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setResults([]);
  };

  const handleFile = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf') {
      toast('Please select a PDF file', 'error');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast('File size must be less than 50MB', 'error');
      return;
    }

    try {
      const ab = await readFileAsArrayBuffer(f);
      const bytes = new Uint8Array(ab);
      const doc = await PDFDocument.load(bytes);
      setFile(f);
      setPdfBytes(bytes);
      setTotalPages(doc.getPageCount());
      const end = Math.min(5, doc.getPageCount());
      setRanges([{ start: 1, end, name: `Pages 1-${end}` }]);
      clearResults();
      toast('PDF loaded. Select page ranges to extract.', 'success');
    } catch {
      setFile(null);
      setPdfBytes(null);
      setTotalPages(0);
      toast('Error reading PDF file.', 'error');
    }
  }, [toast]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const addRange = () => {
    const last = ranges[ranges.length - 1];
    const nextStart = last ? last.end + 1 : 1;
    if (nextStart > totalPages) return;
    const end = Math.min(nextStart + 4, totalPages);
    setRanges([...ranges, { start: nextStart, end, name: `Pages ${nextStart}-${end}` }]);
  };

  const removeRange = (index: number) => {
    if (ranges.length <= 1) return;
    const next = ranges.filter((_, i) => i !== index);
    setRanges(next);
  };

  const updateRange = (index: number, field: 'start' | 'end' | 'name', raw: string) => {
    setRanges((prev) => {
      const next = [...prev];
      const r = { ...next[index] };
      if (field === 'name') {
        r.name = raw;
      } else {
        const val = clamp(parseInt(raw, 10) || 1, 1, totalPages);
        if (field === 'start') {
          r.start = val;
          if (r.end < val) r.end = val;
        } else {
          r.end = val;
          if (r.start > val) r.start = val;
        }
        r.name = `Pages ${r.start}-${r.end}`;
      }
      next[index] = r;
      return next;
    });
  };

  const validateRanges = (): string | null => {
    if (!totalPages) return 'No PDF loaded.';
    for (const r of ranges) {
      if (r.start < 1 || r.end < 1 || r.start > totalPages || r.end > totalPages) {
        return `Range ${r.name} is out of bounds 1-${totalPages}.`;
      }
      if (r.end < r.start) return `Range ${r.name} has "to" less than "from".`;
    }
    return null;
  };

  const split = async () => {
    if (!pdfBytes || !file) return;
    const err = validateRanges();
    if (err) {
      toast(err, 'error');
      return;
    }

    setIsProcessing(true);
    setError('');
    clearResults();

    try {
      const srcDoc = await PDFDocument.load(pdfBytes);

      const newResults: SplitResult[] = [];
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const indices: number[] = [];
        for (let p = r.start; p <= r.end; p++) indices.push(p - 1); // zero-based

        const out = await PDFDocument.create();
        const copied = await out.copyPages(srcDoc, indices);
        copied.forEach((p) => out.addPage(p));

        const saved = await out.save(); // Uint8Array
        const blob = new Blob([saved], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        newResults.push({
          id: i,
          name: r.name || `Split ${i + 1}`,
          pages: `${r.start}-${r.end}`,
          size: humanFileSize(saved.byteLength),
          blob,
          url,
        });
      }

      setResults(newResults);
      toast(`Successfully extracted ${newResults.length} file${newResults.length > 1 ? 's' : ''}.`, 'success');
    } catch (e) {
      console.error(e);
      toast('Error splitting PDF. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    if (!results.length) return;
    if (results.length > 3 && !confirm(`This will download ${results.length} files. Continue?`)) return;
    results.forEach((r, i) => {
      window.setTimeout(() => downloadBlob(r.blob, `${r.name}.pdf`), i * 300);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Toasts */}
      {error && (
        <div role="alert" className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div role="alert" className="fixed top-4 right-4 z-50 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">Split PDF</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {/* Upload */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">1. Upload your PDF</h2>

              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Drop your PDF here or click to upload</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">Maximum file size: 50MB</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Choose PDF File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {humanFileSize(file.size)} • {totalPages} page{totalPages !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPdfBytes(null);
                      setTotalPages(0);
                      setRanges([{ start: 1, end: 1, name: 'Pages 1-1' }]);
                      clearResults();
                    }}
                    aria-label="Remove uploaded file"
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Ranges */}
            {!!file && totalPages > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">2. Select page ranges</h2>
                  <button
                    onClick={() => setShowPreview((s) => !s)}
                    className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showPreview ? 'Hide' : 'Show'} preview (after extraction)</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {ranges.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <label className="block text-sm font-medium mb-1">From page</label>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={r.start}
                            onChange={(e) => updateRange(idx, 'start', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">To page</label>
                          <input
                            type="number"
                            min={r.start}
                            max={totalPages}
                            value={r.end}
                            onChange={(e) => updateRange(idx, 'end', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">File name</label>
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => updateRange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                          />
                        </div>
                      </div>
                      {ranges.length > 1 && (
                        <button
                          onClick={() => removeRange(idx)}
                          aria-label={`Remove range ${idx + 1}`}
                          className="mt-7 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  <button onClick={addRange} className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Plus className="w-4 h-4" />
                    Add range
                  </button>
                  <button
                    onClick={() => setShowAdvanced((s) => !s)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Advanced options {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showAdvanced && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <h4 className="font-medium mb-3">Quick presets</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setRanges([{ start: 1, end: 1, name: 'First Page' }])}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        First page only
                      </button>
                      <button
                        onClick={() => setRanges([{ start: totalPages, end: totalPages, name: 'Last Page' }])}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Last page only
                      </button>
                      <button
                        onClick={() => {
                          const all: Range[] = [];
                          for (let p = 1; p <= totalPages; p++) all.push({ start: p, end: p, name: `Page ${p}` });
                          setRanges(all);
                        }}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Split all pages
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Run */}
            {!!file && ranges.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-2xl font-semibold mb-6">3. Extract selected ranges</h2>
                <button
                  onClick={split}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Splitting PDF…
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Extract {ranges.length} file{ranges.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
                {isProcessing && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    Processing securely in your browser…
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">4. Download split files</h2>
                  <button onClick={downloadAll} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
                    <Download className="w-4 h-4" />
                    Download all
                  </button>
                </div>

                <div className="grid gap-4">
                  {results.map((r) => (
                    <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-red-600" />
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">Pages {r.pages} • {r.size}</p>
                          </div>
                        </div>
                        <button onClick={() => downloadBlob(r.blob, `${r.name}.pdf`)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>

                      {showPreview && (
                        <div className="mt-3">
                          {/* Lightweight preview via browser PDF viewer (first page visible by default) */}
                          <iframe
                            title={`Preview ${r.name}`}
                            src={`${r.url}#page=1&zoom=page-width`}
                            className="w-full h-64 rounded border border-slate-300 dark:border-slate-600"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Notes */}
          <aside className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <li>Use multiple ranges to create multiple files at once.</li>
                <li>Ranges must be within 1–{totalPages || 'N'}.</li>
                <li>Preview toggles after extraction for quick inspection.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
