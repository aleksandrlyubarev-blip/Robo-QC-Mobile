/**
 * Headless verification of the demo backend: exercises the full AOI workflow
 * (seed data → create spec → create inspection → analyze → review → report)
 * without a browser, DB, or GPU. Run with: pnpm --filter @workspace/web verify:demo
 */
import { createDemoApi } from "../src/demo/demoApi";

let failures = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
}

async function main() {
  const api = createDemoApi();

  // --- Seed data ---
  const specs = await api.specs.list();
  check(`seed has 2 specs (${specs.length})`, specs.length === 2);

  const inspections = await api.inspections.list();
  check(`seed has 5 inspections (${inspections.length})`, inspections.length === 5);
  const statuses = new Set(inspections.map((i) => i.status));
  check(
    `seed covers completed/reviewing/failed/pre_screening (${[...statuses].join(",")})`,
    ["completed", "reviewing", "failed", "pre_screening"].every((s) => statuses.has(s as never)),
  );

  const reviewing = await api.inspections.get(1025);
  const qcStatuses = new Set(reviewing.qcResults.map((r) => r.status));
  check(
    `reviewing inspection mixes pass/fail/warning (${[...qcStatuses].join(",")})`,
    qcStatuses.has("fail") && qcStatuses.has("warning") && qcStatuses.has("pass"),
  );
  check(
    "reviewing inspection has a detection overlay payload",
    !!reviewing.serverDetections && reviewing.serverDetections.detections.length > 0,
  );

  const reports = await api.reports.list();
  check(`seed has 2 reports (${reports.length})`, reports.length === 2);

  // --- Create spec ---
  const spec = await api.specs.create({
    name: "Test Board",
    version: "rev A",
    components: specs[0]!.components,
  });
  check("created spec gets an id", spec.id > 0);

  // --- Create inspection with image ---
  const created = await api.inspections.create({
    specId: spec.id,
    operatorId: "verify",
    capturedImageUrl: "data:image/png;base64,xxx",
  });
  check("new inspection is pre_screening (ready to analyze)", created.status === "pre_screening");

  // --- Analyze (simulated inference) ---
  const result = await api.inspections.analyze(created.id);
  check("analyze produces qc results", result.qcResults.length === spec.components.length);
  check(
    `analyze sets a terminal status (${result.status})`,
    result.status === "reviewing" || result.status === "completed",
  );

  const analyzed = await api.inspections.get(created.id);
  check("analyzed inspection has detections", analyzed.detections.length > 0);
  check("analyzed inspection has server detection overlay", !!analyzed.serverDetections);

  // --- Review a failing/missing component ---
  const failing = analyzed.qcResults.find(
    (r) => r.status === "fail" || r.status === "missing",
  );
  if (failing) {
    await api.inspections.review(created.id, {
      componentId: failing.componentId,
      decision: "override_pass",
      reviewedBy: "verify",
    });
    const afterReview = await api.inspections.get(created.id);
    const reviewed = afterReview.qcResults.find((r) => r.componentId === failing.componentId)!;
    check(
      "review updates the correct component to pass",
      reviewed.status === "pass" && reviewed.reviewedBy === "verify",
    );
  } else {
    check("review (no failing component to review — skipped)", true);
  }

  // --- Generate report ---
  const report = await api.reports.generate(created.id, "Verified via script");
  check("report totals match component count", report.totalComponents === spec.components.length);
  check(
    `report overall status is coherent (${report.overallStatus})`,
    ["pass", "fail", "conditional_pass"].includes(report.overallStatus),
  );

  console.log(failures === 0 ? "\nALL DEMO CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
