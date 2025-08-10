import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

/**
 * Centralized PDF file selection state for PDfree.tools
 * - Supports single-file and multi-file tools
 * - Enforces PDF-only and size limits
 * - Exposes ergonomic setters and validators
 */

// ===== Types =====
export type FileId = string

export type PdfItem = {
  id: FileId
  file: File
  name: string
  size: number // bytes
  type: string
  lastModified: number
}

export type UseFilesMode = 'single' | 'multiple'

export type Limits = {
  /** Maximum allowed bytes per file (default: 100MB) */
  maxPerFileBytes: number
  /** Maximum allowed bytes across all files for multi-file tools (default: 500MB) */
  maxTotalBytes: number
}

export type ValidationIssue = {
  fileName?: string
  code:
    | 'not_pdf'
    | 'too_large'
    | 'total_too_large'
    | 'empty'
    | 'duplicate'
    | 'unknown'
  message: string
}

export type ValidationResult = {
  ok: boolean
  issues: ValidationIssue[]
}

export type UseFilesState = {
  mode: UseFilesMode
  items: PdfItem[]
  limits: Limits
  lastIssues: ValidationIssue[]
}

export type UseFilesActions = {
  /** Replace entire selection with one file (validates). */
  setSingleFile: (file: File | null) => ValidationResult
  /** Replace entire selection with a list (validates). */
  setFiles: (files: File[]) => ValidationResult
  /** Add files to current list (validates). */
  addFiles: (files: File[]) => ValidationResult
  /** Remove by id. */
  removeFile: (id: FileId) => void
  /** Clear selection. */
  clear: () => void
  /** Reorder within list (drag & drop helpers). */
  moveItem: (fromIndex: number, toIndex: number) => void
  /** Set explicit ordering by ids. */
  setOrder: (ids: FileId[]) => void
  /** Update limits at runtime. */
  setLimits: (limits: Partial<Limits>) => void
}

export type UseFilesValue = UseFilesState & UseFilesActions

// ===== Defaults & helpers =====
const DEFAULT_LIMITS: Limits = {
  maxPerFileBytes: 100 * 1024 * 1024, // 100MB
  maxTotalBytes: 500 * 1024 * 1024, // 500MB
}

const isPdf = (f: File) => {
  const typeOk = f.type?.toLowerCase().includes('pdf')
  const extOk = /\.pdf$/i.test(f.name)
  return typeOk || extOk
}

const toItem = (f: File): PdfItem => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
  file: f,
  name: f.name,
  size: f.size,
  type: f.type,
  lastModified: f.lastModified,
})

