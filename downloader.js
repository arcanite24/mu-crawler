const { workerData, parentPort } = require("worker_threads");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const containerPath = path.resolve(__dirname, "images");
const writer = fs.createWriteStream(workerData.imgPath);

// console.log(`Downloading: GET ${workerData.url}`);

const download = async () => {
  if (!fs.existsSync(containerPath)) {
    fs.mkdirSync(containerPath, { recursive: true });
  }

  const res = await axios.request({
    url: workerData.url,
    method: "get",
    responseType: "stream",
  });

  const totalLength = parseInt(res.headers["content-length"]);
  parentPort.postMessage({
    type: "start",
    value: totalLength,
    message: `Starting ${workerData.filename}`,
  });

  res.data.pipe(writer);

  res.data.on("data", (chunk) => {
    parentPort.postMessage({
      type: "progress",
      value: chunk.length,
      message: `Downloading ${workerData.filename}`,
    });
  });

  writer.on("finish", () => {
    parentPort.postMessage({
      done: true,
      message: `Done at ${workerData.filename}`,
    });
    writer.close();
  });
};

download();
