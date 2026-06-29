import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ConnectorOut, ConnectorUpsertRequest } from '@/types'

const CONNECTORS_KEY = ['connectors'] as const

export function useConnectors() {
  return useQuery<ConnectorOut[]>({
    queryKey: CONNECTORS_KEY,
    queryFn: () => apiClient.get('/api/me/connectors/') as Promise<ConnectorOut[]>,
  })
}

export function useUpsertConnector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ label, body }: { label: string; body: ConnectorUpsertRequest }) =>
      apiClient.put(
        `/api/me/connectors/${encodeURIComponent(label)}`,
        body,
      ) as Promise<ConnectorOut>,
    onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
  })
}

export function useDeleteConnector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (label: string) =>
      apiClient.delete(`/api/me/connectors/${encodeURIComponent(label)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
  })
}
