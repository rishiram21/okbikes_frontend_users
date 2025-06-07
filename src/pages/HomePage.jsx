import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBicycle,
  FaHandshake,
  FaPhone,
  FaCheck,
  FaMapMarkerAlt,
  FaCreditCard,
} from "react-icons/fa";
import { useGlobalState } from "../context/GlobalStateContext";
import axios from "axios";

const HomePage = () => {
  const navigate = useNavigate();
  const { formData, setFormData } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [selectedCityImage, setSelectedCityImage] = useState(
    "/banner.png"  
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
      setErrors({ location: "Please Select City and dates." });
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
          setAnimationState(prev => ({...prev, citySelection: false}));
        }, 300);
      }, 300);
    } else {
      setSelectedCityImage(`data:image/jpeg;base64,${city.image}`);
      setAnimationState(prev => ({...prev, citySelection: false}));
    }
  };

  const handleSearch = async () => {
    // Add button animation
    setAnimationState(prev => ({...prev, searchBtn: true}));

    if (!formData.location) {
      setErrors({ location: "Please Select City." });
      setAnimationState(prev => ({...prev, searchBtn: false}));
      return;
    }

    try {
      // Navigate immediately if bikes are already loaded
      if (availableBikes.length > 0) {
        navigate("/bike-list", { state: { formData } });
        setTimeout(() => {
        }, 100);

        return;
      }

      // If not loaded, fetch bikes with fast response
      const bikes = await fetchAvailableBikes();

      if (bikes.length > 0) {
        navigate("/bike-list", { state: { formData } });
        setTimeout(() => {
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
    }
  };

  const filteredCities = Array.isArray(cities)
    ? cities.filter((city) =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden mt-10">
      {/* Hero Section - Ultra Responsive for all devices */}
      <div className="flex flex-col xl:flex-row h-screen">
        {/* Image Section - 40% height on mobile, 50% width on desktop */}
        <div
          className="w-full xl:w-1/2 h-2/5 xl:h-full bg-cover bg-bottom main-banner city-image-container relative "
          style={{
            backgroundImage: `url('${selectedCityImage}')`,
            transition: 'opacity 0.3s ease-in-out',
            backgroundPosition: window.innerWidth < 768 ? 'center 1%' : 'center center',
          }}
        >
          {/* Overlay for better text readability on mobile */}
          <div className="absolute inset-0 bg-black bg-opacity-20 xl:hidden"></div>
        </div>

        {/* Form Section - 60% height on mobile, no spacing */}
        <div className="w-full xl:w-1/2 h-3/4 xl:h-full flex flex-col justify-center items-center px-4 xl:px-8 py-0 bg-gradient-to-r from-orange-600 to-orange-600 slide-in-right">
          <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-4xl font-bold text-white xl:mb-6 animate-pulse-once text-center leading-tight">
            Welcome to OkBikes
          </h1>
          
          <div className="bg-white p-4 xl:p-8 shadow-lg w-full max-w-sm xl:max-w-md booking-form rounded-lg">
            {/* Location Field */}
            <div className="mb-3 xl:mb-4">
              <label
                className="block text-orange-600 font-medium mb-2 text-base xl:text-base"
                htmlFor="location"
              >
                Select City
              </label>
              <select
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={(e) => {
                  const selectedCity = cities.find(city => city.name === e.target.value);
                  if (selectedCity) {
                    handleCitySelection(selectedCity);
                  }
                }}
                className={`w-full px-3 xl:px-4 py-2.5 xl:py-2 border outline-none focus:ring-2 focus:ring-orange-600 hover:shadow-md transition-all duration-300 rounded-md text-base xl:text-base ${
                  errors.location ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select City</option>
                {cities.map((city, index) => (
                  <option key={index} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.location && (
                <p className="text-red-500 text-sm xl:text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Start Date Field */}
            <div className="mb-3 xl:mb-4">
              <label
                className="block text-orange-600 font-medium mb-2 text-base xl:text-base"
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
                className={`w-full px-3 xl:px-4 py-2.5 xl:py-2 border outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-md transition-all duration-300 rounded-md text-base xl:text-base ${
                  errors.startDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm xl:text-sm mt-1">{errors.startDate}</p>
              )}
            </div>

            {/* End Date Field */}
            <div className="mb-4 xl:mb-6">
              <label
                className="block text-orange-600 font-medium mb-2 text-base xl:text-base"
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
                className={`w-full px-3 xl:px-4 py-2.5 xl:py-2 border outline-none focus:ring-2 focus:ring-orange-500 hover:shadow-md transition-all duration-300 rounded-md text-base xl:text-base ${
                  errors.endDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.endDate && (
                <p className="text-red-500 text-sm xl:text-sm mt-1">{errors.endDate}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading || animationState.searchBtn}
              className={`w-full bg-orange-600 text-white rounded-full py-3 xl:py-2 px-4 xl:px-4 hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 active:scale-95 text-base xl:text-base font-medium ${
                animationState.searchBtn ? 'animate-pulse' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Why Choose OkBikes Section - Ultra responsive grid */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-6 sm:mb-8 animate-bounce-once">
            Why Choose OkBikes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {[
              {
                icon: <FaBicycle className="text-orange-600 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />,
                text: "Wide range of bikes.",
              },
              {
                icon: <FaHandshake className="text-orange-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />,
                text: "Affordable pricing.",
              },
              {
                icon: <FaPhone className="text-orange-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />,
                text: "24/7 customer support.",
              },
              {
                icon: <FaCheck className="text-orange-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />,
                text: "Easy booking process.",
              },
              {
                icon: (
                  <FaMapMarkerAlt className="text-orange-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />
                ),
                text: "Multiple locations.",
              },
              {
                icon: (
                  <FaCreditCard className="text-orange-500 text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4" />
                ),
                text: "Secure payment.",
              },
            ].map((reason, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center bg-white p-4 sm:p-5 md:p-6 lg:p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 feature-item rounded-lg"
              >
                <div className="transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
                  {reason.icon}
                </div>
                <p className="text-gray-800 font-medium text-sm sm:text-base md:text-lg lg:text-xl">{reason.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to Book a Bike Section - Ultra responsive grid */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-6 sm:mb-8 animate-pulse-once">
            How to Book a Bike
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
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
                className="flex flex-col items-center text-center bg-gray-50 p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:scale-105 animate-slide-in-from-bottom rounded-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-orange-500 text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-2">
                  {step.step}
                </div>
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Presence Section - Responsive grid */}
      <div className="py-10 lg:py-16 bg-gradient-to-r from-orange-600 to-orange-600">
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










// import React, { useState, useEffect } from "react";
// import { 
//   FaBicycle, 
//   FaHandshake, 
//   FaPhone, 
//   FaCheck, 
//   FaMapMarkerAlt, 
//   FaCreditCard,
//   FaStar,
//   FaArrowRight,
//   FaCalendarAlt,
//   FaClock,
//   FaLocationArrow,
//   FaPlay
// } from "react-icons/fa";

// const HomePage = () => {
//   const [formData, setFormData] = useState({
//     location: null,
//     cityId: null,
//     startDate: '',
//     endDate: ''
//   });
//   const [searchTerm, setSearchTerm] = useState("");
//   const [errors, setErrors] = useState({});
//   const [selectedCityImage, setSelectedCityImage] = useState("/api/placeholder/800/600");
//   const [cities, setCities] = useState([
//     { id: 1, name: "Mumbai", image: "/api/placeholder/100/100" },
//     { id: 2, name: "Delhi", image: "/api/placeholder/100/100" },
//     { id: 3, name: "Bangalore", image: "/api/placeholder/100/100" },
//     { id: 4, name: "Chennai", image: "/api/placeholder/100/100" },
//     { id: 5, name: "Pune", image: "/api/placeholder/100/100" },
//     { id: 6, name: "Hyderabad", image: "/api/placeholder/100/100" }
//   ]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [currentTestimonial, setCurrentTestimonial] = useState(0);

//   const testimonials = [
//     {
//       name: "Rajesh Kumar",
//       rating: 5,
//       text: "Amazing service! The bike was in perfect condition and the booking process was super smooth.",
//       city: "Mumbai"
//     },
//     {
//       name: "Priya Sharma",
//       rating: 5,
//       text: "Great experience! Affordable prices and excellent customer support. Highly recommended!",
//       city: "Delhi"
//     },
//     {
//       name: "Amit Patel",
//       rating: 4,
//       text: "Very convenient and reliable. The delivery was on time and the bike was exactly as described.",
//       city: "Bangalore"
//     }
//   ];

//   const formatDateForInput = (date) => {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const day = String(date.getDate()).padStart(2, "0");
//     const hours = String(date.getHours()).padStart(2, "0");
//     const minutes = String(date.getMinutes()).padStart(2, "0");
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   };

//   const roundToNextHour = (date) => {
//     const roundedDate = new Date(date);
//     roundedDate.setHours(roundedDate.getHours() + 1, 0, 0, 0);
//     return roundedDate;
//   };

//   useEffect(() => {
//     window.scrollTo(0, 0);
    
//     const currentDate = new Date();
//     const roundedStartDate = roundToNextHour(currentDate);
//     const roundedEndDate = new Date(roundedStartDate);
//     roundedEndDate.setDate(roundedStartDate.getDate() + 1);

//     setFormData({
//       location: null,
//       cityId: null,
//       startDate: formatDateForInput(roundedStartDate),
//       endDate: formatDateForInput(roundedEndDate),
//     });

//     // Testimonial rotation
//     const testimonialInterval = setInterval(() => {
//       setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
//     }, 4000);

//     return () => clearInterval(testimonialInterval);
//   }, []);

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;

//     if (name === 'startDate') {
//       const selectedDate = new Date(value);
//       const currentDate = new Date();

//       if (selectedDate < currentDate) {
//         setFormData((prevData) => ({
//           ...prevData,
//           [name]: formatDateForInput(roundToNextHour(currentDate))
//         }));
//         setErrors((prevErrors) => ({
//           ...prevErrors,
//           [name]: "Past dates cannot be selected. Reset to current time."
//         }));
//         return;
//       }

//       if (formData.endDate && new Date(formData.endDate) < new Date(value)) {
//         const newEndDate = new Date(value);
//         newEndDate.setDate(newEndDate.getDate() + 1);
//         newEndDate.setHours(new Date(value).getHours(), new Date(value).getMinutes());

//         setFormData((prevData) => ({
//           ...prevData,
//           [name]: value,
//           endDate: formatDateForInput(newEndDate)
//         }));
//         return;
//       }
//     }

//     if (name === 'endDate') {
//       const startDate = new Date(formData.startDate);
//       const selectedEndDate = new Date(value);

//       if (selectedEndDate <= startDate) {
//         const newEndDate = new Date(startDate);
//         newEndDate.setDate(startDate.getDate() + 1);
//         newEndDate.setHours(startDate.getHours(), startDate.getMinutes());

//         setFormData((prevData) => ({
//           ...prevData,
//           [name]: formatDateForInput(newEndDate)
//         }));
//         setErrors((prevErrors) => ({
//           ...prevErrors,
//           [name]: "End date must be after start date."
//         }));
//         return;
//       }
//     }

//     setFormData((prevData) => ({ ...prevData, [name]: value }));
//     setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
//   };

//   const handleCitySelection = (city) => {
//     setFormData((prevData) => ({
//       ...prevData,
//       location: city.name,
//       cityId: city.id,
//     }));
//     setSelectedCityImage(city.image);
//   };

//   const handleSearch = async () => {
//     if (!formData.location) {
//       setErrors({ location: "Please select a city." });
//       return;
//     }
    
//     setIsLoading(true);
//     // Simulate API call
//     setTimeout(() => {
//       setIsLoading(false);
//       alert("Searching for available bikes...");
//     }, 1500);
//   };

//   return (
//     <div className="flex flex-col min-h-screen bg-gradient-to-br from-orange-50 to-white overflow-x-hidden">
      
//       {/* Hero Section */}
//       <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 overflow-hidden">
//         {/* Animated Background Elements */}
//         <div className="absolute inset-0 overflow-hidden">
//           <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full animate-pulse"></div>
//           <div className="absolute top-1/4 right-10 w-20 h-20 bg-white/10 rounded-full animate-bounce"></div>
//           <div className="absolute bottom-20 left-1/4 w-32 h-32 bg-white/5 rounded-full animate-pulse"></div>
//           <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
//           <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping"></div>
//         </div>

//         <div className="container mx-auto px-6 lg:px-8 relative z-10">
//           <div className="grid lg:grid-cols-2 gap-12 items-center">
            
//             {/* Left Content */}
//             <div className="text-center lg:text-left space-y-8 animate-fade-in">
//               <div className="space-y-4">
//                 <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
//                   Ride Your
//                   <span className="block text-yellow-300 animate-pulse">
//                     Adventure
//                   </span>
//                 </h1>
//                 <p className="text-xl md:text-2xl text-white/90 max-w-2xl">
//                   Discover the freedom of two wheels with OkBikes. Premium bikes, unbeatable prices, unforgettable journeys.
//                 </p>
//               </div>
              
//               {/* Stats */}
//               <div className="flex justify-center lg:justify-start space-x-8">
//                 <div className="text-center">
//                   <div className="text-3xl font-bold text-yellow-300">500+</div>
//                   <div className="text-white/80">Premium Bikes</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-3xl font-bold text-yellow-300">15+</div>
//                   <div className="text-white/80">Cities</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-3xl font-bold text-yellow-300">10K+</div>
//                   <div className="text-white/80">Happy Riders</div>
//                 </div>
//               </div>

//               {/* Quick Action Buttons */}
//               <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
//                 <button className="bg-white text-orange-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-yellow-50 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg">
//                   <FaPlay className="text-sm" />
//                   <span>Watch Demo</span>
//                 </button>
//                 <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-orange-600 transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2">
//                   <FaLocationArrow />
//                   <span>Find Bikes Near Me</span>
//                 </button>
//               </div>
//             </div>

//             {/* Right Content - Booking Form */}
//             <div className="relative">
//               <div className="bg-white/95 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20">
//                 <div className="text-center mb-6">
//                   <h2 className="text-2xl font-bold text-gray-800 mb-2">Book Your Ride</h2>
//                   <p className="text-gray-600">Start your journey in 3 easy steps</p>
//                 </div>

//                 <div className="space-y-6">
//                   {/* Location Field */}
//                   <div className="space-y-2">
//                     <label className="flex items-center text-gray-700 font-medium">
//                       <FaMapMarkerAlt className="mr-2 text-orange-500" />
//                       Select City
//                     </label>
//                     <select
//                       name="location"
//                       value={formData.location || ""}
//                       onChange={(e) => {
//                         const selectedCity = cities.find(city => city.name === e.target.value);
//                         if (selectedCity) {
//                           handleCitySelection(selectedCity);
//                         }
//                       }}
//                       className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 ${
//                         errors.location ? "border-red-500" : "border-gray-200 hover:border-orange-300"
//                       }`}
//                     >
//                       <option value="">Choose your city</option>
//                       {cities.map((city) => (
//                         <option key={city.id} value={city.name}>
//                           {city.name}
//                         </option>
//                       ))}
//                     </select>
//                     {errors.location && (
//                       <p className="text-red-500 text-sm flex items-center">
//                         <span className="mr-1">⚠️</span>
//                         {errors.location}
//                       </p>
//                     )}
//                   </div>

//                   {/* Date Fields */}
//                   <div className="grid sm:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <label className="flex items-center text-gray-700 font-medium">
//                         <FaCalendarAlt className="mr-2 text-orange-500" />
//                         Start Date
//                       </label>
//                       <input
//                         type="datetime-local"
//                         name="startDate"
//                         value={formData.startDate}
//                         min={formatDateForInput(new Date())}
//                         onChange={handleInputChange}
//                         className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 ${
//                           errors.startDate ? "border-red-500" : "border-gray-200 hover:border-orange-300"
//                         }`}
//                       />
//                       {errors.startDate && (
//                         <p className="text-red-500 text-sm">{errors.startDate}</p>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <label className="flex items-center text-gray-700 font-medium">
//                         <FaClock className="mr-2 text-orange-500" />
//                         End Date
//                       </label>
//                       <input
//                         type="datetime-local"
//                         name="endDate"
//                         value={formData.endDate}
//                         min={formData.startDate}
//                         onChange={handleInputChange}
//                         className={`w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 ${
//                           errors.endDate ? "border-red-500" : "border-gray-200 hover:border-orange-300"
//                         }`}
//                       />
//                       {errors.endDate && (
//                         <p className="text-red-500 text-sm">{errors.endDate}</p>
//                       )}
//                     </div>
//                   </div>

//                   {/* Search Button */}
//                   <button
//                     onClick={handleSearch}
//                     disabled={isLoading}
//                     className="w-full bg-gradient-to-r from-orange-600 to-red-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-700 hover:to-red-600 transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {isLoading ? (
//                       <>
//                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
//                         <span>Searching...</span>
//                       </>
//                     ) : (
//                       <>
//                         <span>Find Available Bikes</span>
//                         <FaArrowRight className="ml-2" />
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Features Section */}
//       <section className="py-20 bg-white">
//         <div className="container mx-auto px-6">
//           <div className="text-center mb-16">
//             <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
//               Why Choose OkBikes?
//             </h2>
//             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//               We're committed to providing you with the best bike rental experience
//             </p>
//           </div>

//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {[
//               {
//                 icon: <FaBicycle className="text-4xl text-orange-500" />,
//                 title: "Premium Fleet",
//                 description: "Wide range of well-maintained, premium bikes for every adventure"
//               },
//               {
//                 icon: <FaHandshake className="text-4xl text-orange-500" />,
//                 title: "Best Prices",
//                 description: "Competitive and transparent pricing with no hidden charges"
//               },
//               {
//                 icon: <FaPhone className="text-4xl text-orange-500" />,
//                 title: "24/7 Support",
//                 description: "Round-the-clock customer support for all your queries"
//               },
//               {
//                 icon: <FaCheck className="text-4xl text-orange-500" />,
//                 title: "Easy Booking",
//                 description: "Simple 3-step booking process that takes less than 2 minutes"
//               },
//               {
//                 icon: <FaMapMarkerAlt className="text-4xl text-orange-500" />,
//                 title: "Multiple Locations",
//                 description: "Available in 15+ cities with convenient pickup points"
//               },
//               {
//                 icon: <FaCreditCard className="text-4xl text-orange-500" />,
//                 title: "Secure Payments",
//                 description: "Multiple payment options with bank-level security"
//               }
//             ].map((feature, index) => (
//               <div
//                 key={index}
//                 className="group bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-100"
//               >
//                 <div className="flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
//                   {feature.icon}
//                 </div>
//                 <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
//                 <p className="text-gray-600 leading-relaxed">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* How It Works Section */}
//       <section className="py-20 bg-gradient-to-br from-gray-50 to-orange-50">
//         <div className="container mx-auto px-6">
//           <div className="text-center mb-16">
//             <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
//               How It Works
//             </h2>
//             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//               Get your bike in just a few simple steps
//             </p>
//           </div>

//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
//             {[
//               {
//                 step: "01",
//                 title: "Choose Location & Dates",
//                 description: "Select your preferred city and rental duration",
//                 color: "from-blue-500 to-cyan-500"
//               },
//               {
//                 step: "02",
//                 title: "Browse & Select Bike",
//                 description: "Choose from our wide range of premium bikes",
//                 color: "from-purple-500 to-pink-500"
//               },
//               {
//                 step: "03",
//                 title: "Book & Pay Securely",
//                 description: "Complete your booking with secure payment options",
//                 color: "from-green-500 to-teal-500"
//               },
//               {
//                 step: "04",
//                 title: "Verify Documents",
//                 description: "Quick verification of your driving license and ID",
//                 color: "from-yellow-500 to-orange-500"
//               },
//               {
//                 step: "05",
//                 title: "Pick Up or Delivery",
//                 description: "Collect from our location or get doorstep delivery",
//                 color: "from-red-500 to-pink-500"
//               },
//               {
//                 step: "06",
//                 title: "Enjoy Your Ride",
//                 description: "Hit the road and create unforgettable memories",
//                 color: "from-indigo-500 to-purple-500"
//               }
//             ].map((step, index) => (
//               <div
//                 key={index}
//                 className="relative group"
//               >
//                 <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-orange-200">
//                   <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} text-white font-bold text-xl mb-6 shadow-lg`}>
//                     {step.step}
//                   </div>
//                   <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
//                   <p className="text-gray-600 leading-relaxed">{step.description}</p>
//                 </div>
                
//                 {/* Connection Line */}
//                 {index < 5 && (
//                   <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-orange-300 to-transparent transform -translate-y-1/2"></div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section */}
//       <section className="py-20 bg-gradient-to-r from-orange-600 to-red-500 text-white">
//         <div className="container mx-auto px-6">
//           <div className="text-center mb-16">
//             <h2 className="text-4xl md:text-5xl font-bold mb-4">
//               What Our Riders Say
//             </h2>
//             <p className="text-xl text-white/90 max-w-2xl mx-auto">
//               Join thousands of satisfied customers who trust OkBikes
//             </p>
//           </div>

//           <div className="max-w-4xl mx-auto">
//             <div className="bg-white/10 backdrop-blur-lg p-8 md:p-12 rounded-3xl border border-white/20">
//               <div className="text-center">
//                 <div className="flex justify-center mb-6">
//                   {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
//                     <FaStar key={i} className="text-yellow-400 text-2xl mx-1" />
//                   ))}
//                 </div>
//                 <blockquote className="text-2xl md:text-3xl font-light mb-8 leading-relaxed">
//                   "{testimonials[currentTestimonial].text}"
//                 </blockquote>
//                 <div className="text-lg">
//                   <div className="font-semibold">{testimonials[currentTestimonial].name}</div>
//                   <div className="text-white/80">{testimonials[currentTestimonial].city}</div>
//                 </div>
//               </div>
//             </div>

//             {/* Testimonial Indicators */}
//             <div className="flex justify-center mt-8 space-x-3">
//               {testimonials.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => setCurrentTestimonial(index)}
//                   className={`w-3 h-3 rounded-full transition-all duration-300 ${
//                     index === currentTestimonial ? 'bg-white' : 'bg-white/40'
//                   }`}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Cities Section */}
//       <section className="py-20 bg-white">
//         <div className="container mx-auto px-6">
//           <div className="text-center mb-16">
//             <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
//               Our Presence
//             </h2>
//             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//               Available in major cities across India with more locations coming soon
//             </p>
//           </div>

//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
//             {cities.map((city, index) => (
//               <div
//                 key={city.id}
//                 className="group text-center p-6 rounded-2xl hover:bg-orange-50 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
//                 onClick={() => handleCitySelection(city)}
//               >
//                 <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300">
//                   <img
//                     src={city.image}
//                     alt={city.name}
//                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
//                   />
//                 </div>
//                 <h3 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors duration-300">
//                   {city.name}
//                 </h3>
//               </div>
//             ))}
//           </div>

//           <div className="text-center mt-12">
//             <button className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-700 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg">
//               Request New City
//             </button>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
//         <div className="container mx-auto px-6 text-center">
//           <h2 className="text-4xl md:text-5xl font-bold mb-6">
//             Ready to Start Your Journey?
//           </h2>
//           <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
//             Join thousands of riders who have chosen OkBikes for their adventures. 
//             Book your bike today and experience the freedom of the road.
//           </p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center">
//             <button 
//               onClick={handleSearch}
//               className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:from-orange-700 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
//             >
//               Book Now
//             </button>
//             <button className="border-2 border-white text-white px-10 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-gray-900 transform hover:scale-105 transition-all duration-300">
//               Download App
//             </button>
//           </div>
//         </div>
//       </section>

//       <style jsx>{`
//         @keyframes fade-in {
//           from { opacity: 0; transform: translateY(30px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fade-in {
//           animation: fade-in 1s ease-out;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default HomePage;