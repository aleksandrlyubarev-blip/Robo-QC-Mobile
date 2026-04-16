import { pgTable, serial, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inspections } from "./inspections";

export const detections = pgTable("detections", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  componentId: text("component_id").notNull(),
  detectedLabel: text("detected_label").notNull(),
  score: real("score").notNull(),
  bbox3d: jsonb("bbox3d").notNull(),
  bbox2d: jsonb("bbox2d"),
  source: text("source").notNull().default("wilddet3d"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDetectionSchema = createInsertSchema(detections).omit({ id: true, createdAt: true });

export type Detection = typeof detections.$inferSelect;
export type InsertDetection = z.infer<typeof insertDetectionSchema>;
