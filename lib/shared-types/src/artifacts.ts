import { z } from "zod/v4";

/**
 * Artifact storage key convention (data-flywheel spec §3):
 *
 *   {specId}/{inspectionId}/{kind}/{captureTs}.{ext}   — inspection artifacts
 *   {specId}/golden/{captureTs}.{ext}                  — goldens live under the spec
 *
 * Keys are immutable once written; a re-capture gets a new captureTs.
 */

export const ArtifactKindSchema = z.enum([
  "rgb",
  "depth",
  "prescreen_overlay",
  "crop",
  "golden",
]);

export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

/** ISO timestamp → filesystem/URL-safe segment: 2026-06-13T09:26:09Z → 2026-06-13T09-26-09Z */
function safeTs(iso: string): string {
  return iso.replace(/:/g, "-");
}

export function inspectionArtifactKey(
  specId: number,
  inspectionId: number,
  kind: Exclude<ArtifactKind, "golden">,
  captureTs: string,
  ext: string,
): string {
  return `${specId}/${inspectionId}/${kind}/${safeTs(captureTs)}.${ext}`;
}

export function goldenArtifactKey(specId: number, captureTs: string, ext: string): string {
  return `${specId}/golden/${safeTs(captureTs)}.${ext}`;
}
