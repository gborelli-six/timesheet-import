import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FileUpload } from '../components/FileUpload'
import PreviewTable from '../components/PreviewTable'
import { normalize } from '../lib/timesheet/normalizer'
import type { TimesheetEntry, RowWarning } from '../lib/timesheet/types'
import { WarningType, DEFAULT_COLUMN_MAPPING } from '../lib/timesheet/types'

type ImportStep = 'upload' | 'preview'

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [warnings, setWarnings] = useState<RowWarning[]>([])
  const [formatError, setFormatError] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)

  function handleParsed(rows: Record<string, unknown>[], _file: File, rowNumbers: number[]) {
    const result = normalize(rows, DEFAULT_COLUMN_MAPPING, rowNumbers)
    if (result.warnings.some((w) => w.type === WarningType.MISSING_PERIOD)) {
      setFormatError(
        'Formato non riconosciuto. Il file deve avere le colonne: Data, Progetto, Task, Ore, Note.',
      )
      setFileKey((k) => k + 1)
      return
    }
    setFormatError(null)
    setEntries(result.entries)
    setWarnings(result.warnings)
    setStep('preview')
  }

  function handleBack() {
    setStep('upload')
    setEntries([])
    setWarnings([])
    setFormatError(null)
    setFileKey((k) => k + 1)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.6875rem',
            color: '#4068c8',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Importazione
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}
        >
          Nuova importazione
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '56ch' }}>
          {step === 'upload'
            ? 'Carica il file Excel del timesheet per avviare la procedura guidata.'
            : 'Verifica i dati importati e procedi alla selezione del backend.'}
        </Typography>
      </Box>

      {step === 'upload' && (
        <Box sx={{ maxWidth: 560 }}>
          {formatError && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="import-format-error">
              {formatError}
            </Alert>
          )}
          <FileUpload key={fileKey} onParsed={handleParsed} />
        </Box>
      )}

      {step === 'preview' && (
        <PreviewTable
          entries={entries}
          warnings={warnings}
          onBack={handleBack}
          onNext={() => {
            // TODO E8a: wizard step 3 — selezione backend
          }}
        />
      )}
    </Box>
  )
}
