import "dotenv/config";
import { captureDailyReport } from "./capture";

captureDailyReport(process.env.REPORT_DATE)
  .then((p) => console.log("Done:", p))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
