import { pgTable, serial, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inspections } from "./inspections";

export const qcResults = pgTable("qc_results", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  componentId: text("component_id").notNull(),
  status: text("status").notNull().default("pending"),
  positionDeviation: real("position_deviation"),
  orientationDeviation: real("orientation_deviation"),
  extentDeviation: real("extent_deviation"),
  scoreDeviation: real("score_deviation"),
  details: jsonb("details"),
  reviewedBy: text("reviewed_by"),
  reviewDecision: text("review_decision"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertQcResultSchema = createInsertSchema(qcResults).omit({ id: true, createdAt: true });

export type QcResult = typeof qcResults.$inferSelect;
export type InsertQcResult = z.infer<typeof insertQcResultSchema>;
