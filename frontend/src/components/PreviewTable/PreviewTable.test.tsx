// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PreviewTable from './PreviewTable'
import { WarningType } from '../../lib/timesheet/types'
import type { TimesheetEntry, RowWarning } from '../../lib/timesheet/types'

function makeEntry(overrides: Partial<TimesheetEntry> = {}): TimesheetEntry {
  return {
    date: '2026-01-15',
    project: 'Progetto A',
    task: 'Dev',
    hours: 8,
    connectorAssignments: [],
    ...overrides,
  }
}

function makeWarning(rowIndex: number, type: WarningType = WarningType.MISSING_HOURS): RowWarning {
  return { rowIndex, type, message: `Warning riga ${rowIndex}` }
}

describe('PreviewTable', () => {
  let onBack: ReturnType<typeof vi.fn>
  let onNext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onBack = vi.fn()
    onNext = vi.fn()
  })

  it('rendering con 3 entry valide: nessun alert warning, nessuna riga evidenziata', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()]
    render(<PreviewTable entries={entries} warnings={[]} onBack={onBack} onNext={onNext} />)

    expect(screen.queryByTestId('preview-warning-alert')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('preview-row-warning')).toHaveLength(0)
  })

  it('rendering con 1 entry valida + 2 con warning: alert corretto, 2 righe evidenziate', () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()]
    const warnings = [
      makeWarning(2, WarningType.MISSING_PROJECT),
      makeWarning(3, WarningType.MISSING_HOURS),
    ]
    render(<PreviewTable entries={entries} warnings={warnings} onBack={onBack} onNext={onNext} />)

    const alert = screen.getByTestId('preview-warning-alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('1 riga valida')
    expect(alert).toHaveTextContent('2 righe con warning')

    expect(screen.getAllByTestId('preview-row-warning')).toHaveLength(2)
  })

  it('click "Indietro" chiama onBack', () => {
    render(<PreviewTable entries={[makeEntry()]} warnings={[]} onBack={onBack} onNext={onNext} />)
    fireEvent.click(screen.getByTestId('preview-btn-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('click "Avanti" con warning presenti chiama onNext (non bloccato)', () => {
    const entries = [makeEntry(), makeEntry()]
    const warnings = [makeWarning(1), makeWarning(2)]
    render(<PreviewTable entries={entries} warnings={warnings} onBack={onBack} onNext={onNext} />)

    const nextBtn = screen.getByTestId('preview-btn-next')
    expect(nextBtn).not.toBeDisabled()
    fireEvent.click(nextBtn)
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
