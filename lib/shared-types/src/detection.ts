import { z } from "zod/v4";

export const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const OrientationSchema = z.object({
  roll: z.number(),
  pitch: z.number(),
  yaw: z.number(),
});

export const ExtentSchema = z.object({
  width: z.number(),
  height: z.number(),
  depth: z.number(),
});

export const BBox3DSchema = z.object({
  center: Vec3Schema,
  extent: ExtentSchema,
  orientation: OrientationSchema,
  rotationMatrix: z.array(z.array(z.number())).optional(),
});

export const BBox2DSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const Detection3DSchema = z.object({
  label: z.string(),
  score: z.number(),
  bbox3d: BBox3DSchema,
  bbox2d: BBox2DSchema.optional(),
  depthUsed: z.boolean(),
});

export const DetectionResponseSchema = z.object({
  detections: z.array(Detection3DSchema),
  inferenceTimeMs: z.number(),
  depthAvailable: z.boolean(),
  imageSize: z.tuple([z.number(), z.number()]),
});

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Orientation = z.infer<typeof OrientationSchema>;
export type Extent = z.infer<typeof ExtentSchema>;
export type BBox3D = z.infer<typeof BBox3DSchema>;
export type BBox2D = z.infer<typeof BBox2DSchema>;
export type Detection3D = z.infer<typeof Detection3DSchema>;
export type DetectionResponse = z.infer<typeof DetectionResponseSchema>;
