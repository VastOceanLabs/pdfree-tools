import { PDFDocument } from 'pdf-lib';

// Supported image formats for validation
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp'
] as const;

type SupportedMime = typeof SUPPORTED_IMAGE_FORMATS[number];

const isSupported = (type: string): type is SupportedMime =>
  (SUPPORTED_IMAGE_FORMATS as readonly string[]).includes(type);

// Maximum file size for individual images (10MB)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Maximum total images that can be processed at once
export const MAX_IMAGES_COUNT = 50;

// Image dimensions for PDF page sizing
export const PDF_PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
  A3: { width: 842, height: 1191 },
  A5: { width: 420, height: 595 }
} as const;

export type PageSize = keyof typeof PDF_PAGE_SIZES;
export type ImageFile = File & { order?: number };

export interface ImageToPdfOptions {
  pageSize?: PageSize;
  margin?: number;
  fitToPage?: boolean;
  maintainAspectRatio?: boolean;
  imagesPerPage?: number;
}

export interface ConversionProgress {
  stage: 'validating' | 'processing' | 'creating_pdf' | 'complete';
  currentImage: number;
  totalImages: number;
  message: string;
  percentage: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validFiles: ImageFile[];
}

/**
 * Validates uploaded image files for PDF conversion
 */
export function validateImageFiles(files: File[]): ValidationResult {
  const errors: string[] = [];
  const validFiles: ImageFile[] = [];

  // Check if any files provided
  if (!files || files.length === 0) {
    errors.push('Please select at least one image file');
    return { isValid: false, errors, validFiles };
  }

  // Check maximum count
  if (files.length > MAX_IMAGES_COUNT) {
    errors.push(`Maximum ${MAX_IMAGES_COUNT} images allowed. You selected ${files.length}.`);
    return { isValid: false, errors, validFiles };
  }

  files.forEach((file, index) => {
    // Validate file type
    if (!isSupported(file.type)) {
      errors.push(`File "${file.name}": Unsupported format. Supported: JPEG, PNG, GIF, BMP, WebP`);
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      errors.push(`File "${file.name}": Too large (${sizeMB}MB). Maximum 10MB per image.`);
      return;
    }

    // Validate file is not corrupted (basic check)
    if (file.size === 0) {
      errors.push(`File "${file.name}": File appears to be empty or corrupted`);
      return;
    }

    // Add to valid files with order
    const imageFile = file as ImageFile;
    imageFile.order = index;
    validFiles.push(imageFile);
  });

  return {
    isValid: errors.length === 0,
    errors,
    validFiles
  };
}

/**
 * Reads an image file and returns ArrayBuffer for PDF-lib processing
 */
async function readImageFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result);
      } else {
        reject(new Error(`Failed to read image file: ${file.name}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Error reading file: ${file.name}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Gets actual image dimensions from the file
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image dimensions for: ${file.name}`));
    };
    
    img.src = url;
  });
}

/**
 * Calculates optimal image size for PDF page with aspect ratio preservation
 */
function calculateImageSize(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  maintainAspectRatio: boolean
): { width: number; height: number; x: number; y: number } {
  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 2);

  if (!maintainAspectRatio) {
    return {
      width: availableWidth,
      height: availableHeight,
      x: margin,
      y: margin
    };
  }

  // Calculate scaling factors
  const scaleX = availableWidth / imageWidth;
  const scaleY = availableHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  // Center the image on the page
  const x = (pageWidth - scaledWidth) / 2;
  const y = (pageHeight - scaledHeight) / 2;

  return {
    width: scaledWidth,
    height: scaledHeight,
    x,
    y
  };
}

/**
 * Sorts images by their order property or filename
 */
