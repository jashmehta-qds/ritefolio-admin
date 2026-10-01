import axios from "axios";

// Create axios instance with global configuration
const axiosInstance = axios.create({
  baseURL: "/api",
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    const status = error.response?.status;
    if (
      (status === 401 || status === 403) &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/"
    ) {
      // Session is missing, expired, or not an administrator
      window.location.href = status === 403 ? "/?error=forbidden" : "/";
    }

    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error("Network Error:", error.request);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
