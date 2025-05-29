import axios from "axios";
import { useAuth } from "../context/AuthContext";
 
const JwtInterceptor = async (url, data = {}, method = "POST") => {
  const { token } = useAuth();
 
  try {
    console.log("Token fetched from AuthContext:", token); // Log to verify token availability
 
    const publicUrls = import.meta.env.VITE_PUBLIC_URLS.split(',');
    const authenticatedUrls = import.meta.env.VITE_AUTHENTICATED_URLS.split(',');
 
    // Check if the URL is public or requires authentication
    const isPublicUrl = publicUrls.some(publicUrl => url.includes(publicUrl));
    const isAuthenticatedUrl = authenticatedUrls.some(authUrl => url.includes(authUrl));
 
    if (!isPublicUrl && isAuthenticatedUrl && !token) {
      throw new Error("Authentication required. Please log in.");
    }
 
    // Configure headers
    const config = {
      method,
      url,
      headers: isPublicUrl ? {} : { Authorization: `Bearer ${token}` },
      data: ["POST", "PUT"].includes(method) ? data : undefined,
      params: method === "GET" ? data : undefined,
    };
 
    console.log("Request configuration:", config); // Log request configuration
 
    const response = await axios(config);
    return response.data;
 
  } catch (error) {
    console.error("Request failed:", error);
 
    if (error.response) {
      throw new Error(error.response.data.message || "An error occurred while processing your request.");
    } else if (error.request) {
      throw new Error("No response received from the server.");
    } else {
      throw new Error("An error occurred while setting up the request.");
    }
  }
};
 
export default JwtInterceptor;