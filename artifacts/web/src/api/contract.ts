import type {
  PcbSpec,
  Inspection,
  InspectionDetail,
  Report,
  AnalyzeResult,
  HealthStatus,
  CreateSpecInput,
  CreateInspectionInput,
  ReviewInput,
} from "./types";

/**
 * The data contract the UI depends on. Both the live gateway client and the
 * in-memory demo backend implement this identical shape, so the rest of the
 * app is agnostic to which one is active.
 */
export interface Api {
  health(): Promise<HealthStatus>;

  specs: {
    list(): Promise<PcbSpec[]>;
    get(id: number): Promise<PcbSpec>;
    create(input: CreateSpecInput): Promise<PcbSpec>;
    update(id: number, input: Partial<CreateSpecInput>): Promise<PcbSpec>;
    remove(id: number): Promise<{ deleted: boolean }>;
  };

  inspections: {
    list(): Promise<Inspection[]>;
    get(id: number): Promise<InspectionDetail>;
    create(input: CreateInspectionInput): Promise<Inspection>;
    analyze(id: number): Promise<AnalyzeResult>;
    review(id: number, input: ReviewInput): Promise<unknown>;
  };

  reports: {
    list(): Promise<Report[]>;
    get(id: number): Promise<Report>;
    generate(inspectionId: number, operatorNotes?: string): Promise<Report>;
  };
}
