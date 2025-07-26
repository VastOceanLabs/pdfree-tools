/**
 * PDfree.tools R2 Cleanup Worker
 * 
 * Cloudflare Worker that runs every 15 minutes to clean up files
 * older than 1 hour from the R2 bucket for privacy compliance.
 * 
 * Schedule: "*/15 * * * *" (every 15 minutes)
 */

interface Env {
  // R2 bucket binding
  PDF_STORAGE: R2Bucket;
  
  // Environment variables
  CLEANUP_MAX_AGE_HOURS?: string;
  CLEANUP_BATCH_SIZE?: string;
  CLEANUP_API_KEY?: string;
  LOG_LEVEL?: string;
}

interface CleanupResult {
  filesScanned: number;
  filesDeleted: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

interface FileInfo {
  key: string;
  uploaded: Date;
  size: number;
}

interface DeleteBatchResult {
  deleted: number;
  failed: { key: string; message: string }[];
}

// Constants
const DEFAULT_MAX_AGE_HOURS = 1;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_LOG_LEVEL = 'info';

export default {
  /**
   * Scheduled cleanup function - runs every 15 minutes
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] Starting R2 cleanup process (cron: ${controller.cron})`);
    
    try {
      const result = await performCleanup(env);
      
      // Log results
      const duration = Date.now() - startTime;
      console.log(`[${timestamp}] Cleanup completed in ${duration}ms:`, {
        filesScanned: result.filesScanned,
        filesDeleted: result.filesDeleted,
        errorCount: result.errors.length,
        duration
      });
      
      // Log errors if any
      if (result.errors.length > 0) {
        console.error(`[${timestamp}] Cleanup errors:`, result.errors);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${timestamp}] Cleanup failed after ${duration}ms:`, error);
      
      // Re-throw to ensure the worker reports failure
      throw error;
    }
  },

  /**
   * HTTP handler for manual cleanup triggers and health checks
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date().toISOString();
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: now,
        service: 'PDfree.tools R2 Cleanup Worker',
        uptimeMs: Date.now() // Worker process uptime
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Manual cleanup trigger
    if (url.pathname === '/cleanup') {
      // Only allow POST method
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
          error: 'Method Not Allowed',
          allowed: ['POST']
        }), {
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Allow': 'POST'
          }
        });
      }
      
      // Check API key authentication
      const apiKey = request.headers.get('x-api-key');
      if (!env.CLEANUP_API_KEY || apiKey !== env.CLEANUP_API_KEY) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Valid API key required in x-api-key header'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const startTime = Date.now();
        const result = await performCleanup(env);
        const duration = Date.now() - startTime;
        
        return new Response(JSON.stringify({
          ...result,
          duration,
          timestamp: now
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('Manual cleanup failed:', error);
        
        return new Response(JSON.stringify({
          error: 'Cleanup failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: now
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default response for unknown endpoints
    return new Response(JSON.stringify({ 
      error: 'Not Found',
      message: 'Endpoint not found',
      availableEndpoints: ['/health', '/cleanup']
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Safe environment variable parsing
 */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Main cleanup logic with proper pagination and error handling
 */
async function performCleanup(env: Env): Promise<CleanupResult> {
  const maxAgeHours = parsePositiveInt(env.CLEANUP_MAX_AGE_HOURS, DEFAULT_MAX_AGE_HOURS);
  const batchSize = parsePositiveInt(env.CLEANUP_BATCH_SIZE, DEFAULT_BATCH_SIZE);
  const logLevel = (env.LOG_LEVEL || DEFAULT_LOG_LEVEL).toLowerCase();
  
  const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  let filesScanned = 0;
  let filesDeleted = 0;
  const errors: string[] = [];
  
  console.log(`Cleaning up files older than ${maxAgeHours} hour(s) (before ${cutoffTime.toISOString()})`);
  
  try {
    let cursor: string | undefined = undefined;
    
    // Paginate through all objects in the bucket
    do {
      const listResult = await env.PDF_STORAGE.list({
        limit: 1000,
        cursor
      });
      
      cursor = listResult.cursor;
      
      // Filter files that need to be deleted
      const candidates = listResult.objects
        .filter(obj => obj.uploaded < cutoffTime)
        .map(obj => ({
          key: obj.key,
          uploaded: obj.uploaded,
          size: obj.size
        } as FileInfo));
      
      filesScanned += listResult.objects.length;
      
      if (logLevel === 'debug') {
        console.log(`Page: scanned=${listResult.objects.length}, toDelete=${candidates.length}, truncated=${listResult.truncated}`);
      }
      
      // Process candidates in batches SEQUENTIALLY to control concurrency
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const result = await deleteBatch(env.PDF_STORAGE, batch, logLevel);
        
        filesDeleted += result.deleted;
        
        // Add delete-specific errors to our error list
        if (result.failed.length > 0) {
          errors.push(...result.failed.map(f => `Failed to delete ${f.key}: ${f.message}`));
        }
      }
      
    } while (cursor); // Continue until all pages are processed
    
  } catch (error) {
    const errorMessage = `Failed to list bucket contents: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    errors.push(errorMessage);
  }
  
  return {
    filesScanned,
    filesDeleted,
    errors,
    duration: 0, // Will be set by caller
    timestamp: new Date().toISOString()
  };
}

/**
 * Delete a batch of files with accurate success/failure tracking
 */
async function deleteBatch(
  bucket: R2Bucket,
  files: FileInfo[],
  logLevel: string
): Promise<DeleteBatchResult> {
  let deleted = 0;
  const failed: { key: string; message: string }[] = [];
  
  // Process deletions concurrently within the batch
  await Promise.all(files.map(async (file) => {
    try {
      await bucket.delete(file.key);
      deleted++;
      
      if (logLevel === 'debug') {
        console.log(`Deleted: ${file.key} (uploaded: ${file.uploaded.toISOString()}, size: ${formatBytes(file.size)})`);
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete ${file.key}: ${message}`);
      failed.push({ key: file.key, message });
    }
  }));
  
  return { deleted, failed };
}

/**
 * Utility function to format file size for logging
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Export types for external use
 */
export type { CleanupResult, FileInfo, Env, DeleteBatchResult };