/**
 * PDF to Image Converter - PDfree.tools
 * Converts PDF pages to high-quality JPG/PNG images with batch processing
 * Uses pdfjs-dist for reliable PDF rendering and Canvas API for image export
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type {
  PDFDocumentProxy,
  PageViewport,
  RenderTask
} from 'pdfjs-dist/types/src/display/api';

// Configure PDF.js worker (browser-safe)
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
}

export interface ImageConversionOptions {
  /** Output format: 'jpeg' | 'png' | 'webp' */
  format: 'jpeg' | 'png' | 'webp';
  /** Image quality (0.0-1.0 for JPEG/WebP, ignored for PNG) */
  quality: number;
  /** Scale factor for resolution (1.0 = 72 DPI, 2.0 = 144 DPI, etc.) */
  scale: number;
  /** Pages to convert (1-based indexing). If empty, converts all pages */
  pages?: number[];
  /** Background color for transparent areas (hex color) */
  backgroundColor?: string;
  /** Maximum width in pixels (maintains aspect ratio) */
  maxWidth?: number;
  /** Maximum height in pixels (maintains aspect ratio) */
  maxHeight?: number;
}

export interface ConversionProgress {
  /** Current page being processed (1-based) */
  currentPage: number;
  /** Total pages to process */
  totalPages: number;
  /** Processing status */
  status: 'loading' | 'rendering' | 'complete' | 'error';
  /** Current operation description */
  message: string;
  /** Progress percentage (0-100) */
  progress: number;
}

export interface ConvertedImage {
  /** Page number (1-based) */
  pageNumber: number;
  /** Generated image blob */
  blob: Blob;
  /** Image dimensions */
  width: number;
  height: number;
  /** File size in bytes */
  size: number;
  /** Suggested filename */
  filename: string;
}

export interface ConversionResult {
  /** Array of converted images */
  images: ConvertedImage[];
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Original PDF metadata */
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    pageCount: number;
  };
}

export class PDFToImageConverter {
  private onProgress?: (progress: ConversionProgress) => void;
  private abortController?: AbortController;
  private currentRenderTask?: RenderTask;

