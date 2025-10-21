// src/api/axiosClient.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://192.168.1.167:3000";
const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

axiosClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
