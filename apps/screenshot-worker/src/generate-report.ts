import "dotenv/config";
import { runFullPipeline } from "./pipeline";

runFullPipeline(process.env.REPORT_DATE).catch((err) => {
  console.error(err);
  process.exit(1);
});
