import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaBicycle,
  FaHandshake,
  FaPhone,
  FaCheck,
  FaMapMarkerAlt,
  FaCreditCard,
} from "react-icons/fa";
import { useGlobalState } from "../context/GlobalStateContext";
import axios from "axios";
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { formData, setFormData } = useGlobalState();
  const [popupOpen, setPopupOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [selectedCityImage, setSelectedCityImage] = useState(
    "/banner-freedom.jpg"
  );
  const [cities, setCities] = useState([]);
  const [availableBikes, setAvailableBikes] = useState([]);
  const [lastFetchError, setLastFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [animationState, setAnimationState] = useState({
    searchBtn: false,
    citySelection: false
  });

  // In-memory cache to avoid sessionStorage limitations
  const bikeCache = React.useRef(new Map());

  // Improved time handling function
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const roundToNextHour = (date) => {
    const roundedDate = new Date(date);
    roundedDate.setHours(roundedDate.getHours() + 1, 0, 0, 0);
    return roundedDate;
  };

  useEffect(() => {
    // Scroll to the top of the page when the component mounts
    window.scrollTo(0, 0);

    // Reset location to null when the page loads
    setFormData((prevData) => ({
      ...prevData,
      location: null,
      cityId: null
    }));

    // Start loading animation
    const loadSequence = () => {
      setTimeout(() => {
        const mainBanner = document.querySelector('.main-banner');
        if (mainBanner) mainBanner.classList.add('active');

        setTimeout(() => {
          const bookingForm = document.querySelector('.booking-form');
          if (bookingForm) bookingForm.classList.add('active');

          setTimeout(() => {
            document.querySelectorAll('.feature-item').forEach((item, index) => {
              setTimeout(() => {
                item.classList.add('active');
              }, index * 100);
            });
          }, 300);
        }, 200);
      }, 100);
    };

    loadSequence();

    const fetchCities = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/city/all`, {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        const citiesData = response.data?.content || [];
        setCities(citiesData);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      }
    };

    fetchCities();
  }, [setFormData]);

  // Set default dates on initial load
  useEffect(() => {
    const currentDate = new Date();
    const roundedStartDate = roundToNextHour(currentDate);
    const roundedEndDate = new Date(roundedStartDate);
    roundedEndDate.setDate(roundedStartDate.getDate() + 1);

    setFormData((prevData) => ({
      ...prevData,
      startDate: formatDateForInput(roundedStartDate),
      endDate: formatDateForInput(roundedEndDate),
    }));
  }, [setFormData]);

  // Optimize bike fetching with debounce and memory caching
  const fetchAvailableBikes = async (immediate = false) => {
    if (!formData.location || !formData.startDate || !formData.endDate) {
      setErrors({ location: "Please select a location and dates." });
      return;
    }

    if (!immediate) {
      setIsLoading(true);
    }
    setLastFetchError(null);

    const cacheKey = `bikes_${formData.cityId}_${formData.startDate}_${formData.endDate}`;

    // Check in-memory cache first
    if (bikeCache.current.has(cacheKey) && !immediate) {
      const cachedData = bikeCache.current.get(cacheKey);
      setAvailableBikes(cachedData);
      setIsLoading(false);
      return cachedData;
    }

    const startTime = new Date(formData.startDate).toISOString()
      .replace('T', ' ')
      .split('.')[0];
    const endTime = new Date(formData.endDate).toISOString()
      .replace('T', ' ')
      .split('.')[0];

    const params = {
      cityId: formData.cityId,
      startTime,
      endTime,
    };

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/vehicle/available`,
        { params }
      );
      const bikesData = response.data?.content || [];

      // Store in memory cache instead of sessionStorage
      try {
        // Implement cache size management - keep only the 10 most recent queries
        if (bikeCache.current.size >= 10) {
          // Get the oldest key (first inserted)
          const oldestKey = bikeCache.current.keys().next().value;
          bikeCache.current.delete(oldestKey);
        }
        bikeCache.current.set(cacheKey, bikesData);
      } catch (e) {
        console.error("Failed to cache bikes data:", e);
      }

      if (bikesData.length === 0) {
        setErrors({
          location: "No bikes available for the selected location and time.",
        });
        setAvailableBikes([]);
      } else {
        setAvailableBikes(bikesData);
      }

      setIsLoading(false);
      return bikesData;
    } catch (error) {
      console.error("Error fetching available bikes:", error);
      setLastFetchError("Failed to fetch available bikes. Please try again.");
      setErrors({
        location: "Failed to fetch available bikes. Please try again.",
      });
      setIsLoading(false);
      return [];
    }
  };

  // Background prefetching of bike data with improved throttling
  useEffect(() => {
    let timeoutId;
    if (formData.location && formData.startDate && formData.endDate) {
      // Increase debounce time to reduce unnecessary requests
      timeoutId = setTimeout(() => {
        fetchAvailableBikes(true); // true means it's a background fetch
      }, 500); // Increased from 300ms to 500ms for better throttling
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData.location, formData.startDate, formData.endDate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Time validation for start date
    if (name === 'startDate') {
      const selectedDate = new Date(value);
      const currentDate = new Date();

      if (selectedDate < currentDate) {
        // If selected date is in the past, set to current date and time
        setFormData((prevData) => ({
          ...prevData,
          [name]: formatDateForInput(roundToNextHour(currentDate))
        }));
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: "Past dates and times cannot be selected. Date and time have been reset to current time."
        }));
        return;
      }

      // If endDate is before the new startDate, update endDate
      if (formData.endDate && new Date(formData.endDate) < new Date(value)) {
        const newEndDate = new Date(value);
        newEndDate.setDate(newEndDate.getDate() + 1);
        // Preserve the time of the new start date
        newEndDate.setHours(new Date(value).getHours(),
                             new Date(value).getMinutes());

        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
          endDate: formatDateForInput(newEndDate)
        }));
        return;
      }
    }

    // Time validation for end date
    if (name === 'endDate') {
      const startDate = new Date(formData.startDate);
      const selectedEndDate = new Date(value);

      if (selectedEndDate <= startDate) {
        const newEndDate = new Date(startDate);
        newEndDate.setDate(startDate.getDate() + 1);
        // Preserve the time of the start date
        newEndDate.setHours(startDate.getHours(), startDate.getMinutes());

        setFormData((prevData) => ({
          ...prevData,
          [name]: formatDateForInput(newEndDate)
        }));
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: "End date and time must be after start date and time. Date and time have been adjusted."
        }));
        return;
      }
    }

    setFormData((prevData) => ({ ...prevData, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const handleCitySelection = (city) => {
    // Add animation for selection
    setAnimationState(prev => ({...prev, citySelection: true}));

    setFormData((prevData) => ({
      ...prevData,
      location: city.name, // Set the location to the selected city's name
      cityId: city.id,
    }));

    // Smooth image transition
    const fadeOut = document.querySelector('.city-image-container');
    if (fadeOut) {
      fadeOut.classList.add('fade-out');

      setTimeout(() => {
        setSelectedCityImage(`data:image/jpeg;base64,${city.image}`);
        fadeOut.classList.remove('fade-out');
        fadeOut.classList.add('fade-in');

        setTimeout(() => {
          fadeOut.classList.remove('fade-in');
          setPopupOpen(false);
          setAnimationState(prev => ({...prev, citySelection: false}));
        }, 300);
      }, 300);
    } else {
      setSelectedCityImage(`data:image/jpeg;base64,${city.image}`);
      setPopupOpen(false);
      setAnimationState(prev => ({...prev, citySelection: false}));
    }
  };

  const handleSearch = async () => {
    // Add button animation
    setAnimationState(prev => ({...prev, searchBtn: true}));

    if (!formData.location) {
      setErrors({ location: "Please select a location." });
      setAnimationState(prev => ({...prev, searchBtn: false}));
      return;
    }

    try {
      // Navigate immediately if bikes are already loaded
      if (availableBikes.length > 0) {
        navigate("/bike-list", { state: { formData } });

        // Add a small delay before reloading to ensure navigation happens
        setTimeout(() => {
          window.location.reload();
        }, 100);

        return;
      }

      // If not loaded, fetch bikes with fast response
      const bikes = await fetchAvailableBikes();

      if (bikes.length > 0) {
        navigate("/bike-list", { state: { formData } });

        // Add a small delay before reloading to ensure navigation happens
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else if (lastFetchError) {
        setErrors({ location: lastFetchError });
        setAnimationState(prev => ({...prev, searchBtn: false}));
      } else {
        setAnimationState(prev => ({...prev, searchBtn: false}));
      }
    } catch (error) {
      console.error("Navigation error:", error);
      setAnimationState(prev => ({...prev, searchBtn: false}));
      // Force reload the page in case of navigation error
      window.location.reload();
    }
  };

  const filteredCities = Array.isArray(cities)
    ? cities.filter((city) =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Responsive for all screen sizes */}
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen">
        {/* Image Section - Full width on mobile, half width on desktop */}
        <div
          className="w-full lg:w-1/2 h-64 lg:h-full bg-cover bg-center main-banner city-image-container"
          style={{
            backgroundImage: `url('${selectedCityImage}')`,
            transition: 'opacity 0.3s ease-in-out',
          }}
        ></div>

        {/* Form Section - Full width on mobile, half width on desktop */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 lg:p-8 bg-gradient-to-r from-orange-900 to-orange-600 slide-in-right">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 lg:mb-6 animate-pulse-once text-center">
            Welcome to OKBikes
          </h1>
          <div className="bg-white p-4 lg:p-8 shadow-lg w-full max-w-md booking-form rounded-lg">
            <div className="mb-4">
              <label
                className="block text-orange-800 font-medium mb-2"
                htmlFor="location"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="Select a location"
                value={formData.location || ""} // Display empty string if location is null
                readOnly
                onClick={() => setPopupOpen(true)}
                className={`w-full px-4 py-2 border outline-none focus:ring-2 focus:ring-orange-900 hover:shadow-md transition-all duration-300 rounded-md ${
                  errors.location ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-orange-800 font-medium mb-2"
                htmlFor="startDate"
              >
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                min={formatDateForInput(new Date())}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-md transition-all duration-300 rounded-md ${
                  errors.startDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>
            <div className="mb-6">
              <label
                className="block text-orange-800 font-medium mb-2"
                htmlFor="endDate"
              >
                End Date & Time
              </label>
              <input
                type="datetime-local"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                min={formData.startDate}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-md transition-all duration-300 rounded-md ${
                  errors.endDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || animationState.searchBtn}
              className={`w-full bg-orange-800 text-white rounded-full py-2 px-4 hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                animationState.searchBtn ? 'animate-pulse' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>

      {/* City Selection Popup - Responsive for all screens */}
      {popupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fade-in p-4">
          <div className="bg-white w-full max-w-4xl p-4 lg:p-6 relative animate-scale-up rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
            <button
              onClick={() => setPopupOpen(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <FaTimes className="text-xl transform hover:rotate-90 transition-transform duration-300" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Select a City</h2>
            <input
              type="text"
              placeholder="Search or type city to select"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 mb-4 border focus:ring-2 focus:ring-orange-500 outline-none transition-all duration-300 rounded-md"
              autoFocus
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto flex-grow">
              {filteredCities.map((city, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center cursor-pointer hover:bg-orange-50 p-3 rounded-lg transition-all duration-300 transform hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleCitySelection(city)}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-full border-2 border-orange-300 transition-transform duration-300 hover:border-orange-500">
                    <img
                      src={`data:image/jpeg;base64,${city.image}`}
                      alt={city.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                  <span className="text-sm font-medium mt-2 text-center">{city.name}</span>
                  <span className="text-xs text-gray-500">{city.state}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Why Choose OKBikes Section - Responsive grid */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 py-10 lg:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-800 mb-6 lg:mb-8 animate-bounce-once">
            Why Choose OKBikes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {[
              {
                icon: <FaBicycle className="text-orange-600 text-3xl lg:text-4xl mb-3 lg:mb-4" />,
                text: "Wide range of bikes.",
              },
              {
                icon: <FaHandshake className="text-orange-500 text-3xl lg:text-4xl mb-3 lg:mb-4" />,
                text: "Affordable pricing.",
              },
              {
                icon: <FaPhone className="text-orange-500 text-3xl lg:text-4xl mb-3 lg:mb-4" />,
                text: "24/7 customer support.",
              },
              {
                icon: <FaCheck className="text-orange-500 text-3xl lg:text-4xl mb-3 lg:mb-4" />,
                text: "Easy booking process.",
              },
              {
                icon: (
                  <FaMapMarkerAlt className="text-orange-500 text-3xl lg:text-4xl mb-3 lg:mb-4" />
                ),
                text: "Multiple locations.",
              },
              {
                icon: (
                  <FaCreditCard className="text-orange-500 text-3xl lg:text-4xl mb-3 lg:mb-4" />
                ),
                text: "Secure payment.",
              },
            ].map((reason, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center bg-white p-4 lg:p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 feature-item rounded-lg"
              >
                <div className="transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
                  {reason.icon}
                </div>
                <p className="text-gray-800 font-medium">{reason.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to Book a Bike Section - Responsive grid */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 py-10 lg:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-800 mb-6 lg:mb-8 animate-pulse-once">
            How to Book a Bike
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {[
              {
                step: "Step 1",
                title: "Select Your Location",
                description:
                  "Choose a city or location where you want to rent a bike.",
              },
              {
                step: "Step 2",
                title: "Pick a Date & Time",
                description:
                  "Set your rental duration by selecting the start and end dates.",
              },
              {
                step: "Step 3",
                title: "Choose a Bike",
                description:
                  "Browse through our collection and pick a bike that suits your needs.",
              },
              {
                step: "Step 4",
                title: "Confirm Your Booking",
                description:
                  "Fill in your details, review the booking summary, and confirm your reservation.",
              },
              {
                step: "Step 5",
                title: "Make Payment",
                description:
                  "Use our secure payment options to complete the booking.",
              },
              {
                step: "Step 6",
                title: "Pick Up or Get Delivery",
                description:
                  "Pick up the bike from our location or get it delivered to your doorstep.",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center bg-gray-50 p-4 lg:p-6 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:scale-105 animate-slide-in-from-bottom rounded-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-orange-500 text-xl lg:text-2xl font-semibold mb-1 lg:mb-2">
                  {step.step}
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-1 lg:mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm lg:text-base">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Presence Section - Responsive grid */}
      <div className="py-10 lg:py-16 bg-gradient-to-r from-orange-500 to-orange-400">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-black mb-6 lg:mb-8 animate-float">
            Our Presence
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-6">
            {cities.map((city, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center hover:bg-white hover:bg-opacity-20 p-2 lg:p-3 rounded-lg transition-all duration-300 transform hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 overflow-hidden rounded-full mb-2 lg:mb-4 border-2 border-white transition-all duration-300 hover:border-orange-300">
                  <img
                    src={`data:image/jpeg;base64,${city.image}`}
                    alt={city.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                <p className="text-black font-medium text-sm lg:text-base">{city.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
