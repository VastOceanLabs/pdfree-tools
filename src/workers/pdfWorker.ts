// src/workers/pdfWorker.ts - FIXED VERSION
// PDF processing Web Worker with critical bugs resolved

/// <reference lib="webworker" />
export {};

declare const self: DedicatedWorkerGlobalScope;

import { PDFDocument, degrees } from 'pdf-lib';

// FIXED: Remove unimplemented operations from type union
type Operation =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'compress'
  | 'jpgToPdf'
  // TODO: Add back when implemented
  // | 'protect'    // Requires server-side qpdf/MuPDF
  // | 'pdfToJpg'  // Requires pdfjs-dist implementation
  ;

export interface WorkerMessage {
  id: string;
  type: Operation;
  files: ArrayBuffer[];
  options?: {
    // Split options
    pageRanges?: string;
    
    // Rotate options  
    rotation?: 90 | 180 | 270;
    pages?: number[]; // empty/undefined = all pages
    
    // Compression options (metadata only for now)
    quality?: number; // Reserved for future image compression
    
    // Image conversion options
    imageQuality?: number;
    outputFormat?: 'jpeg' | 'png';
  };
}

// FIXED: Clear discriminated union for responses
export type WorkerResponse =
  | { id: string; status: 'progress'; progress: number; message?: string }
  | { id: string; status: 'done'; result: ArrayBuffer | ArrayBuffer[] }
  | { id: string; status: 'error'; error: string };

// FIXED: Memory limit to prevent OOM
const MAX_CLIENT_FILE_SIZE = 50 * 1024 * 1024; // 50MB client-side limit

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, files, options } = event.data;
  
  try {
    // FIXED: Memory guard - reject huge files client-side
    const totalSize = files.reduce((sum, file) => sum + file.byteLength, 0);
    if (totalSize > MAX_CLIENT_FILE_SIZE) {
      throw new Error(`Files too large for client processing (${Math.round(totalSize / 1024 / 1024)}MB). Using server processing...`);
    }

    let result: ArrayBuffer | ArrayBuffer[];
    
    switch (type) {
      case 'merge':
        result = await mergePdfs(files, id);
        break;
      case 'split':
        result = await splitPdf(files[0], options?.pageRanges || '1', id);
        break;
      case 'rotate':
        result = await rotatePdf(files[0], options?.rotation || 90, options?.pages, id);
        break;
      case 'compress':
        result = await compressPdf(files[0], id);
        break;
      case 'jpgToPdf':
        result = await jpgToPdf(files, options?.imageQuality || 0.9, id);
        break;
      default:
        throw new Error(`Unknown operation: ${type satisfies never}`);
    }
    
    // FIXED: Use transferables to avoid copying large buffers
    const transferList: ArrayBuffer[] = Array.isArray(result) ? result : [result];
    
    self.postMessage({
      id,
      status: 'done',
      result
    } satisfies WorkerResponse, transferList);
    
  } catch (error) {
    self.postMessage({
      id,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } satisfies WorkerResponse);
  }
};

// MERGE PDFs
async function mergePdfs(files: ArrayBuffer[], jobId: string): Promise<ArrayBuffer> {
  const mergedPdf = await PDFDocument.create();
  const totalFiles = files.length;
  
  for (let i = 0; i < files.length; i++) {
    try {
      const pdf = await PDFDocument.load(files[i]);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      
      pages.forEach((page) => mergedPdf.addPage(page));
      
      // FIXED: Clear progress reporting
      const progress = Math.round(((i + 1) / totalFiles) * 90);
      self.postMessage({
        id: jobId,
        status: 'progress',
        progress,
        message: `Merging file ${i + 1} of ${totalFiles}...`
      } satisfies WorkerResponse);
      
    } catch (error) {
      throw new Error(`Failed to process file ${i + 1}: ${error instanceof Error ? error.message : 'Invalid PDF'}`);
    }
  }
  
  // Final save
  self.postMessage({
    id: jobId,
    status: 'progress',
    progress: 95,
    message: 'Finalizing merged PDF...'
  } satisfies WorkerResponse);
  
  const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
  
  // FIXED: Proper buffer transfer
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return buffer;
}

// SPLIT PDF
async function splitPdf(file: ArrayBuffer, pageRanges: string, jobId: string): Promise<ArrayBuffer[]> {
  const pdf = await PDFDocument.load(file);
  const totalPages = pdf.getPageCount();
  
  // FIXED: Validate page ranges and provide helpful errors
  const ranges = parsePageRanges(pageRanges, totalPages);
  if (ranges.length === 0) {
    throw new Error(`Invalid page range: "${pageRanges}". Use format like "1-3,5,7-9" or "1,2,3"`);
  }
  
  const results: ArrayBuffer[] = [];
  
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const newPdf = await PDFDocument.create();
    
    for (const pageNum of range) {
      const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
      newPdf.addPage(copiedPage);
    }
    
    const pdfBytes = await newPdf.save({ useObjectStreams: true });
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    results.push(buffer);
    
    // Progress reporting
    const progress = Math.round(((i + 1) / ranges.length) * 100);
    self.postMessage({
      id: jobId,
      status: 'progress',
      progress,
      message: `Created ${i + 1} of ${ranges.length} PDF files...`
    } satisfies WorkerResponse);
  }
  
  return results;
}

