const { workerData, parentPort } = require("worker_threads");
const axios = require("axios");
const cookies = require("./cookies");

console.log(`GET ${workerData.url}`);
axios
  .request({
    url: workerData.url,
    method: "get",
    headers: {
      Cookie: cookies.getCookies(),
    },
  })
  .then((data) => {
    // console.log(data.data);
    parentPort.postMessage(data.data.data.results[0]);
  })
  .catch((err) => {
    console.log(err.message);
    parentPort.postMessage("error en la wea: " + JSON.stringify(workerData));
  });
