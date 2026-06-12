import "dotenv/config";
import { captureCursorReport } from "./capture-cursor";

captureCursorReport()
  .then((p) => console.log("Done:", p))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
