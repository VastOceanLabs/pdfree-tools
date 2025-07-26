"use client";
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Upload, Download, Settings, Shield, Clock, CheckCircle, AlertCircle, Loader2, FileImage, Zap, Star } from 'lucide-react';

// Types for our conversion process
interface ConversionOptions {
  quality: number;
  format: 'jpg' | 'jpeg';
  resolution: number;
}

interface ConvertedImage {
  blob: Blob;
  filename: string;
  pageNumber: number;
}

interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

const PdfToJpgPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle', progress: 0 });
  const [conversionOptions, setConversionOptions] = useState<ConversionOptions>({
    quality: 85,
    format: 'jpg',
    resolution: 150
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Properly manage Object URLs to prevent memory leaks
  const previewURLs = useMemo(
    () => convertedImages.map(i => URL.createObjectURL(i.blob)),
    [convertedImages]
  );

  useEffect(() => {
    return () => previewURLs.forEach(URL.revokeObjectURL);
  }, [previewURLs]);

  // Mock conversion function (in real app, this would use PDF-lib in a Web Worker)
  const convertPdfToJpg = async (file: File, options: ConversionOptions): Promise<ConvertedImage[]> => {
    setProcessingState({ status: 'processing', progress: 0, message: 'Loading PDF...' });
    
    // Simulate file processing with realistic progress updates
    const totalSteps = 5;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const progress = (i / totalSteps) * 100;
      const messages = [
        'Loading PDF...',
        'Analyzing pages...',
        'Converting page 1...',
        'Converting page 2...',
        'Optimizing images...',
        'Finalizing conversion...'
      ];
      setProcessingState(prev => ({
        ...prev,
        progress,
        currentPage: i > 1 ? i - 1 : undefined,
        totalPages: i > 1 ? 2 : undefined,
        message: messages[i] || 'Processing...'
      }));
    }

    // Create mock converted images
    const mockImages: ConvertedImage[] = [];
    const mime = 'image/jpeg'; // Always use valid MIME type
    
    for (let i = 1; i <= 2; i++) {
      // Create a small canvas with mock content
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Mock page content
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 600);
      ctx.fillStyle = '#333333';
      ctx.font = '24px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${i}`, 200, 300);
      ctx.font = '16px Inter';
      ctx.fillText('Converted from PDF', 200, 340);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), mime, options.quality / 100);
      });
      
      mockImages.push({
        blob,
        filename: `page-${i}.${options.format}`,
        pageNumber: i
      });
    }

    setProcessingState({ status: 'completed', progress: 100, message: 'Conversion completed!' });
    return mockImages;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setConvertedImages([]);
      setProcessingState({ status: 'idle', progress: 0 });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if we're leaving the drop zone itself, not a child
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const startConversion = async () => {
    if (!file) return;
    
    try {
      setProcessingState({ status: 'processing', progress: 0 });
      const images = await convertPdfToJpg(file, conversionOptions);
      setConvertedImages(images);
    } catch (error) {
      setProcessingState({ 
        status: 'error', 
        progress: 0, 
        message: 'Conversion failed. Please try again or contact support.' 
      });
    }
  };

  const downloadSingle = (image: ConvertedImage) => {
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    // In a real app, this would use JSZip library
    // For now, we'll simulate by downloading files individually
    for (const image of convertedImages) {
      downloadSingle(image);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const resetTool = () => {
    setFile(null);
    setConvertedImages([]);
    setProcessingState({ status: 'idle', progress: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO and Accessibility */}
      <div className="sr-only">
        <p>Convert PDF to JPG Free Online - No Email Required</p>
        <p>Transform your PDF documents into high-quality JPG images instantly. Supports multiple pages, custom quality settings, and batch download.</p>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileImage className="w-6 h-6 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PDF to JPG Converter</h1>
                <p className="text-sm text-gray-600">Convert PDF pages to high-quality JPG images</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center text-sm text-green-600">
                <Shield className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center text-sm text-blue-600">
                <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>Files deleted in 1 hour</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trust Badges */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Why Choose PDfree.tools?</h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                  100% Free Forever
                </span>
                <span className="flex items-center text-blue-600">
                  <Shield className="w-4 h-4 mr-1" aria-hidden="true" />
                  No Email Required
                </span>
                <span className="flex items-center text-purple-600">
                  <Zap className="w-4 h-4 mr-1" aria-hidden="true" />
                  Lightning Fast
                </span>
                <span className="flex items-center text-orange-600">
                  <Star className="w-4 h-4 mr-1" aria-hidden="true" />
                  Professional Quality
                </span>
              </div>
            </div>
            {/* Ad Space Placeholder */}
            <div className="bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500 min-w-[250px]">
              <div className="h-20 flex items-center justify-center">
                [Ad Space - 250x100]
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Conversion Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {/* File Upload */}
              {!file && (
                <div
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Choose PDF File</h3>
                  <p className="text-gray-600 mb-4">Drag and drop your PDF here, or click to browse</p>
                  <button 
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    aria-describedby="file-upload-description"
                  >
                    Select PDF File
                  </button>
                  <p id="file-upload-description" className="text-sm text-gray-500 mt-2">
                    Maximum file size: 10MB • Supports: PDF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    aria-label="Choose PDF file to convert"
                  />
                </div>
              )}

              {/* File Selected */}
              {file && processingState.status === 'idle' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileImage className="w-8 h-8 text-blue-600" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={resetTool}
                        className="text-gray-400 hover:text-gray-600 p-2"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Conversion Options */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Conversion Settings</h3>
                      <button
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Settings className="w-4 h-4 mr-1" aria-hidden="true" />
                        {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quality
                        </label>
                        <select
                          value={conversionOptions.quality}
                          onChange={(e) => setConversionOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={95}>High (95%)</option>
                          <option value={85}>Medium (85%)</option>
                          <option value={75}>Standard (75%)</option>
                          <option value={60}>Low (60%)</option>
                        </select>
                      </div>

                      {showAdvancedOptions && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Format
                            </label>
                            <select
                              value={conversionOptions.format}
                              onChange={(e) => setConversionOptions(prev => ({ ...prev, format: e.target.value as 'jpg' | 'jpeg' }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="jpg">JPG</option>
                              <option value="jpeg">JPEG</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Resolution (DPI)
                            </label>
                            <select
                              value={conversionOptions.resolution}
                              onChange={(e) => setConversionOptions(prev => ({ ...prev, resolution: parseInt(e.target.value) }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={72}>72 DPI (Web)</option>
                              <option value={150}>150 DPI (Standard)</option>
                              <option value={300}>300 DPI (Print)</option>
                              <option value={600}>600 DPI (High Quality)</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={startConversion}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Convert to JPG
                  </button>
                </div>
              )}

              {/* Processing State */}
              {processingState.status === 'processing' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" aria-hidden="true" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Converting PDF to JPG</h3>
                    
                    {/* Accessible progress announcements */}
                    <div aria-live="polite" aria-atomic="true" className="sr-only">
                      {processingState.message} {Math.round(processingState.progress)}% complete
                    </div>
                    
                    <p className="text-gray-600 mb-4" aria-hidden="true">{processingState.message}</p>
                    
                    {processingState.currentPage != null && processingState.totalPages != null && (
                      <p className="text-sm text-gray-500 mb-4">
                        Processing page {processingState.currentPage} of {processingState.totalPages}
                      </p>
                    )}

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${processingState.progress}%` }}
                        role="progressbar"
                        aria-valuenow={processingState.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${Math.round(processingState.progress)}% complete - ${processingState.message}`}
                      />
                    </div>
                    <p className="text-sm text-gray-500" aria-hidden="true">{Math.round(processingState.progress)}% complete</p>
                  </div>
                </div>
              )}

              {/* Conversion Results */}
              {processingState.status === 'completed' && convertedImages.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Conversion Complete!</h3>
                      <p className="text-gray-600">{convertedImages.length} images ready for download</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={downloadAllAsZip}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        title="Downloads all images individually (ZIP functionality coming soon)"
                      >
                        Download All
                      </button>
                      <button
                        onClick={resetTool}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        Convert Another
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {convertedImages.map((image, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <FileImage className="w-5 h-5 text-blue-600" aria-hidden="true" />
                            <span className="font-medium text-gray-900">{image.filename}</span>
                          </div>
                          <span className="text-sm text-gray-500">Page {image.pageNumber}</span>
                        </div>
                        
                        <div className="bg-white rounded border mb-3 p-2">
                          <img 
                            src={previewURLs[index]} 
                            alt={`Converted page ${image.pageNumber}`}
                            className="w-full h-32 object-contain rounded"
                          />
                        </div>

                        <button
                          onClick={() => downloadSingle(image)}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                        >
                          <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error State */}
              {processingState.status === 'error' && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Conversion Failed</h3>
                  <p className="text-gray-600 mb-4">{processingState.message}</p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => file && startConversion()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={resetTool}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium text-xs">1</span>
                  <span className="text-gray-700">Upload your PDF file by dragging & dropping or clicking to browse</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium text-xs">2</span>
                  <span className="text-gray-700">Choose your preferred quality and format settings</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium text-xs">3</span>
                  <span className="text-gray-700">Click "Convert to JPG" and wait for processing to complete</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium text-xs">4</span>
                  <span className="text-gray-700">Download individual images or all pages as a ZIP file</span>
                </li>
              </ol>
            </div>

            {/* Ad Space */}
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                [Ad Space - 300x250]
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">Convert all PDF pages to JPG</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">Adjustable image quality settings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">Batch download as ZIP file</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">Multiple resolution options</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">Fast client-side processing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-gray-700">No watermarks or limits</span>
                </li>
              </ul>
            </div>

            {/* Related Tools */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Tools</h3>
              <div className="space-y-3">
                <a href="/pdf-to-png" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">PDF to PNG</div>
                  <div className="text-sm text-gray-600">Convert PDF to PNG with transparency</div>
                </a>
                <a href="/compress-pdf" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Compress PDF</div>
                  <div className="text-sm text-gray-600">Reduce PDF file size</div>
                </a>
                <a href="/split-pdf" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Split PDF</div>
                  <div className="text-sm text-gray-600">Extract specific pages</div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-12 bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is the PDF to JPG converter really free?</h3>
              <p className="text-gray-600 text-sm">Yes, our PDF to JPG converter is completely free with no hidden charges, watermarks, or registration requirements.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens to my files after conversion?</h3>
              <p className="text-gray-600 text-sm">All uploaded files are automatically deleted from our servers after 1 hour for your privacy and security.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I convert multi-page PDFs?</h3>
              <p className="text-gray-600 text-sm">Yes, our tool converts all pages from your PDF into separate JPG images and provides options to download them individually or as a ZIP file.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What quality settings should I use?</h3>
              <p className="text-gray-600 text-sm">For web use, choose Standard (75%). For printing, use High (95%). For smaller file sizes, select Medium (85%) or Low (60%).</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>© 2025 PDfree.tools - Free PDF Tools Online | <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> | <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PdfToJpgPage;