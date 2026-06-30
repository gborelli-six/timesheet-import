import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import type { RowWarning, TimesheetEntry } from '../../lib/timesheet/types'

interface PreviewTableProps {
  entries: TimesheetEntry[]
  warnings: RowWarning[]
  onBack: () => void
  onNext: () => void
}

export default function PreviewTable({ entries, warnings, onBack, onNext }: PreviewTableProps) {
  // rowIndex is 1-based in RowWarning; -1 means global (MISSING_PERIOD)
  const perRowWarnings = warnings.filter((w) => w.rowIndex >= 1)
  const warningRowIndexes = new Set(perRowWarnings.map((w) => w.rowIndex))
  const warningRowCount = warningRowIndexes.size
  const validRowCount = entries.length - warningRowCount

  function rowWarnings(idx: number): RowWarning[] {
    return perRowWarnings.filter((w) => w.rowIndex === idx + 1)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {warningRowCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
          data-testid="preview-warning-alert"
        >
          {validRowCount} {validRowCount === 1 ? 'riga valida' : 'righe valide'} · {warningRowCount}{' '}
          {warningRowCount === 1 ? 'riga con warning' : 'righe con warning'}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Progetto</TableCell>
              <TableCell>Task</TableCell>
              <TableCell align="right">Ore</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Connettori assegnati</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, idx) => {
              const rw = rowWarnings(idx)
              const hasWarning = rw.length > 0
              const tooltipText = rw.map((w) => w.message).join('\n')
              return (
                <TableRow
                  key={idx}
                  sx={hasWarning ? { backgroundColor: 'warning.lighter' } : undefined}
                  data-testid={hasWarning ? 'preview-row-warning' : undefined}
                >
                  <TableCell>{entry.date ?? '—'}</TableCell>
                  <TableCell>{entry.project || '—'}</TableCell>
                  <TableCell>{entry.task || '—'}</TableCell>
                  <TableCell align="right">{entry.hours}</TableCell>
                  <TableCell>{entry.notes ?? '—'}</TableCell>
                  <TableCell>
                    {hasWarning ? (
                      <Tooltip
                        title={<Box sx={{ whiteSpace: 'pre-line' }}>{tooltipText}</Box>}
                        arrow
                      >
                        <Chip
                          label="Warning"
                          size="small"
                          color="warning"
                          icon={<WarningAmberOutlinedIcon />}
                          data-testid="preview-warning-chip"
                        />
                      </Tooltip>
                    ) : null}
                  </TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button variant="outlined" color="inherit" onClick={onBack} data-testid="preview-btn-back">
          Indietro
        </Button>
        <Button variant="contained" onClick={onNext} data-testid="preview-btn-next">
          Avanti — Seleziona backend
        </Button>
      </Box>
    </Box>
  )
}
