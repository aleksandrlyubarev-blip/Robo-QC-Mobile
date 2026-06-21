import "./lib/env";
import { seedDatabase } from "./lib/seed-data";

seedDatabase()
  .then((summary) => {
    console.log(
      `Seeded database: ${summary.specs} specs, ${summary.inspections} inspections, ${summary.reports} reports.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
