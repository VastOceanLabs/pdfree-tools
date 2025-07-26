import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Grid3X3
} from 'lucide-react';

// Normalize rotation to 0-359 degrees
const normalize = (v) => ((v % 360) + 360) % 360;

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <div 
    role="alert"
    aria-live="assertive"
    className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`}>
    <div className="flex items-center gap-2">
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <AlertCircle className="w-5 h-5" />}
      <span>{message}</span>
      <button 
        type="button"
        onClick={onClose} 
        aria-label="Close notification"
        className="ml-2 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded"
      >
        ×
      </button>
    </div>
  </div>
);

// Loading overlay component
const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-gray-700">{message}</span>
      </div>
    </div>
  </div>
);

// PDF Page Preview Component
const PDFPagePreview = ({ pageImage, pageNumber, rotation, onRotate, isSelected, onSelect }) => (
  <div className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-700">Page {pageNumber}</span>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        aria-label={`Select page ${pageNumber}`}
      />
    </div>
    
    <div className="relative bg-white border rounded mb-3 overflow-hidden" style={{ minHeight: '200px' }}>
      {pageImage ? (
        <img 
          src={pageImage} 
          alt={`Page ${pageNumber} preview`}
          className="w-full h-auto transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      ) : (
        <div className="flex items-center justify-center h-48 bg-gray-100">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
      )}
    </div>
    
    <div className="flex gap-2">
      <button
        onClick={() => onRotate(-90)}
        className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Rotate page ${pageNumber} counterclockwise`}
      >
        <RotateCcw className="w-4 h-4" />
        90°
      </button>
      <button
        onClick={() => onRotate(90)}
        className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Rotate page ${pageNumber} clockwise`}
      >
        <RotateCw className="w-4 h-4" />
        90°
      </button>
    </div>
  </div>
);

export default function RotatePdf() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasRotations, setHasRotations] = useState(false);
  const fileInputRef = useRef(null);
  const deleteTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      handleFile(droppedFile);
    } else {
      showToast('Please upload a valid PDF file', 'error');
    }
  }, [showToast]);

  const handleFileInput = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  }, []);

  const handleFile = async (uploadedFile) => {
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (uploadedFile.size > maxSize) {
      showToast('File size exceeds 100MB limit. Please choose a smaller file.', 'error');
      return;
    }

    setProcessing(true);
    
    try {
      // Clear any existing timer
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }

      // Simulate PDF page extraction and preview generation
      // In production, use PDF-lib or pdf2pic for actual PDF processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockPages = Array.from({ length: 3 }, (_, i) => ({
        pageNumber: i + 1,
        rotation: 0,
        image: null // In production, generate actual page previews
      }));
      
      setFile(uploadedFile);
      setPages(mockPages);
      setSelectedPages(new Set());
      setHasRotations(false);
      
      // Set auto-deletion timer
      deleteTimerRef.current = setTimeout(() => {
        handleReset();
        showToast('File automatically deleted for your privacy', 'info');
      }, 3600000); // 1 hour
      
      showToast('PDF loaded successfully! Pages will be deleted in 1 hour.', 'success');
      
    } catch (error) {
      showToast('Error processing PDF. Please try again.', 'error');
      console.error('PDF processing error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const rotatePage = (pageIndex, degrees) => {
    setPages(prevPages => 
      prevPages.map((page, index) => 
        index === pageIndex 
          ? { ...page, rotation: (page.rotation + degrees) % 360 }
          : page
      )
    );
  };

  const rotateSelected = (degrees) => {
    if (selectedPages.size === 0) {
      showToast('Please select pages to rotate', 'error');
      return;
    }
    
    setPages(prevPages => 
      prevPages.map((page, index) => 
        selectedPages.has(index)
          ? { ...page, rotation: (page.rotation + degrees) % 360 }
          : page
      )
    );
    
    showToast(`Rotated ${selectedPages.size} page(s)`, 'success');
  };

  const rotateAll = (degrees) => {
    setPages(prevPages => 
      prevPages.map(page => ({
        ...page,
        rotation: (page.rotation + degrees) % 360
      }))
    );
    showToast(`Rotated all ${pages.length} pages`, 'success');
  };

  const selectAllPages = () => {
    const allPageIndices = new Set(pages.map((_, index) => index));
    setSelectedPages(allPageIndices);
  };

  const deselectAllPages = () => {
    setSelectedPages(new Set());
  };

  const togglePageSelection = (pageIndex) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageIndex)) {
        newSet.delete(pageIndex);
      } else {
        newSet.add(pageIndex);
      }
      return newSet;
    });
  };

  const handleDownload = async () => {
    if (!file || pages.length === 0) return;
    
    setProcessing(true);
    
    try {
      // In production, use PDF-lib to apply rotations and generate final PDF
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate download
      showToast('PDF rotated and downloaded successfully!', 'success');
      
    } catch (error) {
      showToast('Error creating rotated PDF. Please try again.', 'error');
      console.error('Download error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
    setSelectedPages(new Set());
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      setDeleteTimer(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with breadcrumb */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="text-sm text-gray-600 mb-2">
            <a href="/" className="hover:text-blue-600">PDfree.tools</a>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Rotate PDF</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* SEO-optimized hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Rotate PDF Pages Online Free
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Rotate PDF pages instantly - 90°, 180°, or 270°. No email required, unlimited use, 
            files deleted automatically after 1 hour for your privacy.
          </p>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 mb-8">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>100% Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Auto-delete in 1 hour</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No Email Required</span>
            </div>
          </div>
        </div>

        {/* Ad placement area */}
        <div className="mb-8">
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
            <span className="text-sm">Advertisement</span>
            <div className="h-20 flex items-center justify-center">
              728x90 Header Banner Ad Space
            </div>
          </div>
        </div>

        {!file ? (
          /* Upload section */
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Drop your PDF here
              </h2>
              <p className="text-gray-500 mb-6">
                or click to browse your files
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Choose PDF File
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                className="hidden"
                aria-label="Upload PDF file"
              />
              
              <p className="text-xs text-gray-400 mt-4">
                Maximum file size: 100MB • Supported format: PDF
              </p>
            </div>

            {/* How it works section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                How to Rotate PDF Pages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Upload PDF</h3>
                  <p className="text-gray-600 text-sm">
                    Select your PDF file or drag and drop it into the upload area
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RotateCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Rotate Pages</h3>
                  <p className="text-gray-600 text-sm">
                    Select pages and rotate them 90° clockwise or counterclockwise
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Download</h3>
                  <p className="text-gray-600 text-sm">
                    Download your rotated PDF instantly - files auto-delete in 1 hour
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PDF rotation interface */
          <div className="space-y-8">
            {/* File info and controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="font-semibold text-gray-900">{file.name}</h2>
                    <p className="text-sm text-gray-500">
                      {pages.length} page{pages.length !== 1 ? 's' : ''} • {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    disabled={processing}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Download className="w-4 h-4" />
                    Download Rotated PDF
                  </button>
                </div>
              </div>

              {/* Batch controls */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Batch Operations</h3>
                
                {/* Selection controls */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={selectAllPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Select All
                  </button>
                  <button
                    onClick={deselectAllPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Clear Selection
                  </button>
                  <span className="flex items-center px-3 py-2 text-sm text-gray-600">
                    {selectedPages.size} of {pages.length} selected
                  </span>
                </div>
                
                {/* Rotation controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => rotateSelected(-90)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rotate Selected 90° Left
                  </button>
                  <button
                    onClick={() => rotateSelected(90)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <RotateCw className="w-4 h-4" />
                    Rotate Selected 90° Right
                  </button>
                  <button
                    onClick={() => rotateAll(-90)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rotate All Left
                  </button>
                  <button
                    onClick={() => rotateAll(90)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <RotateCw className="w-4 h-4" />
                    Rotate All Right
                  </button>
                </div>
              </div>
            </div>

            {/* Page previews grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pages.map((page, index) => (
                <PDFPagePreview
                  key={index}
                  pageImage={page.image}
                  pageNumber={page.pageNumber}
                  rotation={page.rotation}
                  onRotate={(degrees) => rotatePage(index, degrees)}
                  isSelected={selectedPages.has(index)}
                  onSelect={() => togglePageSelection(index)}
                />
              ))}
            </div>

            {/* Sidebar ad space */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
              <span className="text-sm">Advertisement</span>
              <div className="h-64 flex items-center justify-center">
                300x250 Sidebar Ad Space
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section for SEO */}
        <section className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do I rotate PDF pages for free?
              </h3>
              <p className="text-gray-600">
                Simply upload your PDF file, select the pages you want to rotate, and click the rotation buttons. 
                You can rotate individual pages or all pages at once in 90-degree increments.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is it safe to upload my PDF files?
              </h3>
              <p className="text-gray-600">
                Yes, your files are processed securely and automatically deleted after 1 hour. 
                We don't store your files permanently or share them with third parties.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I rotate multiple pages at once?
              </h3>
              <p className="text-gray-600">
                Yes, you can select multiple pages using the checkboxes and rotate them all together, 
                or use the "Rotate All" buttons to rotate your entire document.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What file size limits apply?
              </h3>
              <p className="text-gray-600">
                You can rotate PDF files up to 100MB in size. For larger files, consider compressing 
                your PDF first or splitting it into smaller parts.
              </p>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="mt-16 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Choose PDfree.tools for PDF Rotation?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">100% Secure</h3>
              <p className="text-gray-600 text-sm">
                Files are processed locally when possible and automatically deleted after 1 hour
              </p>
            </div>
            
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">No Registration</h3>
              <p className="text-gray-600 text-sm">
                Use all features without creating an account or providing your email address
              </p>
            </div>
            
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Unlimited Use</h3>
              <p className="text-gray-600 text-sm">
                Rotate as many PDF files as you need - no daily limits or restrictions
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer ad space */}
      <div className="mt-16 mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
          <span className="text-sm">Advertisement</span>
          <div className="h-20 flex items-center justify-center">
            728x90 Footer Banner Ad Space
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {processing && (
        <LoadingOverlay message="Processing your PDF..." />
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}