const fs = require("fs");

const cookies = fs.readFileSync("./cookies.txt", "utf-8");

module.exports = {
  getCookies: () =>
    cookies
      .split("\n")
      .filter((line) => line.charAt(0) !== "#" && line.length)
      .map((line) => line.split("\t").slice(-2).join("="))
      .join("; "),
};
