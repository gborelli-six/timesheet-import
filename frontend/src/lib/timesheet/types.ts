import type { ServiceType } from '../../types/index'

export enum WarningType {
  MISSING_HOURS = 'MISSING_HOURS',
  MISSING_PROJECT = 'MISSING_PROJECT',
  MISSING_TASK = 'MISSING_TASK',
  INVALID_DATE = 'INVALID_DATE',
  MISSING_PERIOD = 'MISSING_PERIOD',
}

export interface RowWarning {
  rowIndex: number
  type: WarningType
  message: string
}

export interface ConnectorAssignment {
  connectorLabel: string
  service: ServiceType
  remoteProjectId: string
  remoteProjectName: string
  remoteTaskId: string
  remoteTaskName: string
  suggested: boolean
}

export interface TimesheetEntry {
  date?: string
  project: string
  task: string
  hours: number
  notes?: string
  connectorAssignments: ConnectorAssignment[]
}

export type ColumnMapping = {
  date: string
  project: string
  task: string
  hours: string
  notes: string
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  date: 'Data',
  project: 'Progetto',
  task: 'Task',
  hours: 'Ore',
  notes: 'Note',
}
