import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileText, Download, Zap, Shield, Clock, Check, AlertCircle, Settings, Info } from 'lucide-react';

const CompressPdf = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedFile, setCompressedFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Compression level settings
  const compressionLevels = useMemo(() => ({
    low: { label: 'Low Compression', description: 'Smallest file reduction, highest quality', reduction: '10-30%' },
    medium: { label: 'Medium Compression', description: 'Balanced reduction and quality', reduction: '30-50%' },
    high: { label: 'High Compression', description: 'Maximum reduction, good quality', reduction: '50-70%' }
  }), []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateReduction = () => {
    if (originalSize && compressedSize) {
      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      return reduction;
    }
    return 0;
  };

  const showToastMessage = (message, type = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ type, message });
    timeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file');
      showToastMessage('Please select a valid PDF file', 'error');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File size must be less than 100MB');
      showToastMessage('File size must be less than 100MB', 'error');
      return;
    }

    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    setError('');
    setCompressedFile(null);
    showToastMessage('PDF uploaded successfully!');
  };

  const handleFileInputChange = (e) => {
    handleFileSelection(e.target.files[0]);
  };

  const compressPdf = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError('');

    try {
      // Simulate compression progress
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          if (newProgress >= 90) {
            return 90;
          }
          return Math.min(newProgress, 100);
        });
      }, 200);

      // Simulate compression processing (replace with actual PDF-lib implementation)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setProgress(100);

      // Simulate compression results based on level
      const reductionFactors = { low: 0.8, medium: 0.6, high: 0.4 };
      const simulatedCompressedSize = Math.floor(originalSize * reductionFactors[compressionLevel]);
      
      setCompressedSize(simulatedCompressedSize);
      
      // Generate proper filename
      const name = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
      
      setCompressedFile({
        name: name,
        size: simulatedCompressedSize,
        url: URL.createObjectURL(file) // In real implementation, this would be the compressed file
      });

      showToastMessage('PDF compressed successfully!');
    } catch (err) {
      setError('Compression failed. Please try again.');
      showToastMessage('Compression failed. Please try again.', 'error');
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (compressedFile) {
      const link = document.createElement('a');
      const url = compressedFile.url;
      link.href = url;
      link.download = compressedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToastMessage('Download started!');
    }
  };

  // Cleanup object URLs when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (compressedFile?.url) {
        URL.revokeObjectURL(compressedFile.url);
      }
    };
  }, [compressedFile]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">PDfree.tools</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              100% Free • No Email Required • Files Deleted in 1 Hour
            </div>
          </div>
        </div>
      </header>

      {/* Ad Space - Header Banner */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-slate-500 text-sm">
            Advertisement Space (728x90)
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SEO-Optimized Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Compress PDF Free - Reduce File Size
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-6 max-w-3xl mx-auto">
            Reduce your PDF file size by up to 70% while maintaining quality. Free, unlimited, and secure - no email required.
          </p>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>No Email Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Files Auto-Deleted</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Compression Settings */}
            {!compressedFile && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Compression Settings</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(compressionLevels).map(([key, level]) => (
                    <div key={key} className="relative">
                      <input
                        type="radio"
                        id={key}
                        name="compression"
                        value={key}
                        checked={compressionLevel === key}
                        onChange={(e) => setCompressionLevel(e.target.value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={key}
                        className={`block p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          compressionLevel === key
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">{level.label}</h3>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{level.reduction}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{level.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area */}
            {!file && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Drag & Drop Your PDF Here
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Or click to browse and select your PDF file
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    aria-describedby="file-input-description"
                  >
                    Choose PDF File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileInputChange}
                    className="sr-only"
                    aria-label="Select PDF file to compress"
                  />
                  <p id="file-input-description" className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Maximum file size: 100MB
                  </p>
                </div>
                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File Processing */}
            {file && !compressedFile && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <FileText className="w-8 h-8 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{file.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Original size: {formatFileSize(originalSize)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Compression: {compressionLevels[compressionLevel].label}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Expected reduction: {compressionLevels[compressionLevel].reduction}
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Compressing PDF...</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{Math.round(progress)}%</span>
                    </div>
                    <div 
                      className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Compression progress"
                    >
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={compressPdf}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Compressing...' : 'Compress PDF'}
                  </button>
                  <button
                    onClick={() => {
                      // Revoke object URL if it exists
                      if (compressedFile?.url) {
                        URL.revokeObjectURL(compressedFile.url);
                      }
                      setFile(null);
                      setOriginalSize(0);
                      setCompressedSize(0);
                      setCompressedFile(null);
                      setError('');
                      setProgress(0);
                    }}
                    disabled={isProcessing}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {compressedFile && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Check className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Compression Complete!</h2>
                </div>

                {/* Before/After Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                    <h3 className="font-medium text-slate-900 dark:text-white mb-2">Original File</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{file.name}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatFileSize(originalSize)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h3 className="font-medium text-slate-900 dark:text-white mb-2">Compressed File</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{compressedFile.name}</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">{formatFileSize(compressedSize)}</p>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {calculateReduction()}% smaller
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={downloadFile}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Compressed PDF
                  </button>
                  <button
                    onClick={() => {
                      // Revoke object URL before resetting
                      if (compressedFile?.url) {
                        URL.revokeObjectURL(compressedFile.url);
                      }
                      setFile(null);
                      setCompressedFile(null);
                      setOriginalSize(0);
                      setCompressedSize(0);
                      setProgress(0);
                    }}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  >
                    Compress Another PDF
                  </button>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">How to Compress PDF Files</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">1. Upload PDF</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Drag and drop or select your PDF file</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">2. Choose Quality</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Select your preferred compression level</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">3. Download</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Get your compressed PDF instantly</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Ad Space - Sidebar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                Advertisement Space (300x250)
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Privacy Protected</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Your files are processed securely and automatically deleted after 1 hour. We never store or share your documents.
                  </p>
                </div>
              </div>
            </div>

            {/* Related Tools */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Related PDF Tools</h3>
              <div className="space-y-3">
                <a href="/merge-pdf" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">Merge PDF</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Combine multiple PDFs</p>
                  </div>
                </a>
                <a href="/split-pdf" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">Split PDF</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Extract pages from PDF</p>
                  </div>
                </a>
                <a href="/pdf-to-word" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 group">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">PDF to Word</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Convert PDF to DOCX</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>&copy; 2025 PDfree.tools. All rights reserved. Free PDF tools with no email required.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CompressPdf;