const bytes = (mb: number) => Math.round(mb * 1024 * 1024)
export const humanBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let u = -1
  let v = n
  do {
    v /= 1024
    u++
  } while (v >= 1024 && u < units.length - 1)
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`
}

// ===== Context =====
const FilesCtx = createContext<UseFilesValue | null>(null)

export type UseFilesProviderProps = {
  children: React.ReactNode
  /** Single or multiple selection mode (can be changed later with setFiles / setSingleFile). */
  initialMode?: UseFilesMode
  /** Override size limits in bytes or via convenience MB props. */
  limits?: Partial<Limits> & { maxPerFileMB?: number; maxTotalMB?: number }
}

export function UseFilesProvider({ children, initialMode = 'single', limits }: UseFilesProviderProps) {
  const [mode, setMode] = useState<UseFilesMode>(initialMode)
  const [items, setItems] = useState<PdfItem[]>([])
  const limitsRef = useRef<Limits>({
    ...DEFAULT_LIMITS,
    ...(limits?.maxPerFileMB ? { maxPerFileBytes: bytes(limits.maxPerFileMB) } : {}),
    ...(limits?.maxTotalMB ? { maxTotalBytes: bytes(limits.maxTotalMB) } : {}),
    ...(limits || {}),
  })
  const [lastIssues, setLastIssues] = useState<ValidationIssue[]>([])

  const validate = useCallback(
    (incoming: File[], replacing: boolean): ValidationResult => {
      const issues: ValidationIssue[] = []
      if (!incoming || incoming.length === 0) {
        issues.push({ code: 'empty', message: 'No files selected.' })
        return { ok: false, issues }
      }

      // Enforce PDF-only and per-file size
      for (const f of incoming) {
        if (!isPdf(f)) {
          issues.push({ fileName: f.name, code: 'not_pdf', message: 'Only PDF files are supported.' })
          continue
        }
        if (f.size > limitsRef.current.maxPerFileBytes) {
          issues.push({
            fileName: f.name,
            code: 'too_large',
            message: `File exceeds ${humanBytes(limitsRef.current.maxPerFileBytes)}.`,
          })
        }
      }

      // Prevent duplicates by name+size (basic heuristic)
      const existing = replacing ? [] : items
      const dupeMap = new Set(existing.map((i) => `${i.name}:${i.size}`))
      for (const f of incoming) {
        const key = `${f.name}:${f.size}`
        if (dupeMap.has(key)) {
          issues.push({ fileName: f.name, code: 'duplicate', message: 'Already added.' })
        }
      }

      // Total size (only matters in multiple mode)
      const totalIncoming = incoming.reduce((a, f) => a + f.size, 0)
      const currentTotal = existing.reduce((a, i) => a + i.size, 0)
      const nextTotal = (mode === 'single' ? totalIncoming : currentTotal + totalIncoming)
      if (mode === 'multiple' && nextTotal > limitsRef.current.maxTotalBytes) {
        issues.push({
          code: 'total_too_large',
          message: `Combined size exceeds ${humanBytes(limitsRef.current.maxTotalBytes)}.`,
        })
      }

      return { ok: issues.length === 0, issues }
    },
    [items, mode]
  )

  const setSingleFile = useCallback<UseFilesActions['setSingleFile']>((file) => {
    if (file === null) {
      setItems([])
      setMode('single')
      const result = { ok: true, issues: [] as ValidationIssue[] }
      setLastIssues(result.issues)
      return result
    }
    const result = validate([file], true)
    if (result.ok) {
      setMode('single')
      setItems([toItem(file)])
    }
    setLastIssues(result.issues)
    return result
  }, [validate])

  const setFiles = useCallback<UseFilesActions['setFiles']>((files) => {
    const result = validate(files, true)
    if (result.ok) {
      setMode(files.length > 1 ? 'multiple' : 'single')
      setItems(files.map(toItem))
    }
    setLastIssues(result.issues)
    return result
  }, [validate])

  const addFiles = useCallback<UseFilesActions['addFiles']>((files) => {
    // If currently single mode but multiple files are added, switch to multiple.
    if (mode === 'single' && files.length > 0) {
      // Treat as replacing if there is an existing single item and we are adding more than one
      // We still validate as append to catch total size in multiple mode
    }
    const result = validate(files, false)
    if (result.ok) {
      setMode((prev) => (prev === 'single' && (items.length + files.length) > 1 ? 'multiple' : prev))
      setItems((prev) => [...prev, ...files.map(toItem)])
    }
    setLastIssues(result.issues)
    return result
  }, [items.length, mode, validate])

  const removeFile = useCallback<UseFilesActions['removeFile']>((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setLastIssues([])
  }, [])

  const moveItem = useCallback<UseFilesActions['moveItem']>((from, to) => {
    setItems((prev) => {
      const next = prev.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const setOrder = useCallback<UseFilesActions['setOrder']>((ids) => {
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]))
      const ordered: PdfItem[] = []
      ids.forEach((id) => {
        const it = map.get(id)
        if (it) ordered.push(it)
      })
      // keep any remaining (just in case) at the end
      prev.forEach((i) => { if (!ids.includes(i.id)) ordered.push(i) })
      return ordered
    })
  }, [])

  const setLimits = useCallback<UseFilesActions['setLimits']>((partial) => {
    limitsRef.current = { ...limitsRef.current, ...partial }
  }, [])

  const value: UseFilesValue = useMemo(() => ({
    mode,
    items,
    limits: limitsRef.current,
    lastIssues,
    setSingleFile,
    setFiles,
    addFiles,
    removeFile,
    clear,
    moveItem,
    setOrder,
    setLimits,
  }), [mode, items, lastIssues, setSingleFile, setFiles, addFiles, removeFile, clear, moveItem, setOrder, setLimits])

  return <FilesCtx.Provider value={value}>{children}</FilesCtx.Provider>
}

export function useFiles(): UseFilesValue {
  const ctx = useContext(FilesCtx)
  if (!ctx) throw new Error('useFiles must be used within <UseFilesProvider>')
  return ctx
}

// ===== Optional: drop helpers (nice for Dropzone components) =====
export type DropResult = {
  accepted: File[]
  rejected: { file: File; issues: ValidationIssue[] }[]
}

/**
 * Lightweight, synchronous prefilter for drag/drop handlers before calling addFiles/setFiles.
 * This does not check total size (because you may choose setFiles vs addFiles),
 * but it filters clearly-invalid non-PDF or per-file-too-large files.
 */
export function prefilterDroppedFiles(list: FileList | File[], limits?: Partial<Limits>): DropResult {
  const lim: Limits = { ...DEFAULT_LIMITS, ...limits }
  const files = Array.from(list)
  const accepted: File[] = []
  const rejected: DropResult['rejected'] = []
  for (const f of files) {
    const issues: ValidationIssue[] = []
    if (!isPdf(f)) issues.push({ code: 'not_pdf', message: 'Only PDF files are supported.' })
    if (f.size > lim.maxPerFileBytes) issues.push({ code: 'too_large', message: `File exceeds ${humanBytes(lim.maxPerFileBytes)}.` })
    if (issues.length === 0) accepted.push(f)
    else rejected.push({ file: f, issues })
  }
  return { accepted, rejected }
}

// ===== Convenience selectors =====
export const selectors = {
  totalSize: (items: PdfItem[]) => items.reduce((a, i) => a + i.size, 0),
  isEmpty: (items: PdfItem[]) => items.length === 0,
  single: (items: PdfItem[]) => (items.length > 0 ? items[0] : null),
}
