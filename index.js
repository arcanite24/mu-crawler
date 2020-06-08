const { Worker } = require("worker_threads");
const argv = require("yargs").argv;
const axios = require("axios");
const cookies = require("./cookies");

const BASE_URL = "https://read-api.marvel.com";

const randMax = (max) => Math.floor(Math.random() * max + 1);
const randRange = (min, max) => Math.random() * (max - min) + min;

const ids = ["27201", "27470", "27576"];

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./crawler.js", { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Dio un error la wea: ${code}`));
    });
  });
}

function downloadImage(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./downloader.js", { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Dio un error la wea: ${code}`));
    });
  });
}

async function login(username, password) {
  return axios.request({
    url: "https://secure.marvel.com/user/login?referer=http%3A%2F%2Fmarvel.com",
    method: "post",
    params: {
      login: username,
      password,
    },
    headers: {
      Cookie: cookies.getCookies(),
    },
  });
}

async function runCrawler() {
  const queue = [];
  const failed = [];

  let images = [];

  for (const id of ids) {
    queue.push(
      runService({
        url: `${BASE_URL}/issue/v1/digitalcomics/${id}`,
        params: {},
      })
    );

    // queue.push(
    //   runService({
    //     id,
    //     url: `${BASE_URL}/asset/v1/digitalcomics/${id}`,
    //     params: {
    //       rand: randRange(10000, 99999),
    //     },
    //   })
    // );
  }

  const results = await Promise.all(queue);

  for (const issue of results) {
    if (issue.auth_state.logged_in) {
      console.log(`Fetched: ${issue.id}`);
      const pages = issue.pages.map((page) => page.assets.source);

      for (const page of pages) {
        images.push(
          downloadImage({
            url: page,
            id: issue.id,
            filename: `${issue.id}-${pages.indexOf(page)}.jpg`,
          })
        );
      }
    } else {
      failed.push(issue.id);
      console.log(`Failed: ${issue.id}`);
    }
  }

  const downloadResult = await Promise.all(images);
  console.log(downloadResult);
}

async function runInfo() {
  const queue = [];
  const failed = [];

  let images = [];

  for (const id of ids) {
    queue.push(
      runService({
        url: `${BASE_URL}/issue/v1/digitalcomics/${id}`,
        params: {},
      })
    );
  }

  const results = await Promise.all(queue);

  console.log(results);
}

// CLI Stuff
const mode = argv.mode;

if (!mode) {
  console.error(
    "Please specify a mode with: --mode issue|crawl|serie|list-series"
  );
}

if (mode === "issue") {
  runInfo().catch((err) => console.error(err));
}

if (mode === "serie") {
  const id = argv.id;

  if (!id)
    return console.error(
      "Please specify an id: --id 1234 or a list of ids: --id 1234,5555,12321"
    );

  const parsedId = id.split(",");

  async function runListSeries() {
    const queue = [];
    const failed = [];

    let images = [];

    for (const id of parsedId) {
      queue.push(
        runService({
          url: `${BASE_URL}/issue/v1/digitalcomics/${id}`,
          params: {},
        })
      );
    }

    const results = await Promise.all(queue);

    console.log(results);
  }

  runListSeries().catch((err) => console.error(err));
}

if (mode === "crawl") {
  runCrawler().catch((err) => console.error(err));
}

if (mode === "list-series") {
  const { username, password } = argv;

  if (!username) {
    return console.log(
      "Please specify an username witwh: --username test@test.com"
    );
  }

  if (!password) {
    return console.log("Please specify a password witwh: --password 1234");
  }

  async function runListSeries() {
    const queue = [];
    const failed = [];

    // First we need to authenticate
    const loginRes = await login(username, password);
    console.log(loginRes.data);

    queue.push(
      runService({
        url: `http://api.marvel.com/browse/series?startsWith=%s&offset=0&byType=digital-comics&byZone=marvel_site_zone&limit=10000`,
        params: {},
      })
    );

    const results = await Promise.all(queue);

    console.log(results);
  }

  runListSeries().catch((err) => console.error(err));
}