function sortImagesByOrder(images: ImageFile[]): ImageFile[] {
  return [...images].sort((a, b) => {
    // If order is explicitly set, use it
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    
    // Otherwise sort by filename
    return a.name.localeCompare(b.name, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
}

/**
 * Main function to convert images to PDF
 */
export async function convertImagesToPdf(
  files: ImageFile[],
  options: ImageToPdfOptions = {},
  onProgress?: (progress: ConversionProgress) => void
): Promise<Uint8Array> {
  const {
    pageSize: pageSizeKey = 'A4',
    margin = 50,
    fitToPage = true,
    maintainAspectRatio = true,
    imagesPerPage = 1
  } = options;

  // Validate files first
  const validation = validateImageFiles(files);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const validFiles = validation.validFiles;
  const totalImages = validFiles.length;

  // Sort images by order
  const sortedFiles = sortImagesByOrder(validFiles);

  // Report validation complete
  onProgress?.({
    stage: 'validating',
    currentImage: 0,
    totalImages,
    message: 'Files validated successfully',
    percentage: 10
  });

  try {
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const pageDims = PDF_PAGE_SIZES[pageSizeKey];

    onProgress?.({
      stage: 'processing',
      currentImage: 0,
      totalImages,
      message: 'Starting image processing...',
      percentage: 15
    });

    // Process images in batches based on imagesPerPage
    for (let i = 0; i < sortedFiles.length; i += imagesPerPage) {
      const batch = sortedFiles.slice(i, i + imagesPerPage);
      const page = pdfDoc.addPage([pageDims.width, pageDims.height]);
      
      // Calculate layout for multiple images per page
      const imagesInBatch = batch.length;
      const rows = Math.ceil(Math.sqrt(imagesInBatch));
      const cols = Math.ceil(imagesInBatch / rows);
      
      const cellWidth = (pageDims.width - margin * (cols + 1)) / cols;
      const cellHeight = (pageDims.height - margin * (rows + 1)) / rows;

      for (let j = 0; j < batch.length; j++) {
        const file = batch[j];
        const currentImageIndex = i + j + 1;

        onProgress?.({
          stage: 'processing',
          currentImage: currentImageIndex,
          totalImages,
          message: `Processing ${file.name}...`,
          percentage: 15 + (currentImageIndex / totalImages) * 60
        });

        try {
          // Read image file
          const imageBytes = await readImageFile(file);
          
          // Get image dimensions for aspect ratio calculation
          const imageDimensions = await getImageDimensions(file);
          
          // Embed image in PDF based on format
          let image;
          if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            // For other formats, convert to PNG first (browser handles this)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = URL.createObjectURL(file);
            });
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            const pngBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob(resolve, 'image/png');
            });
            
            if (!pngBlob) {
              throw new Error('canvas.toBlob() returned null');
            }
            
            const pngBytes = await pngBlob.arrayBuffer();
            image = await pdfDoc.embedPng(pngBytes);
            URL.revokeObjectURL(img.src);
          }

          // Calculate position for multiple images per page
          let targetWidth, targetHeight, x, y;
          
          if (imagesPerPage === 1) {
            // Single image per page - respect fitToPage option
            if (fitToPage) {
              const size = calculateImageSize(
                imageDimensions.width,
                imageDimensions.height,
                pageDims.width,
                pageDims.height,
                margin,
                maintainAspectRatio
              );
              ({ width: targetWidth, height: targetHeight, x, y } = size);
            } else {
              // Use native size (converted to points) - 72 DPI assumption
              targetWidth = imageDimensions.width * 0.75; // 96 DPI to 72 DPI
              targetHeight = imageDimensions.height * 0.75;
              x = (pageDims.width - targetWidth) / 2;
              y = (pageDims.height - targetHeight) / 2;
              
              // Ensure image fits on page even when not fitting to page
              if (targetWidth > pageDims.width - margin * 2 || targetHeight > pageDims.height - margin * 2) {
                const size = calculateImageSize(
                  imageDimensions.width,
                  imageDimensions.height,
                  pageDims.width,
                  pageDims.height,
                  margin,
                  true
                );
                ({ width: targetWidth, height: targetHeight, x, y } = size);
              }
            }
          } else {
            // Multiple images per page - fit in grid
            const row = Math.floor(j / cols);
            const col = j % cols;
            
            // Fixed Y calculation for pdf-lib's bottom-left origin
            const cellX = margin + col * (cellWidth + margin);
            const cellY = pageDims.height - margin - (row + 1) * cellHeight - row * margin;
            
            if (fitToPage && maintainAspectRatio) {
              const size = calculateImageSize(
                imageDimensions.width,
                imageDimensions.height,
                cellWidth,
                cellHeight,
                0,
                true
              );
              targetWidth = size.width;
              targetHeight = size.height;
              // Center in cell
              x = cellX + (cellWidth - targetWidth) / 2;
              y = cellY + (cellHeight - targetHeight) / 2;
            } else {
              targetWidth = cellWidth;
              targetHeight = cellHeight;
              x = cellX;
              y = cellY;
            }
          }

          // Draw image on page
          page.drawImage(image, {
            x,
            y,
            width: targetWidth,
            height: targetHeight,
          });

        } catch (err) {
          console.error(`Error processing image ${file.name}:`, err);
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed to process image "${file.name}": ${msg}`);
        }
      }
    }

    onProgress?.({
      stage: 'creating_pdf',
      currentImage: totalImages,
      totalImages,
      message: 'Finalizing PDF document...',
      percentage: 85
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    onProgress?.({
      stage: 'complete',
      currentImage: totalImages,
      totalImages,
      message: 'PDF created successfully!',
      percentage: 100
    });

    return pdfBytes;

  } catch (err) {
    console.error('Error converting images to PDF:', err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF conversion failed: ${msg}`);
  }
}

/**
 * Reorders images based on new order array
 */
export function reorderImages(images: ImageFile[], newOrder: number[]): ImageFile[] {
  if (newOrder.length !== images.length) {
    throw new Error('New order array must have same length as images array');
  }

  return newOrder.map((index, newIndex) => {
    const image = images[index];
    return { ...image, order: newIndex };
  });
}

/**
 * Estimates the output PDF file size based on input images
 */
export function estimatePdfSize(images: ImageFile[], options: ImageToPdfOptions = {}): number {
  const { imagesPerPage = 1 } = options;
  
  // Rough estimation: PDF overhead + compressed images
  const baseOverhead = 50000; // ~50KB base PDF structure
  const pageOverhead = 1000; // ~1KB per page
  const pages = Math.ceil(images.length / imagesPerPage);
  
  // Estimate compression (images are typically compressed in PDF)
  const totalImageSize = images.reduce((sum, img) => sum + img.size, 0);
  const compressionRatio = 0.8; // Assume 20% compression
  
  return baseOverhead + (pages * pageOverhead) + (totalImageSize * compressionRatio);
}