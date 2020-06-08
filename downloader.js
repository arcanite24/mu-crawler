const { workerData, parentPort } = require("worker_threads");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const containerPath = path.resolve(__dirname, "images");
const writer = fs.createWriteStream(workerData.imgPath);

console.log(`Downloading: GET ${workerData.url}`);

const download = async () => {
  if (!fs.existsSync(containerPath)) {
    fs.mkdirSync(containerPath);
  }

  const res = await axios.request({
    url: workerData.url,
    method: "get",
    responseType: "stream",
  });

  const totalLength = parseInt(res.headers["content-length"]);
  let progress = 0;

  res.data.pipe(writer);

  res.data.on("data", (chunk) => {
    progress += chunk.length;
    console.log(
      `${workerData.filename} at ${((progress / totalLength) * 100).toFixed(
        1
      )}%`
    );
  });

  writer.on("finish", () => {
    parentPort.postMessage(`Success on ${workerData.url}`);
  });
};

download();