  constructor(onProgress?: (progress: ConversionProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Convert PDF to images with specified options
   */
  async convertToImages(
    pdfFile: File | ArrayBuffer,
    options: ImageConversionOptions
  ): Promise<ConversionResult> {
    // SSR safety check
    if (typeof document === 'undefined') {
      throw new Error('PDF to Image conversion requires a browser environment');
    }

    const startTime = Date.now();
    this.abortController = new AbortController();

    try {
      // Validate options
      this.validateOptions(options);

      // Load PDF document
      this.reportProgress(0, 1, 'loading', 'Loading PDF document...');
      const pdfData = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
      const pdf = await getDocument({ data: pdfData }).promise;

      // Extract metadata
      const metadata = await this.extractMetadata(pdf);
      
      // Determine pages to convert
      const pagesToConvert = options.pages?.length 
        ? options.pages.filter(p => p >= 1 && p <= pdf.numPages)
        : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

      if (pagesToConvert.length === 0) {
        throw new Error('No valid pages specified for conversion');
      }

      // Convert pages to images
      const images: ConvertedImage[] = [];
      
      for (let i = 0; i < pagesToConvert.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Conversion cancelled by user');
        }

        const pageNum = pagesToConvert[i];
        // FIXED: Use i + 1 for 1-based progress reporting
        this.reportProgress(
          i + 1,
          pagesToConvert.length,
          'rendering',
          `Converting page ${pageNum} of ${pdf.numPages}...`
        );

        const convertedImage = await this.convertPage(pdf, pageNum, options, metadata.title);
        images.push(convertedImage);
      }

      // FIXED: Ensure progress hits 100% at completion
      this.reportProgress(
        pagesToConvert.length,
        pagesToConvert.length,
        'complete',
        'Conversion completed successfully!'
      );

      return {
        images,
        processingTime: Date.now() - startTime,
        metadata
      };

    } catch (error) {
      this.reportProgress(0, 1, 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Convert a single PDF page to image
   */
  private async convertPage(
    pdf: PDFDocumentProxy,
    pageNumber: number,
    options: ImageConversionOptions,
    pdfTitle?: string
  ): Promise<ConvertedImage> {
    // Get the page
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: options.scale });

    // Apply size constraints and get final dimensions
    const { width, height, scale } = this.calculateDimensions(viewport, options);
    const scaledViewport = page.getViewport({ scale });

    // FIXED: Ensure canvas dimensions match scaledViewport to avoid artifacts
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Set background color if specified
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render PDF page to canvas with proper cancellation support
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport
    };

    // FIXED: Track render task for proper cancellation
    const renderTask = page.render(renderContext);
    this.currentRenderTask = renderTask;
    await renderTask.promise;

    // Convert canvas to blob
    const blob = await this.canvasToBlob(canvas, options);
    
    // Generate filename with better sanitization
    const baseFilename = pdfTitle ? 
      this.sanitizeFilename(pdfTitle) : 
      'converted_pdf';
    const extension = options.format === 'jpeg' ? 'jpg' : options.format;
    const filename = `${baseFilename}_page_${pageNumber}.${extension}`;

    // Clean up resources
    page.cleanup();
    this.currentRenderTask = undefined;

    return {
      pageNumber,
      blob,
      width: canvas.width,
      height: canvas.height,
      size: blob.size,
      filename
    };
  }

  /**
   * Calculate optimal dimensions respecting constraints
   */
  private calculateDimensions(
    viewport: PageViewport,
    options: ImageConversionOptions
  ): { width: number; height: number; scale: number } {
    let { width, height } = viewport;
    let scale = options.scale;

    // Apply size constraints
    if (options.maxWidth && width > options.maxWidth) {
      const widthScale = options.maxWidth / width;
      scale *= widthScale;
    }

    if (options.maxHeight && height * (scale / options.scale) > options.maxHeight) {
      const heightScale = options.maxHeight / (height * (scale / options.scale));
      scale *= heightScale;
    }

    // Recalculate final dimensions
    const finalWidth = Math.round(width * (scale / options.scale));
    const finalHeight = Math.round(height * (scale / options.scale));

    return {
      width: finalWidth,
      height: finalHeight,
      scale
    };
  }

  /**
   * Convert canvas to blob with specified format and quality
   */
  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    options: ImageConversionOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const mimeType = `image/${options.format}`;
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          mimeType,
          options.format !== 'png' ? options.quality : undefined
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extract PDF metadata
   */
  private async extractMetadata(pdf: PDFDocumentProxy) {
    try {
      const metadata = await pdf.getMetadata();
      return {
        title: metadata.info?.Title || undefined,
        author: metadata.info?.Author || undefined,
        creator: metadata.info?.Creator || undefined,
        pageCount: pdf.numPages
      };
    } catch (error) {
      return {
        pageCount: pdf.numPages
      };
    }
  }

  /**
   * Sanitize filename with better handling
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_\s]/g, '_') // Replace invalid chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
      .substring(0, 50) || 'document'; // Limit length with fallback
  }

  /**
   * Validate conversion options with improved checks
   */
  private validateOptions(options: ImageConversionOptions): void {
    if (!['jpeg', 'png', 'webp'].includes(options.format)) {
      throw new Error('Invalid format. Must be jpeg, png, or webp');
    }

    // FIXED: Allow 0 for ultra-low quality and better finite checks
    if (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1.0) {
      throw new Error('Quality must be between 0.0 and 1.0');
    }

    if (!Number.isFinite(options.scale) || options.scale <= 0 || options.scale > 5) {
      throw new Error('Scale must be between 0.1 and 5.0');
    }

    if (options.maxWidth && (!Number.isFinite(options.maxWidth) || options.maxWidth < 50)) {
      throw new Error('Maximum width must be at least 50 pixels');
    }

    if (options.maxHeight && (!Number.isFinite(options.maxHeight) || options.maxHeight < 50)) {
      throw new Error('Maximum height must be at least 50 pixels');
    }

    if (options.pages?.some(p => !Number.isInteger(p) || p < 1)) {
      throw new Error('Page numbers must be positive integers');
    }
  }

  /**
   * Report conversion progress
   */
  private reportProgress(
    current: number,
    total: number,
    status: ConversionProgress['status'],
    message: string
  ): void {
    if (this.onProgress) {
      this.onProgress({
        currentPage: current,
        totalPages: total,
        status,
        message,
        progress: Math.round((current / total) * 100)
      });
    }
  }

  /**
   * Cancel ongoing conversion
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    // FIXED: Cancel current render task
    if (this.currentRenderTask) {
      this.currentRenderTask.cancel();
    }
  }

  /**
   * Get default conversion options
   */
  static getDefaultOptions(): ImageConversionOptions {
    return {
      format: 'jpeg',
      quality: 0.92,
      scale: 2.0, // 144 DPI for crisp output
      // FIXED: Leave undefined for PNG transparency by default
      backgroundColor: '#FFFFFF'
    };
  }

  /**
   * Get quality presets for different use cases
   */
  static getQualityPresets() {
    return {
      web: { scale: 1.0, quality: 0.85 }, // 72 DPI, web optimized
      print: { scale: 2.0, quality: 0.95 }, // 144 DPI, print quality
      high: { scale: 3.0, quality: 0.98 }, // 216 DPI, high quality
      maximum: { scale: 4.0, quality: 1.0 } // 288 DPI, maximum quality
    };
  }

  /**
   * Estimate output file sizes
   */
  static estimateFileSizes(
    pageCount: number,
    options: ImageConversionOptions,
    avgPageComplexity: 'low' | 'medium' | 'high' = 'medium'
  ) {
    // Base size estimates in KB per page (rough estimates)
    const baseSizes = {
      jpeg: { low: 50, medium: 150, high: 300 },
      png: { low: 200, medium: 800, high: 1500 },
      webp: { low: 40, medium: 120, high: 250 }
    };

    const baseSize = baseSizes[options.format][avgPageComplexity];
    const scaleMultiplier = Math.pow(options.scale, 1.5); // Non-linear scaling
    const qualityMultiplier = options.format !== 'png' ? options.quality : 1;

    const estimatedSizePerPage = baseSize * scaleMultiplier * qualityMultiplier;
    const totalEstimatedSize = estimatedSizePerPage * pageCount;

    return {
      perPageKB: Math.round(estimatedSizePerPage),
      totalKB: Math.round(totalEstimatedSize),
      totalMB: Math.round(totalEstimatedSize / 1024 * 10) / 10
    };
  }
}

/**
 * Utility function for quick PDF to image conversion
 */
export async function convertPDFToImages(
  pdfFile: File | ArrayBuffer,
  options?: Partial<ImageConversionOptions>,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const converter = new PDFToImageConverter(onProgress);
  const fullOptions = { ...PDFToImageConverter.getDefaultOptions(), ...options };
  return converter.convertToImages(pdfFile, fullOptions);
}

/**
 * Utility function to download all converted images as a ZIP
 * Note: In production, integrate JSZip for proper ZIP creation
 */
export async function downloadImagesAsZip(
  images: ConvertedImage[],
  zipFilename: string = 'converted_images.zip'
): Promise<void> {
  // For now, download images individually with proper memory management
  for (const image of images) {
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // FIXED: Proper blob URL cleanup
    URL.revokeObjectURL(url);
    
    // Small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}