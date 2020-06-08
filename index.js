const { Worker } = require("worker_threads");
const argv = require("yargs").argv;
const axios = require("axios");
const cookies = require("./cookies");
const fs = require("fs");
const path = require("path");
const { getApiPayload } = require("./key");
const directoryExists = require("directory-exists");

const API_BASE_URL = "https://gateway.marvel.com/v1/public";
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

function executeInWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./workerExecute.js", { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Dio un error la wea: ${code}`));
    });
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

if (mode === "crawl") {
  runCrawler().catch((err) => console.error(err));
}

if (mode === "serie") {
  const { serie } = argv;

  if (!serie) {
    return console.error(
      "Please specify a serie ID with --serie 1234 or a list of comma separated ids --serie 1234,2222,3333"
    );
  }

  const parsedIds = serie.toString().split(",");

  async function runListSeries() {
    const queue = [];
    const downloadQueue = [];
    const failed = [];

    const comicNames = {};

    for (const id of parsedIds) {
      queue.push(
        executeInWorker({
          url: `${API_BASE_URL}/series/${id}`,
          params: getApiPayload(),
        })
      );
    }

    const results = await Promise.all(queue);

    for (const rawSerie of results) {
      const {
        id,
        title,
        thumbnail,
        comics,
        ...rest
      } = rawSerie.data.results[0];

      const seriePath = path.resolve(__dirname, "images", title);

      if (!directoryExists.sync(seriePath)) {
        fs.mkdirSync(seriePath, { recursive: true });
      }

      console.log(`Fetched ${title}`);
      console.log(comics);

      console.log(`Downloading cover for ${title}`);
      const coverPath = path.resolve(
        __dirname,
        "images",
        title,
        `cover.${thumbnail.extension}`
      );

      downloadQueue.push(
        downloadImage({
          serieName: title,
          filename: `cover.${thumbnail.extension}`,
          url: `${thumbnail.path}.${thumbnail.extension}`,
          imgPath: coverPath,
        })
      );

      const comicInfoQueue = [];

      for (const comic of comics.items) {
        const comicId = comic.resourceURI
          .replace("http://", "")
          .split("/")
          .slice(-1);

        const comicPath = path.resolve(__dirname, "images", title, comic.name);
        if (!directoryExists.sync(comicPath)) {
          fs.mkdirSync(comicPath, { recursive: true });
        }

        console.log(`Adding ${comic.name} to the queue as ${comicId}`);

        comicInfoQueue.push(
          executeInWorker({
            url: `${API_BASE_URL}/comics/${comicId}`,
            params: {
              ...getApiPayload(),
            },
          })
        );
      }

      // Download every image
      try {
        const comicInfoList = await Promise.all(comicInfoQueue);
        const comicsWithDigitalId = comicInfoList
          .map((c) => c.data.results[0])
          .map((c) => ({ id: c.digitalId, title: c.title }))
          .filter((c) => c.id);

        const digitalComicsQueue = [];

        for (const c of comicsWithDigitalId) {
          comicNames[c.id] = c.title;

          digitalComicsQueue.push(
            executeInWorker({
              url: `${BASE_URL}/asset/v1/digitalcomics/${c.id}`,
              params: {
                rand: randRange(10000, 99999),
              },
              headers: {
                Cookie: cookies.getCookies(),
              },
            })
          );
        }

        const digitalComics = await Promise.all(digitalComicsQueue);

        const validComics = digitalComics
          .filter((c) => c)
          .map((c) => c.data.results[0])
          .filter((c) => c.auth_state.logged_in)
          .map((c) => ({
            pages: c.pages.map((page) => page.assets.source),
            id: c.id,
          }));

        for (const { id, pages } of validComics) {
          for (const url of pages) {
            const filename = `${pages.indexOf(url)}-${comicNames[id]}.jpg`;
            downloadQueue.push(
              downloadImage({
                url,
                serieName: title,
                filename,
                imgPath: path.resolve(
                  __dirname,
                  "images",
                  title,
                  comicNames[id],
                  filename
                ),
              })
            );
          }
        }

        const downloadResult = await Promise.all(downloadQueue);

        console.log(downloadResult.join("\n"));
      } catch (error) {
        console.log(error);
      }
    }
  }

  runListSeries().catch((err) => console.error(err));
}
