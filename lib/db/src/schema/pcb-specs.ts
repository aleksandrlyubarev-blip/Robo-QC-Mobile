import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * ComponentSpec JSONB shape:
 * {
 *   componentId: string,
 *   type: "screw" | "connector" | "heatsink" | "solder_element" | "press_fit" | "through_hole" | "osfp_cage" | "cable",
 *   label: string,
 *   textPrompt: string,                          // WildDet3D text prompt
 *   expectedPosition: { x, y, z },               // mm, board-local
 *   expectedOrientation: { roll, pitch, yaw },    // degrees
 *   expectedExtent: { width, height, depth },     // mm
 *   positionTolerance: number,                    // mm
 *   orientationTolerance: number,                 // degrees
 *   extentTolerance: number,                      // mm
 *   required: boolean,
 *   minConfidenceScore: number
 * }
 */

export const pcbSpecs = pgTable("pcb_specs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  boardDimensions: jsonb("board_dimensions"),
  components: jsonb("components").notNull().default([]),
  referenceImageUrl: text("reference_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPcbSpecSchema = createInsertSchema(pcbSpecs).omit({ id: true, createdAt: true, updatedAt: true });

export type PcbSpec = typeof pcbSpecs.$inferSelect;
export type InsertPcbSpec = z.infer<typeof insertPcbSpecSchema>;
