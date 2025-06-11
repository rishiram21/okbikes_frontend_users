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
    "/banner-okbike.png"  
  );
  const [cities, setCities] = useState([]);
  const [availableBikes, setAvailableBikes] = useState([]);
  const [lastFetchError, setLastFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [animationState, setAnimationState] = useState({
    searchBtn: false,
    citySelection: false,
  });

  const bikeCache = React.useRef(new Map());

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
    window.scrollTo(0, 0);

    setFormData((prevData) => ({
      ...prevData,
      location: null,
      cityId: null,
    }));

    const loadSequence = () => {
      setTimeout(() => {
        const mainBanner = document.querySelector(".main-banner");
        if (mainBanner) mainBanner.classList.add("active");

        setTimeout(() => {
          const bookingForm = document.querySelector(".booking-form");
          if (bookingForm) bookingForm.classList.add("active");

          setTimeout(() => {
            document
              .querySelectorAll(".feature-item")
              .forEach((item, index) => {
                setTimeout(() => {
                  item.classList.add("active");
                }, index * 100);
              });
          }, 300);
        }, 200);
      }, 100);
    };

    loadSequence();

    const fetchCities = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/city/all`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        const citiesData = response.data?.content || [];
        setCities(citiesData);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      }
    };

    fetchCities();
  }, [setFormData]);

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

    if (bikeCache.current.has(cacheKey) && !immediate) {
      const cachedData = bikeCache.current.get(cacheKey);
      setAvailableBikes(cachedData);
      setIsLoading(false);
      return cachedData;
    }

    const startTime = new Date(formData.startDate)
      .toISOString()
      .replace("T", " ")
      .split(".")[0];
    const endTime = new Date(formData.endDate)
      .toISOString()
      .replace("T", " ")
      .split(".")[0];

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

      if (bikeCache.current.size >= 10) {
        const oldestKey = bikeCache.current.keys().next().value;
        bikeCache.current.delete(oldestKey);
      }
      bikeCache.current.set(cacheKey, bikesData);

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

  useEffect(() => {
    let timeoutId;
    if (formData.location && formData.startDate && formData.endDate) {
      timeoutId = setTimeout(() => {
        fetchAvailableBikes(true);
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData.location, formData.startDate, formData.endDate]);

  const handleInputChange = (e) => {
  const { name, value } = e.target;

  if (name === "startDate") {
    const selectedDate = new Date(value);
    const currentDate = new Date();

    if (selectedDate < currentDate) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: formatDateForInput(roundToNextHour(currentDate)),
      }));
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]:
          "Past dates and times cannot be selected. Date and time have been reset to current time.",
      }));
      return;
    }

    if (formData.endDate && new Date(formData.endDate) < new Date(value)) {
      const newEndDate = new Date(value);
      newEndDate.setDate(newEndDate.getDate() + 1);
      newEndDate.setHours(
        new Date(value).getHours(),
        new Date(value).getMinutes()
      );

      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
        endDate: formatDateForInput(newEndDate),
      }));
      return;
    }
  }

  if (name === "endDate") {
    const startDate = new Date(formData.startDate);
    const selectedEndDate = new Date(value);

    if (selectedEndDate <= startDate) {
      const newEndDate = new Date(startDate);
      newEndDate.setDate(startDate.getDate() + 1);
      newEndDate.setHours(startDate.getHours(), startDate.getMinutes());

      setFormData((prevData) => ({
        ...prevData,
        [name]: formatDateForInput(newEndDate),
      }));
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]:
          "End date and time must be after start date and time. Date and time have been adjusted.",
      }));
      return;
    }

    // Check if the time difference is less than one hour
    const timeDifference = selectedEndDate - startDate;
    const oneHourInMilliseconds = 60 * 60 * 1000; // 1 hour in milliseconds

    if (timeDifference < oneHourInMilliseconds) {
      const newEndDate = new Date(startDate);
      newEndDate.setHours(startDate.getHours() + 1);

      setFormData((prevData) => ({
        ...prevData,
        [name]: formatDateForInput(newEndDate),
      }));
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]:
          "End date and time must be at least one hour after the start date and time. Date and time have been adjusted.",
      }));
      return;
    }
  }

  setFormData((prevData) => ({ ...prevData, [name]: value }));
  setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
};


  const handleCitySelection = (city) => {
    setAnimationState((prev) => ({ ...prev, citySelection: true }));

    setFormData((prevData) => ({
      ...prevData,
      location: city.name,
      cityId: city.id,
    }));

    const fadeOut = document.querySelector(".city-image-container");
    if (fadeOut) {
      fadeOut.classList.add("fade-out");

      setTimeout(() => {
        setSelectedCityImage(`data:image/jpeg;base64,${city.image}`);
        fadeOut.classList.remove("fade-out");
        fadeOut.classList.add("fade-in");

        setTimeout(() => {
          fadeOut.classList.remove("fade-in");
          setAnimationState((prev) => ({ ...prev, citySelection: false }));
        }, 300);
      }, 300);
    } else {
      setSelectedCityImage(`data:image/jpeg;base64,${city.image}`);
      setAnimationState((prev) => ({ ...prev, citySelection: false }));
    }
  };

  // const handleSearch = async () => {
  //   setAnimationState((prev) => ({ ...prev, searchBtn: true }));

  //   if (!formData.location) {
  //     setErrors({ location: "Please Select City." });
  //     setAnimationState((prev) => ({ ...prev, searchBtn: false }));
  //     return;
  //   }

  //   try {
  //     if (availableBikes.length > 0) {
  //       navigate("/bike-list", { state: { formData } });
  //       setTimeout(() => {}, 100);
  //       return;
  //     }

  //     const bikes = await fetchAvailableBikes();

  //     if (bikes.length > 0) {
  //       navigate("/bike-list", { state: { formData } });
  //       setTimeout(() => {}, 100);
  //     } else if (lastFetchError) {
  //       setErrors({ location: lastFetchError });
  //       setAnimationState((prev) => ({ ...prev, searchBtn: false }));
  //     } else {
  //       setAnimationState((prev) => ({ ...prev, searchBtn: false }));
  //     }
  //   } catch (error) {
  //     console.error("Navigation error:", error);
  //     setAnimationState((prev) => ({ ...prev, searchBtn: false }));
  //   }
  // };

  const handleSearch = async () => {
  // Add button animation
  setAnimationState(prev => ({...prev, searchBtn: true}));

  if (!formData.location) {
    setErrors({ location: "Please Select City." });
    setAnimationState(prev => ({...prev, searchBtn: false}));
    return;
  }

  try {
    // Navigate immediately without checking for available bikes
    navigate("/bike-list", { state: { formData } });
    setTimeout(() => {
    }, 100);
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
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      {/* Hero Section - Ultra Responsive for all devices */}
      <div className="flex flex-col xl:flex-row h-screen">
        <div
          className="w-full xl:w-1/2 h-2/5 xl:h-full bg-cover bg-bottom main-banner city-image-container relative "
          style={{
            backgroundImage: `url('${selectedCityImage}')`,
            transition: 'opacity 0.3s ease-in-out',
            backgroundPosition: window.innerWidth < 768 ? 'center 30%' : 'center center',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20 xl:hidden"></div>
        </div>

        {/* Form Section - 60% height on mobile, no spacing */}
        <div className="w-full xl:w-1/2 h-3/5 xl:h-full flex flex-col justify-center items-center px-4 xl:px-8 py-0 bg-gradient-to-r from-orange-600 to-orange-600 slide-in-right">
          <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-4xl font-bold text-white mb-4 xl:mb-6 animate-pulse-once text-center leading-tight">
            Welcome to OkBike
          </h1>

          <div className="bg-white p-8 xl:p-12 shadow-lg w-full max-w-xl booking-form rounded-lg">
            <div className="mb-4 xl:mb-5">
              <label
                className="block text-orange-800 font-medium mb-2 text-base xl:text-base"
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
                className={`w-full px-3 xl:px-4 py-2.5 xl:py-2 border outline-none focus:ring-2 focus:ring-orange-900 hover:shadow-md transition-all duration-300 rounded-md text-base xl:text-base ${
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

            <div className="mb-4 xl:mb-5">
              <label
                className="block text-orange-800 font-medium mb-2 text-base xl:text-base"
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
                className={`w-full px-4 py-3 border outline-none focus:ring-2 focus:ring-[#ec5a05] hover:shadow-md transition-all duration-300 rounded-md text-lg ${
                  errors.startDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>

            <div className="mb-6 xl:mb-8">
              <label
                className="block text-orange-800 font-medium mb-2 text-base xl:text-base"
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
                className={`w-full px-4 py-3 border outline-none focus:ring-2 focus:ring-[#ec5a05] hover:shadow-md transition-all duration-300 rounded-md text-lg ${
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
              className={`w-full bg-orange-800 text-white rounded-full py-3 xl:py-2 px-4 xl:px-4 hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 active:scale-95 text-base xl:text-base font-medium ${
                animationState.searchBtn ? 'animate-pulse' : ''
              }`}
            >
              {isLoading ? "Loading..." : "Book Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Why Choose OkBike Section - Ultra responsive grid */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-center text-gray-800 mb-8 animate-bounce-once">
            Why Choose OkBike
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
            {[
              {
                icon: (
                  <FaBicycle className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "Wide range of bikes.",
              },
              {
                icon: (
                  <FaHandshake className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "Affordable pricing.",
              },
              {
                icon: (
                  <FaPhone className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "24/7 customer support.",
              },
              {
                icon: (
                  <FaCheck className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "Easy booking process.",
              },
              {
                icon: (
                  <FaMapMarkerAlt className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "Multiple locations.",
              },
              {
                icon: (
                  <FaCreditCard className="text-[#ec5a05] text-4xl sm:text-5xl md:text-6xl mb-4" />
                ),
                text: "Secure payment.",
              },
            ].map((reason, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center bg-white p-5 sm:p-6 md:p-7 lg:p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 feature-item rounded-lg"
              >
                <div className="transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
                  {reason.icon}
                </div>
                <p className="text-gray-800 font-medium text-base sm:text-lg md:text-xl">
                  {reason.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to Book a Bike Section - Ultra responsive grid */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-center text-gray-800 mb-8 animate-pulse-once">
            How to Book a Bike
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
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
                className="flex flex-col items-center text-center bg-gray-50 p-5 sm:p-6 md:p-7 lg:p-8 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:scale-105 animate-slide-in-from-bottom rounded-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-[#ec5a05] text-xl sm:text-2xl md:text-3xl font-semibold mb-3">
                  {step.step}
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-base sm:text-lg md:text-xl leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Presence Section - Responsive grid */}
      <div className="py-10 lg:py-16 bg-gradient-to-r from-orange-600 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-white mb-8 animate-float">
            Our Presence
          </h2>
          <div className="flex justify-center flex-wrap gap-4">
            {cities.map((city, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center hover:bg-white hover:bg-opacity-20 p-3 rounded-lg transition-all duration-300 transform hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 overflow-hidden rounded-full mb-3 border-2 border-white transition-all duration-300 hover:border-[#ec5a05]">
                  <img
                    src={`data:image/jpeg;base64,${city.image}`}
                    alt={city.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                <p className="text-black font-medium text-base">{city.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;