import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Scissors, 
  Download, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Plus,
  Minus,
  Zap,
  Users,
  Globe
} from 'lucide-react';

type Range = { start: number; end: number; name: string };
type SplitResult = {
  id: number;
  name: string;
  pages: string;
  size: string;
  blob: Blob;
};

const SplitPdfPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedRanges, setSelectedRanges] = useState<Range[]>([{ start: 1, end: 1, name: 'Pages 1-1' }]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup timeouts on unmount
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    if (type === 'error') {
      setError(message);
      const timeout = setTimeout(() => setError(''), 5000);
      timeoutRefs.current.push(timeout);
    } else if (type === 'success') {
      setSuccess(message);
      const timeout = setTimeout(() => setSuccess(''), 5000);
      timeoutRefs.current.push(timeout);
    }
  };

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File | null | undefined) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      showToast('Please select a PDF file', 'error');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
      showToast('File size must be less than 50MB', 'error');
      return;
    }

    setFile(selectedFile);
    setError('');
    setSplitResults([]);

    // Get PDF page count (simulate for demo - replace with PDF-lib)
    try {
      // In real implementation, use PDF-lib to get actual page count
      const pages = Math.floor(Math.random() * 20) + 5; // Demo: 5-25 pages
      setTotalPages(pages);
      setSelectedRanges([{ start: 1, end: Math.min(5, pages), name: `Pages 1-${Math.min(5, pages)}` }]);
      showToast('PDF loaded successfully! Select pages to split.', 'success');
    } catch (err) {
      showToast('Error reading PDF file', 'error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      handleFileSelect(droppedFile);
    } else {
      showToast('Please upload a valid PDF file', 'error');
    }
  }, [handleFileSelect]);

  const addRange = () => {
    const lastRange = selectedRanges[selectedRanges.length - 1];
    const nextStart = lastRange ? lastRange.end + 1 : 1;
    if (nextStart <= totalPages) {
      const newRange: Range = {
        start: nextStart,
        end: Math.min(nextStart + 4, totalPages),
        name: `Pages ${nextStart}-${Math.min(nextStart + 4, totalPages)}`
      };
      setSelectedRanges([...selectedRanges, newRange]);
    }
  };

  const removeRange = (index: number) => {
    if (selectedRanges.length > 1) {
      setSelectedRanges(selectedRanges.filter((_, i) => i !== index));
    }
  };

  const updateRange = (index: number, field: 'start' | 'end' | 'name', raw: string) => {
    setSelectedRanges(prev => {
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

  const handleSplit = async () => {
    if (!file || selectedRanges.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      // Simulate PDF splitting process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = selectedRanges.map((range, index) => ({
        id: index,
        name: range.name || `Split ${index + 1}`,
        pages: `${range.start}-${range.end}`,
        size: `${Math.floor(Math.random() * 500) + 100}KB`,
        blob: new Blob(['demo'], { type: 'application/pdf' }) // Demo blob
      }));

      setSplitResults(results);
      showToast(`Successfully split PDF into ${results.length} files!`, 'success');
    } catch (err) {
      showToast('Error splitting PDF. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (result: SplitResult) => {
    // Simulate download
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.name}.pdf`;
    a.click();
    
    // Clean up URL safely
    requestAnimationFrame(() => URL.revokeObjectURL(url));
    showToast(`Downloaded ${result.name}.pdf`, 'success');
  };

  const downloadAll = () => {
    if (splitResults.length > 3) {
      // For many files, ask for confirmation to prevent browser blocking
      if (!confirm(`This will download ${splitResults.length} files. Continue?`)) {
        return;
      }
    }
    
    splitResults.forEach((result, index) => {
      setTimeout(() => downloadFile(result), index * 500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* SEO Head would go here in real implementation */}
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">PDfree.tools</div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <button className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">All Tools</button>
              <button className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Blog</button>
              <button className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">About</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Toast Messages */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-sm"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div 
          role="alert"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-sm"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Split PDF Free - No Email Required
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Extract specific pages or split your PDF into multiple documents. 
            100% free, unlimited use, secure browser-based processing.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span>100% Secure & Private</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span>Browser-Based Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>No Email Required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Space - Header Banner */}
      <div className="bg-slate-100 dark:bg-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-4 border-2 border-dashed border-slate-300 dark:border-slate-600">
            <p className="text-sm text-slate-500 dark:text-slate-400">Advertisement Space (728x90 Desktop / 320x50 Mobile)</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Tool Area */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Upload Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                1. Upload Your PDF
              </h2>
              
              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    Drop your PDF here or click to upload
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Maximum file size: 50MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Choose PDF File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {totalPages} pages
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setSplitResults([]);
                        setSelectedRanges([{ start: 1, end: 1, name: 'Pages 1-1' }]);
                      }}
                      aria-label="Remove uploaded file"
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Page Range Selection */}
            {file && totalPages > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    2. Select Page Ranges
                  </h2>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedRanges.map((range, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            From Page
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={range.start}
                            onChange={(e) => updateRange(index, 'start', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            To Page
                          </label>
                          <input
                            type="number"
                            min={range.start}
                            max={totalPages}
                            value={range.end}
                            onChange={(e) => updateRange(index, 'end', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            File Name
                          </label>
                          <input
                            type="text"
                            value={range.name}
                            onChange={(e) => updateRange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                      {selectedRanges.length > 1 && (
                        <button
                          onClick={() => removeRange(index)}
                          aria-label={`Remove page range ${index + 1}`}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 mt-6">
                  <button
                    onClick={addRange}
                    className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Range</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-600 border border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <span>Advanced Options</span>
                    {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showAdvancedOptions && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">Quick Presets</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedRanges([{ start: 1, end: 1, name: 'First Page' }])}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        First Page Only
                      </button>
                      <button
                        onClick={() => setSelectedRanges([{ start: totalPages, end: totalPages, name: 'Last Page' }])}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Last Page Only
                      </button>
                      <button
                        onClick={() => {
                          const ranges = [];
                          for (let i = 1; i <= totalPages; i++) {
                            ranges.push({ start: i, end: i, name: `Page ${i}` });
                          }
                          setSelectedRanges(ranges);
                        }}
                        className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Split All Pages
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Process Button */}
            {file && selectedRanges.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                  3. Split PDF
                </h2>
                
                <button
                  onClick={handleSplit}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Splitting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      <span>Split PDF into {selectedRanges.length} Files</span>
                    </>
                  )}
                </button>
                
                {isProcessing && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                      <p className="text-blue-800 dark:text-blue-200">
                        Processing your PDF securely in your browser...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Section */}
            {splitResults.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    4. Download Split Files
                  </h2>
                  <button
                    onClick={downloadAll}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download All</span>
                  </button>
                </div>

                <div className="grid gap-4">
                  {splitResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{result.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Pages {result.pages} • {result.size}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(result)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-200 font-medium">
                      All processing completed securely in your browser. Your files never leave your device.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Ad Space - Sidebar */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border-2 border-dashed border-slate-300 dark:border-slate-600">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Advertisement Space<br/>(300x250)
              </p>
            </div>

            {/* Related Tools */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Related Tools</h3>
              <div className="space-y-3">
                <button className="block w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <Copy className="w-5 h-5 text-blue-600" />
                    <span className="text-slate-900 dark:text-white font-medium">Merge PDF</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Combine multiple PDFs</p>
                </button>
                <button className="block w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <span className="text-slate-900 dark:text-white font-medium">Compress PDF</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Reduce file size</p>
                </button>
                <button className="block w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-slate-900 dark:text-white font-medium">PDF to Word</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Convert to DOCX</p>
                </button>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Why Choose PDfree.tools?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">100% Secure</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">All processing happens in your browser</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">No Registration</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Start splitting immediately</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Works Everywhere</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Any device, any browser</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* How to Use Section */}
        <section className="mt-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-8">
            How to Split PDF - Step by Step
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">1. Upload PDF</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Choose your PDF file or drag and drop it. Files up to 50MB are supported.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">2. Select Pages</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Choose which pages to extract. Create multiple ranges or split into individual pages.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">3. Download</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Get your split PDF files instantly. Download individually or all at once.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Is it safe to split PDFs online?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes! All PDF processing happens directly in your browser using JavaScript. Your files never leave your device, 
                ensuring complete privacy and security.
              </p>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                What's the maximum file size I can split?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                You can split PDF files up to 50MB in size. For larger files, the tool will automatically handle processing 
                to ensure smooth performance.
              </p>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Can I split password-protected PDFs?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Currently, our tool works with unprotected PDF files. If your PDF is password-protected, 
                you'll need to remove the password first using our unlock PDF tool.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Do you store my files?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                No, we don't store your files. All processing happens directly in your browser using JavaScript, 
                so your files never leave your device, ensuring complete privacy.
              </p>
            </div>
          </div>
        </section>

        {/* Ad Space - Footer Banner */}
        <div className="mt-16 bg-slate-100 dark:bg-slate-800 rounded-lg p-6 border-2 border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            Advertisement Space (728x90 Desktop / 320x50 Mobile)
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">PDfree.tools</h3>
              <p className="text-slate-400 text-sm">
                Free PDF tools for everyone. No limits, no email required, completely secure.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Popular Tools</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button className="hover:text-white transition-colors text-left">Merge PDF</button></li>
                <li><button className="hover:text-white transition-colors text-left">Compress PDF</button></li>
                <li><button className="hover:text-white transition-colors text-left">PDF to Word</button></li>
                <li><button className="hover:text-white transition-colors text-left">Word to PDF</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button className="hover:text-white transition-colors text-left">Help Center</button></li>
                <li><button className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
                <li><button className="hover:text-white transition-colors text-left">Terms of Service</button></li>
                <li><button className="hover:text-white transition-colors text-left">Contact Us</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><button className="hover:text-white transition-colors text-left">Blog</button></li>
                <li><button className="hover:text-white transition-colors text-left">Twitter</button></li>
                <li><button className="hover:text-white transition-colors text-left">LinkedIn</button></li>
                <li><button className="hover:text-white transition-colors text-left">GitHub</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2025 PDfree.tools. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SplitPdfPage;