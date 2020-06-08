const fs = require("fs");
const md5 = require("md5");

if (!fs.existsSync("./key.txt")) {
  throw new Error("Please create a key.txt on the root of this project");
}

const keys = fs.readFileSync("./key.txt", "utf-8").split("\n");

module.exports = {
  getPublicKey: () => keys[0],
  getPrivateKey: () => keys[1],
  getApiPayload: () => {
    const ts = new Date().toISOString();

    return {
      ts: new Date().toISOString(),
      apikey: keys[0],
      hash: md5(`${ts}${keys[1]}${keys[0]}`),
    };
  },
};
