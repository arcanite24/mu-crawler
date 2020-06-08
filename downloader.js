const { workerData, parentPort } = require("worker_threads");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const imgPath = path.resolve(__dirname, "images", workerData.filename);
const writer = fs.createWriteStream(imgPath);

console.log(`Downloading: GET ${workerData.url}`);

const download = async () => {
  const res = await axios.request({
    url: workerData.url,
    method: "get",
    responseType: "stream",
  });

  res.data.pipe(writer);

  writer.on("finish", () => {
    parentPort.postMessage(`Succes on ${workerData.url}`);
  });
};

download();
