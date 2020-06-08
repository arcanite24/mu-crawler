const { workerData, parentPort } = require("worker_threads");
const axios = require("axios");

const { url, params, method = "get", headers = {} } = workerData;

// console.log(`workerThread: ${method.toUpperCase()} ${url}`, params);

const doExecute = async () => {
  try {
    const result = await axios.request({
      url,
      params,
      method,
      headers,
    });

    parentPort.postMessage({ done: true, payload: result.data });
  } catch (error) {
    console.log("Error on:", url, error.message);
    parentPort.postMessage({ error: true, message: error.message });
  }
};

doExecute();
