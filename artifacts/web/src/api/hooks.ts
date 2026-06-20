import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "./client";
import type {
  CreateSpecInput,
  CreateInspectionInput,
  ReviewInput,
  PcbSpec,
  Inspection,
  InspectionDetail,
  Report,
  HealthStatus,
} from "./types";

export const queryKeys = {
  health: ["health"] as const,
  specs: ["specs"] as const,
  spec: (id: number) => ["specs", id] as const,
  inspections: ["inspections"] as const,
  inspection: (id: number) => ["inspections", id] as const,
  reports: ["reports"] as const,
  report: (id: number) => ["reports", id] as const,
};

export function useHealth(): UseQueryResult<HealthStatus> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSpecs(): UseQueryResult<PcbSpec[]> {
  return useQuery({ queryKey: queryKeys.specs, queryFn: api.specs.list });
}

export function useSpec(id: number | undefined): UseQueryResult<PcbSpec> {
  return useQuery({
    queryKey: queryKeys.spec(id ?? -1),
    queryFn: () => api.specs.get(id as number),
    enabled: id != null,
  });
}

export function useCreateSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpecInput) => api.specs.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.specs }),
  });
}

export function useUpdateSpec(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateSpecInput>) => api.specs.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.specs });
      qc.invalidateQueries({ queryKey: queryKeys.spec(id) });
    },
  });
}

export function useDeleteSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.specs.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.specs }),
  });
}

export function useInspections(): UseQueryResult<Inspection[]> {
  return useQuery({ queryKey: queryKeys.inspections, queryFn: api.inspections.list });
}

const ACTIVE_STATUSES = new Set(["analyzing", "uploading", "pre_screening"]);

export function useInspection(
  id: number | undefined,
): UseQueryResult<InspectionDetail> {
  return useQuery({
    queryKey: queryKeys.inspection(id ?? -1),
    queryFn: () => api.inspections.get(id as number),
    enabled: id != null,
    // Poll only while server-side analysis is in flight, then stop.
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.has(query.state.data.status) ? 2500 : false,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInspectionInput) => api.inspections.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inspections }),
  });
}

export function useAnalyzeInspection(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.inspections.analyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inspection(id) });
      qc.invalidateQueries({ queryKey: queryKeys.inspections });
    },
  });
}

export function useReviewComponent(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => api.inspections.review(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inspection(id) }),
  });
}

export function useReports(): UseQueryResult<Report[]> {
  return useQuery({ queryKey: queryKeys.reports, queryFn: api.reports.list });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, notes }: { inspectionId: number; notes?: string }) =>
      api.reports.generate(inspectionId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reports }),
  });
}
