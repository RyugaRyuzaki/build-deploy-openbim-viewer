import os from "os";
import express, {Express} from "express";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import {UploadFile} from "./upload";
import {ErrorHandler} from "./config/ErrorHandler";
const app: Express = express();
const port = process.env.PORT;
app.set("port", port);
morgan.token("ram", function (req, res) {
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);
  return `${usedMemory} bytes (${memoryUsagePercentage}%) used out of ${totalMemory} bytes`;
});
app.use(
  morgan(":method :url :status :response-time ms - :remote-addr - RAM: :ram")
);
app.use(cors());
app.use(bodyParser.urlencoded({extended: false, limit: "50mb"}));
app.use(bodyParser.json({limit: "50mb"}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.get("/", (_req, res) => {
  console.log(port);
  res.status(200).json("OK");
});

app.post("/api/upload", UploadFile.uploadFiles);
app.get("/api/buckets/:bucketName", UploadFile.getBucketID);
app.post("/api/buckets", UploadFile.createBucket);
app.delete("/api/buckets/:bucketName", UploadFile.deleteBucket);
app.use(ErrorHandler);
app.listen(port, () => {
  console.log(`Server is listening on port:${port}`);
});
