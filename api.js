const axios = require("axios");
const { getKey } = require("./key");

const API_BASE_URL = "https://gateway.marvel.com/v1/public";

const getSerieDetail = (id) => {
  return axios.request({
    url: `${API_BASE_URL}/series/${id}`,
    method: "get",
    params: { apiKey: getKey() },
  });
};

module.exports = {
  getSerieDetail,
};
