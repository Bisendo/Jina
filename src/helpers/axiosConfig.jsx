// src/helpers/axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://172.236.8.60:37243", // ✅ Your backend IP and port
  headers: {
    accessToken: localStorage.getItem("accessToken"),
  },
});

export default api;
