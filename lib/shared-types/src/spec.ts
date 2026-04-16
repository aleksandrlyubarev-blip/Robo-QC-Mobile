import { z } from "zod/v4";
import { Vec3Schema, OrientationSchema, ExtentSchema } from "./detection";

export const ComponentTypeSchema = z.enum([
  "screw",
  "connector",
  "heatsink",
  "solder_element",
  "press_fit",
  "through_hole",
  "osfp_cage",
  "cable",
]);

export const ComponentSpecSchema = z.object({
  componentId: z.string(),
  type: ComponentTypeSchema,
  label: z.string(),
  textPrompt: z.string(),
  expectedPosition: Vec3Schema,
  expectedOrientation: OrientationSchema,
  expectedExtent: ExtentSchema,
  positionTolerance: z.number().positive(),
  orientationTolerance: z.number().positive(),
  extentTolerance: z.number().positive(),
  required: z.boolean(),
  minConfidenceScore: z.number().min(0).max(1),
});

export const BoardDimensionsSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  depthMm: z.number().positive(),
});

export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;
export type BoardDimensions = z.infer<typeof BoardDimensionsSchema>;
