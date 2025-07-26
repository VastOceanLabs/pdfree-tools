import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, X, GripVertical, AlertCircle, Shield, Clock, Zap, Image, FileText, ArrowRight, Star, CheckCircle } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}

const JpgToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [error, setError] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup URLs on unmount and auto-delete after 1 hour
  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    if (!downloadUrl) return;
    
    const timer = setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl('');
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearTimeout(timer);
  }, [downloadUrl]);

  // Convert any image format to PNG bytes for PDF embedding
  const toPngBytes = useCallback(async (file: File): Promise<Uint8Array> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    
    const blob: Blob = await new Promise(resolve => 
      canvas.toBlob(b => resolve(b!), 'image/png')!
    );
    return new Uint8Array(await blob.arrayBuffer());
  }, []);

  // File upload handler
  const handleFileUpload = useCallback((files: FileList) => {
    const validFiles: ImageFile[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB per file

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files (JPG, PNG, WebP, etc.)');
        return;
      }
      
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB per image.`);
        return;
      }

      const id = Math.random().toString(36).slice(2, 11);
      const preview = URL.createObjectURL(file);
      
      validFiles.push({
        id,
        file,
        preview,
        name: file.name
      });
    });

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
      setError('');
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Clean up preview URL
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  // Reorder images via drag and drop
  const handleImageDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleImageDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setImages(prev => {
      const newImages = [...prev];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);
      setDraggedIndex(index);
      return newImages;
    });
  }, [draggedIndex]);

  const handleImageDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Handle keyboard navigation for upload zone
  const handleUploadKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  // Convert images to PDF
  const convertToPdf = useCallback(async (): Promise<void> => {
    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setProcessing({ isProcessing: true, progress: 0, currentStep: 'Initializing...' });
    setError('');

    try {
      // Dynamic import to reduce bundle size
      const { PDFDocument, PageSizes } = await import('pdf-lib');
      
      setProcessing(prev => ({ ...prev, progress: 10, currentStep: 'Creating PDF document...' }));
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setProcessing(prev => ({
          ...prev,
          progress: 10 + ((i + 1) / images.length) * 80,
          currentStep: `Processing image ${i + 1} of ${images.length}...`
        }));

        // Read image file
        const imageBytes = await image.file.arrayBuffer();
        
        let embeddedImage;
        if (image.file.type === 'image/jpeg') {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (image.file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          // Convert other formats (WebP, AVIF, etc.) to PNG
          const pngBytes = await toPngBytes(image.file);
          embeddedImage = await pdfDoc.embedPng(pngBytes);
        }

        // Calculate dimensions to fit page while maintaining aspect ratio
        const { width, height } = embeddedImage;
        const [pageWidth, pageHeight] = PageSizes.A4; // Use pdf-lib constant
        const margin = 50;
        
        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = pageHeight - 2 * margin;
        
        let scaledWidth = width;
        let scaledHeight = height;
        
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const scale = Math.min(widthRatio, heightRatio);
          
          scaledWidth = width * scale;
          scaledHeight = height * scale;
        }

        // Add page and image
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;
        
        page.drawImage(embeddedImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }

      setProcessing(prev => ({ ...prev, progress: 95, currentStep: 'Finalizing PDF...' }));
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setProcessing({ isProcessing: false, progress: 100, currentStep: 'Complete!' });

      // Clean up image previews
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);

    } catch (err) {
      console.error('PDF conversion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert images to PDF. Please try again.');
      setProcessing({ isProcessing: false, progress: 0, currentStep: '' });
    }
  }, [images]);

  // Download PDF
  const downloadPdf = useCallback(() => {
    if (!downloadUrl) return;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'converted-images.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [downloadUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Head would go here in actual implementation */}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">PDfree.tools</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="/tools" className="text-gray-600 hover:text-gray-900">All Tools</a>
              <a href="/about" className="text-gray-600 hover:text-gray-900">About</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li><a href="/" className="text-gray-500 hover:text-gray-700">Home</a></li>
            <li><span className="text-gray-400 mx-2">/</span></li>
            <li><a href="/tools" className="text-gray-500 hover:text-gray-700">Tools</a></li>
            <li><span className="text-gray-400 mx-2">/</span></li>
            <li className="text-gray-900 font-medium" aria-current="page">JPG to PDF</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <section className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
              <div className="text-center max-w-2xl mx-auto">
                <div className="flex justify-center mb-4">
                  <Image className="h-16 w-16 text-blue-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Convert JPG to PDF Free
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Transform your JPG, PNG, WebP and other images into a single PDF document. 
                  No email required, completely free, and processing happens locally in your browser.
                </p>
                
                {/* Trust Signals */}
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1 text-green-600" />
                    100% Secure
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-blue-600" />
                    Browser Processing
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-orange-600" />
                    No Email Required
                  </div>
                </div>
              </div>
            </section>

            {/* Upload Section */}
            <section className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload Your Images</h2>
              
              {/* Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={handleUploadKeyDown}
                role="button"
                tabIndex={0}
                aria-label="Upload images or drag and drop"
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }
                `}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop images here or click to browse
                </p>
                <p className="text-sm text-gray-600">
                  Supports JPG, PNG, WebP, AVIF, and other image formats • Maximum 10MB per image
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </section>

            {/* Image Preview and Ordering */}
            {images.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Step 2: Arrange Your Images ({images.length})
                  </h2>
                  <p className="text-sm text-gray-600">Drag to reorder</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={() => handleImageDragStart(index)}
                      onDragOver={(e) => handleImageDragOver(e, index)}
                      onDragEnd={handleImageDragEnd}
                      className={`
                        relative group bg-gray-50 rounded-lg overflow-hidden cursor-move border-2
                        ${draggedIndex === index ? 'border-blue-400 opacity-50' : 'border-transparent'}
                        hover:border-gray-300 transition-all
                      `}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.preview}
                          alt={`Preview of ${image.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Overlay with controls */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => removeImage(image.id)}
                            className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            aria-label={`Remove ${image.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center">
                            <GripVertical className="h-3 w-3 mr-1" />
                            {index + 1}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <p className="text-xs text-gray-600 truncate" title={image.name}>
                          {image.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Convert Section */}
            {images.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Convert to PDF</h2>
                
                {!processing.isProcessing && !downloadUrl && (
                  <button
                    onClick={convertToPdf}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Convert {images.length} Image{images.length !== 1 ? 's' : ''} to PDF
                  </button>
                )}

                {processing.isProcessing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{processing.currentStep}</span>
                      <span className="text-gray-900 font-medium">{Math.round(processing.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${processing.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {downloadUrl && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center text-green-600 mb-4">
                      <CheckCircle className="h-8 w-8 mr-2" />
                      <span className="text-lg font-medium">PDF Created Successfully!</span>
                    </div>
                    <button
                      onClick={downloadPdf}
                      className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center mx-auto"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download PDF
                    </button>
                    <p className="text-sm text-gray-600">
                      Your download link will be automatically revoked in 1 hour for your privacy.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* How it Works */}
            <section className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">How to Convert JPG to PDF</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">1. Upload Images</h3>
                  <p className="text-sm text-gray-600">
                    Select multiple JPG, PNG, or other image files from your device
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <GripVertical className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">2. Arrange Order</h3>
                  <p className="text-sm text-gray-600">
                    Drag and drop to arrange your images in the desired order
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">3. Download PDF</h3>
                  <p className="text-sm text-gray-600">
                    Get your merged PDF file ready for download in seconds
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ad Space */}
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Advertisement</p>
              <div className="bg-white rounded border-2 border-dashed border-gray-300 h-64 flex items-center justify-center">
                <span className="text-gray-400">300x250 Ad Space</span>
              </div>
            </div>

            {/* Related Tools */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Tools</h3>
              <div className="space-y-3">
                {[
                  { name: 'PDF to JPG', href: '/pdf-to-jpg', desc: 'Extract images from PDF' },
                  { name: 'Compress PDF', href: '/compress-pdf', desc: 'Reduce PDF file size' },
                  { name: 'Merge PDF', href: '/merge-pdf', desc: 'Combine multiple PDFs' },
                  { name: 'PNG to PDF', href: '/png-to-pdf', desc: 'Convert PNG images to PDF' }
                ].map((tool) => (
                  <a
                    key={tool.name}
                    href={tool.href}
                    className="block p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-700">
                          {tool.name}
                        </h4>
                        <p className="text-sm text-gray-600">{tool.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose PDfree.tools?</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">100% Secure</h4>
                    <p className="text-sm text-gray-600">Your files are processed locally and download links auto-expire</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Star className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">No Limits</h4>
                    <p className="text-sm text-gray-600">Convert unlimited files without restrictions</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Zap className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">No Registration</h4>
                    <p className="text-sm text-gray-600">Use all tools without creating an account</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-12 bg-white rounded-xl shadow-sm border p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "Is it really free to convert JPG to PDF?",
                a: "Yes! Our JPG to PDF converter is completely free with no hidden costs, watermarks, or limitations."
              },
              {
                q: "How many images can I convert at once?",
                a: "You can upload and convert as many images as you need in a single PDF. Each image can be up to 10MB."
              },
              {
                q: "Are my files safe and private?",
                a: "Absolutely. Files are processed locally in your browser, and your generated download link is automatically revoked after 1 hour for added privacy."
              },
              {
                q: "What image formats are supported?",
                a: "We support JPG, JPEG, PNG, WebP, AVIF, and most common image formats. Non-standard formats are automatically converted to ensure compatibility."
              },
              {
                q: "Can I change the order of images in the PDF?",
                a: "Yes! Simply drag and drop the images in the preview section to arrange them in your preferred order."
              },
              {
                q: "Do I need to create an account?",
                a: "No account required! You can use our JPG to PDF converter immediately without any registration or email."
              }
            ].map((faq, index) => (
              <div key={index} className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-medium text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 PDfree.tools - Free PDF Tools for Everyone
            </p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</a>
              <a href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms of Service</a>
              <a href="/contact" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JpgToPdf;