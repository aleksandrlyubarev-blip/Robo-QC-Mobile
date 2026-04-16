import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pcbSpecs } from "./pcb-specs";

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull().references(() => pcbSpecs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("capturing"),
  operatorId: text("operator_id"),
  deviceInfo: jsonb("device_info"),
  capturedImageUrl: text("captured_image_url"),
  capturedDepthMapUrl: text("captured_depth_map_url"),
  preScreenResult: jsonb("pre_screen_result"),
  serverDetections: jsonb("server_detections"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({ id: true, createdAt: true, updatedAt: true });

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
