import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inspections } from "./inspections";

/**
 * Training-grade labels produced by the review flow (data-flywheel spec §6.1).
 * A finding in qc_results is a verdict; an annotation is a label: box + class +
 * severity + origin, tied to a specific image artifact and taxonomy version.
 */

export const annotationAxes = ["component", "anomaly"] as const;
export const annotationOrigins = [
  "model",
  "operator_confirm",
  "operator_correct",
  "operator_add",
  "synthetic",
] as const;
export const annotationSeverities = ["critical", "major", "minor", "info"] as const;

export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  artifactKey: text("artifact_key").notNull(),
  axis: text("axis").notNull(),
  classId: text("class_id").notNull(),
  severity: text("severity"),
  bbox2d: jsonb("bbox2d").notNull(),
  mask: jsonb("mask"),
  origin: text("origin").notNull(),
  reviewedBy: text("reviewed_by"),
  taxonomyVersion: text("taxonomy_version").notNull().default("0.1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAnnotationSchema = createInsertSchema(annotations)
  .omit({ id: true, createdAt: true })
  .extend({
    axis: z.enum(annotationAxes),
    origin: z.enum(annotationOrigins),
    severity: z.enum(annotationSeverities).nullable().optional(),
  });

export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
