import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inspections } from "./inspections";
import { pcbSpecs } from "./pcb-specs";

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  specId: integer("spec_id").notNull().references(() => pcbSpecs.id),
  overallStatus: text("overall_status").notNull().default("pending"),
  passCount: integer("pass_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  missingCount: integer("missing_count").notNull().default(0),
  totalComponents: integer("total_components").notNull().default(0),
  reportJson: jsonb("report_json"),
  reportPdfUrl: text("report_pdf_url"),
  operatorNotes: text("operator_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
