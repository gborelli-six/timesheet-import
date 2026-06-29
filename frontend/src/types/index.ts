export type ServiceType = 'jira' | 'odoo' | 'linear' | 'asana'

export interface ConnectorOut {
  label: string
  service: ServiceType
  base_url: string | null
  account_identifier: string | null
  configured: boolean
  needs_reauth: boolean
  updated_at: string
}

export interface ConnectorUpsertRequest {
  service?: ServiceType
  account_identifier?: string | null
  base_url?: string | null
  secret?: string
}