// ROTATE PDF - FIXED
async function rotatePdf(file: ArrayBuffer, rotation: number, targetPages?: number[], jobId: string): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.load(file);
  const pages = pdf.getPages();
  
  // FIXED: Handle empty arrays properly
  const pagesToRotate = !targetPages || targetPages.length === 0
    ? pages.map((_, i) => i + 1)  // All pages
    : targetPages;
  
  // Validate page numbers
  const invalidPages = pagesToRotate.filter(p => p < 1 || p > pages.length);
  if (invalidPages.length > 0) {
    throw new Error(`Invalid page numbers: ${invalidPages.join(', ')}. Document has ${pages.length} pages.`);
  }
  
  for (let i = 0; i < pagesToRotate.length; i++) {
    const pageIndex = pagesToRotate[i] - 1;
    pages[pageIndex].setRotation(degrees(rotation));
    
    // FIXED: Avoid divide by zero
    const progress = pagesToRotate.length > 0 
      ? Math.round(((i + 1) / pagesToRotate.length) * 100)
      : 100;
      
    self.postMessage({
      id: jobId,
      status: 'progress',
      progress,
      message: `Rotating page ${i + 1} of ${pagesToRotate.length}...`
    } satisfies WorkerResponse);
  }
  
  const pdfBytes = await pdf.save({ useObjectStreams: true });
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return buffer;
}

// COMPRESS PDF - FIXED (honest about limitations)
async function compressPdf(file: ArrayBuffer, jobId: string): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.load(file);
  
  self.postMessage({
    id: jobId,
    status: 'progress',
    progress: 25,
    message: 'Optimizing PDF structure...'
  } satisfies WorkerResponse);
  
  // Remove metadata to reduce size
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setCreator('PDfree.tools');
  pdf.setProducer('PDfree.tools');
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());
  
  self.postMessage({
    id: jobId,
    status: 'progress', 
    progress: 75,
    message: 'Compressing PDF structure...'
  } satisfies WorkerResponse);
  
  // NOTE: This is basic compression only (metadata + structure optimization)
  // Real image compression would require additional WASM libraries
  const pdfBytes = await pdf.save({
    useObjectStreams: true, // Compress content streams
    addDefaultPage: false,
  });
  
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return buffer;
}

// JPG TO PDF
async function jpgToPdf(files: ArrayBuffer[], quality: number, jobId: string): Promise<ArrayBuffer> {
  const pdf = await PDFDocument.create();
  
  for (let i = 0; i < files.length; i++) {
    const imageBytes = files[i];
    
    try {
      let image;
      // Try JPEG first, then PNG
      try {
        image = await pdf.embedJpg(imageBytes);
      } catch {
        image = await pdf.embedPng(imageBytes);
      }
      
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
      
    } catch (error) {
      throw new Error(`Failed to process image ${i + 1}: Invalid image format or corrupted file`);
    }
    
    // Progress reporting
    const progress = Math.round(((i + 1) / files.length) * 90);
    self.postMessage({
      id: jobId,
      status: 'progress',
      progress,
      message: `Converting image ${i + 1} of ${files.length}...`
    } satisfies WorkerResponse);
  }
  
  const pdfBytes = await pdf.save({ useObjectStreams: true });
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return buffer;
}

// UTILITY FUNCTIONS

// FIXED: Better error handling for page ranges
function parsePageRanges(ranges: string, totalPages: number): number[][] {
  if (!ranges || typeof ranges !== 'string') {
    throw new Error('Page range must be a string like "1-3,5,7-9"');
  }
  
  const result: number[][] = [];
  const parts = ranges.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  if (parts.length === 0) {
    throw new Error('Empty page range provided');
  }
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(n => n.trim());
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid page range: "${part}". Use numbers only.`);
      }
      
      if (start < 1 || end > totalPages || start > end) {
        throw new Error(`Invalid page range: "${part}". Document has ${totalPages} pages.`);
      }
      
      const range: number[] = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      result.push(range);
      
    } else {
      const pageNum = parseInt(part);
      if (isNaN(pageNum)) {
        throw new Error(`Invalid page number: "${part}". Use numbers only.`);
      }
      
      if (pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Invalid page number: ${pageNum}. Document has ${totalPages} pages.`);
      }
      
      result.push([pageNum]);
    }
  }
  
  return result;
}

// FIXED: Remove unused beforeunload listener
// Workers don't emit beforeunload events

// Export for external cancellation support (future enhancement)
export function cancelOperation(jobId: string) {
  // Future: Implement operation cancellation
  self.postMessage({
    id: jobId,
    status: 'error',
    error: 'Operation cancelled by user'
  } satisfies WorkerResponse);
}