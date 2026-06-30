import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import ExcelJS from 'exceljs'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

interface FileUploadProps {
  onParsed: (rows: Record<string, unknown>[], file: File, rowNumbers: number[]) => void
  onError?: (message: string) => void
}

type UploadState = 'idle' | 'loading' | 'error' | 'success'

const MAX_BYTES = 5 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUpload({ onParsed, onError }: FileUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function setError(msg: string) {
    setState('error')
    setErrorMessage(msg)
    onError?.(msg)
  }

  function reset() {
    setState('idle')
    setErrorMessage(null)
    setSelectedFile(null)
    setDragging(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFile(file: File) {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx')) {
      setError('Formato non supportato. Carica un file Excel (.xlsx)')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File troppo grande (max 5 MB)')
      return
    }

    setState('loading')
    try {
      const buffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        setError('Il file non contiene dati')
        return
      }

      const headers: string[] = []
      const rows: Record<string, unknown>[] = []
      // Numero di riga Excel reale (1-based, intestazione inclusa) per ogni riga in `rows`,
      // così il normalizer può riferire i warning alla riga visibile dall'utente.
      const rowNumbers: number[] = []

      worksheet.eachRow((row, rowNumber) => {
        // row.values è 1-indexed: indice 0 è sempre null
        const values = row.values as unknown[]
        if (rowNumber === 1) {
          for (let i = 1; i < values.length; i++) {
            const h = values[i]
            headers.push(h !== undefined && h !== null ? String(h) : '')
          }
        } else {
          const obj: Record<string, unknown> = {}
          headers.forEach((h, i) => {
            obj[h] = values[i + 1]
          })
          // Filtra righe completamente vuote
          if (
            Object.values(obj).some((v) => v !== undefined && v !== null && String(v).trim() !== '')
          ) {
            rows.push(obj)
            rowNumbers.push(rowNumber)
          }
        }
      })

      if (rows.length === 0) {
        setError('Il file non contiene dati')
        return
      }

      setSelectedFile(file)
      setState('success')
      onParsed(rows, file, rowNumbers)
    } catch {
      setError('Errore durante la lettura del file')
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const baseBoxSx = {
    border: '2px dashed',
    borderRadius: 2,
    p: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    minHeight: 200,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
  }

  if (state === 'loading') {
    return (
      <Box sx={{ ...baseBoxSx, cursor: 'default', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Lettura del file in corso…
        </Typography>
      </Box>
    )
  }

  if (state === 'error') {
    return (
      <Box
        sx={{
          ...baseBoxSx,
          cursor: 'default',
          borderColor: 'error.main',
          bgcolor: 'error.lighter',
        }}
      >
        <WarningAmberOutlinedIcon sx={{ fontSize: 40, color: 'error.main' }} />
        <Typography variant="body2" color="error.main" textAlign="center">
          {errorMessage}
        </Typography>
        <Button size="small" variant="outlined" color="error" onClick={reset}>
          Riprova
        </Button>
      </Box>
    )
  }

  if (state === 'success' && selectedFile) {
    return (
      <Box
        sx={{
          ...baseBoxSx,
          cursor: 'default',
          borderColor: 'success.main',
          bgcolor: 'success.lighter',
        }}
      >
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: 'success.main' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" fontWeight={600}>
            {selectedFile.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatSize(selectedFile.size)}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<DeleteOutlinedIcon />}
          onClick={reset}
          data-testid="file-upload-remove"
        >
          Rimuovi
        </Button>
      </Box>
    )
  }

  // idle
  return (
    <Box
      sx={{
        ...baseBoxSx,
        borderColor: dragging ? 'primary.main' : 'divider',
        bgcolor: dragging ? 'primary.lighter' : 'grey.50',
        '&:hover': { borderColor: 'primary.main' },
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      data-testid="file-upload-dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={onInputChange}
        data-testid="file-upload-input"
      />
      <UploadFileOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          Trascina il file qui{' '}
          <Typography
            component="span"
            variant="body2"
            color="primary.main"
            sx={{ fontWeight: 600 }}
          >
            o sfoglia
          </Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Formato supportato: .xlsx · Max 5 MB
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
      >
        Sfoglia
      </Button>
    </Box>
  )
}
