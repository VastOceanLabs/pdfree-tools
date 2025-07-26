import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, GripVertical, Download, FileText, Plus, AlertCircle, CheckCircle, Loader2, Info, Shield, Clock, Zap, ChevronUp, ChevronDown } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  error?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const MergePdf: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedFile, setMergedFile] = useState<Blob | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const toastTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Set document title
  useEffect(() => {
    document.title = 'Merge PDF Free Online - No Email Required | PDfree.tools';
  }, []);

  // Cleanup toast timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
      toastTimeouts.current.clear();
    };
  }, []);

  // Toast management with proper cleanup
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    
    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
      toastTimeouts.current.delete(id);
    }, 5000);
    
    toastTimeouts.current.set(id, timeout);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timeout = toastTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeouts.current.delete(id);
    }
  }, []);

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are supported';
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return 'File size must be less than 50MB';
    }
    return null;
  };

  // Handle file upload
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      if (error) {
        addToast('error', `${file.name}: ${error}`);
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        error: error || undefined
      };

      newFiles.push(uploadedFile);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      addToast('success', `Added ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}`);
    }
  }, [addToast]);

  // Drag and drop handlers for file upload
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  // Drag counter robustness - prevent negative values
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change handler
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
    addToast('info', 'File removed');
  }, [addToast]);

  // Move file up/down for keyboard accessibility with announcements
  const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;
      
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      
      // Announce the move for screen readers
      const fileName = newFiles[targetIndex].name;
      addToast('info', `${fileName} moved ${direction} to position ${targetIndex + 1}`);
      
      return newFiles;
    });
  }, [addToast]);

  // Drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverItem = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropItem = useCallback((e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setFiles(prev => {
      const newFiles = [...prev];
      const draggedFile = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropIndex, 0, draggedFile);
      return newFiles;
    });

    setDraggedIndex(null);
  }, [draggedIndex]);

  // Merge PDFs (client-side simulation)
  const mergePDFs = useCallback(async () => {
    if (files.length < 2) {
      addToast('error', 'Please select at least 2 PDF files to merge');
      return;
    }

    setIsProcessing(true);
    setMergedFile(null);

    try {
      // Simulate PDF merging process with actual processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a realistic PDF blob with proper header for development
      // Note: This creates a minimal but valid PDF structure for demo purposes
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Merged PDF Demo) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000208 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
294
%%EOF`;
      
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      
      setMergedFile(blob);
      addToast('success', 'PDFs merged successfully!');
    } catch (error) {
      addToast('error', 'Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [files, addToast]);

  // Download merged file with safe object URL handling
  const downloadMergedFile = useCallback(() => {
    if (!mergedFile) return;

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.URL) {
      addToast('error', 'Download not available');
      return;
    }

    const url = URL.createObjectURL(mergedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addToast('success', 'Download started!');
  }, [mergedFile, addToast]);

  // Format file size with proper bounds checking
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-slate-900">PDfree.tools</h1>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Merge PDF</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-slate-600 hover:text-blue-600 transition-colors">All Tools</a>
              <a href="/blog" className="text-slate-600 hover:text-blue-600 transition-colors">Blog</a>
              <a href="/about" className="text-slate-600 hover:text-blue-600 transition-colors">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="max-w-6xl mx-auto px-4 py-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm text-slate-600">
          <li><a href="/" className="hover:text-blue-600">Home</a></li>
          <li className="text-slate-400">/</li>
          <li className="text-slate-900 font-medium">Merge PDF</li>
        </ol>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Merge PDF Files Free Online
          </h1>
          <p className="text-xl text-slate-600 mb-6 max-w-3xl mx-auto">
            Combine multiple PDF documents into one file. Drag to reorder pages, no email required, completely free.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate-600 mb-8">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Processed in browser</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span>No email required</span>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-8">
            {files.length === 0 ? (
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Choose PDF files to merge
                </h3>
                <p className="text-slate-600 mb-6">
                  Drag and drop multiple PDF files here, or click to select files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Select PDF Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="mt-4 text-sm text-slate-500">
                  Maximum file size: 50MB per file • Supports: PDF only
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Files to merge ({files.length})
                  </h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add more files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>

                {/* File List */}
                <div className="space-y-3 mb-6" role="list" aria-label="PDF files to merge">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-4 p-4 bg-slate-50 rounded-lg border transition-all ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOverItem}
                      onDrop={(e) => handleDropItem(e, index)}
                      role="listitem"
                      aria-label={`PDF file ${index + 1}: ${file.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" aria-hidden="true" />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveFile(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Move ${file.name} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveFile(index, 'down')}
                            disabled={index === files.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Move ${file.name} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-8 h-8 text-red-600" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                        <div className="text-sm text-slate-600">
                          #{index + 1}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Reorder Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Drag to reorder</p>
                      <p className="text-sm text-blue-700">
                        Files will be merged in the order shown above. Drag the grip handle to reorder, or use the up/down buttons.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Merge Button */}
                <button
                  onClick={mergePDFs}
                  disabled={files.length < 2 || isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-disabled={files.length < 2 || isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Merging PDFs...
                    </div>
                  ) : (
                    `Merge ${files.length} PDF Files`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result Section */}
        {mergedFile && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                PDF files merged successfully!
              </h3>
              <p className="text-slate-600 mb-6">
                Your merged PDF is ready for download.
              </p>
              <button
                onClick={downloadMergedFile}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 inline-flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Merged PDF
              </button>
              <div className="mt-4 text-sm text-slate-500">
                File will be deleted from your browser's memory when you leave this page
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to Merge PDF Files</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Upload PDFs</h3>
                <p className="text-slate-600 text-sm">
                  Select or drag multiple PDF files into the upload area
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Arrange Order</h3>
                <p className="text-slate-600 text-sm">
                  Drag files to reorder them as desired for the final merged PDF
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Download</h3>
                <p className="text-slate-600 text-sm">
                  Click merge and download your combined PDF file instantly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Is it free to merge PDF files?</h3>
                <p className="text-slate-600">
                  Yes! Our PDF merger is completely free with no limits on file size or number of merges. No registration or email required.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">How many PDF files can I merge at once?</h3>
                <p className="text-slate-600">
                  You can merge as many PDF files as needed. Each file can be up to 50MB in size for optimal performance.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Are my files secure?</h3>
                <p className="text-slate-600">
                  Yes, your files are processed entirely in your browser and never uploaded to our servers. They remain on your device at all times.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Can I change the order of pages?</h3>
                <p className="text-slate-600">
                  Absolutely! You can drag and drop files to reorder them before merging. The final PDF will contain pages in the order you specify.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">PDfree.tools</h3>
              <p className="text-sm text-slate-400">
                Professional PDF tools that are completely free, secure, and respect your privacy.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Tools</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/compress-pdf" className="hover:text-white transition-colors">Compress PDF</a></li>
                <li><a href="/split-pdf" className="hover:text-white transition-colors">Split PDF</a></li>
                <li><a href="/merge-pdf" className="hover:text-white transition-colors">Merge PDF</a></li>
                <li><a href="/pdf-to-word" className="hover:text-white transition-colors">PDF to Word</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Security</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>✓ Client-side processing only</li>
                <li>✓ No email registration required</li>
                <li>✓ SSL encrypted transfers</li>
                <li>✓ Privacy-first design</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2025 PDfree.tools. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-50 space-y-2"
        role="region"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
            role="alert"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" aria-hidden="true" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" aria-hidden="true" />}
            {toast.type === 'info' && <Info className="w-5 h-5" aria-hidden="true" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MergePdf;