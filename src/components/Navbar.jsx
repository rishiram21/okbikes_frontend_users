import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUser, FaPhoneAlt, FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { IoLocationOutline, IoChevronDown } from "react-icons/io5";
import { useGlobalState } from "../context/GlobalStateContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence

const Navbar = () => {
  const { formData, setFormData } = useGlobalState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [errors, setErrors] = useState({});
  const [datePickerVisible, setDatePickerVisible] = useState(false); // This state isn't directly used for display in the current render but kept for logic.
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for delete confirmation modal

  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const datePickerRef = useRef(null); // This ref isn't directly used for display but kept for logic.
  const dateDropdownRef = useRef(null);
  const { token, logout } = useAuth(); // Destructure logout from useAuth
  const { checkToken } = useAuth();

  // For debugging:
  const tokenStatus = checkToken();
  console.log("Token status:", tokenStatus);

  // Log the token when the component mounts and whenever it changes
  useEffect(() => {
    console.log("Token from AuthContext:", token);

    // Setup authenticated API headers if token exists
    if (token) {
      console.log("Setting up authenticated API with token");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem("formData"));
    if (storedData && Object.keys(storedData).length > 0) {
      setFormData(storedData);
    } else {
      // Set default dates if not already set
      const currentDateTime = new Date();
      const defaultStartDate = roundToNextHour(currentDateTime);
      const defaultEndDate = new Date(defaultStartDate);
      defaultEndDate.setDate(defaultEndDate.getDate() + 1);

      setFormData((prev) => ({
        ...prev,
        startDate: formatDateForInput(defaultStartDate),
        endDate: formatDateForInput(defaultEndDate),
      }));
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setFormData]);

  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      localStorage.setItem("formData", JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    const fetchUserData = async () => {
      const storedToken = localStorage.getItem("jwtToken"); // Use storedToken here
      if (storedToken) {
        setIsLoggedIn(true);
        try {
          const response = await fetch(
            `${import.meta.env.VITE_BASE_URL}/users/profile`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${storedToken}`, // Use storedToken for the request
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch user profile");
          }

          const data = await response.json();
          setUserData(data);
          localStorage.setItem("userData", JSON.stringify(data));
        } catch (error) {
          console.error("Error fetching user data:", error);
          localStorage.removeItem("jwtToken"); // Clear invalid token
          setIsLoggedIn(false);
          setUserData(null);
          navigate("/login"); // Redirect to login
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle profile dropdown
      if (
        isProfileDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }

      // Handle date dropdown (for mobile)
      if (
        isDateDropdownOpen &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target)
      ) {
        setIsDateDropdownOpen(false);
      }

      // Handle mobile menu
      if (isMobileMenuOpen) {
        const mobileMenuArea = document.getElementById("mobile-menu-area");
        const menuToggle = document.getElementById("mobile-menu-toggle");

        if (
          mobileMenuArea &&
          !mobileMenuArea.contains(event.target) &&
          menuToggle &&
          !menuToggle.contains(event.target)
        ) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isProfileDropdownOpen, isMobileMenuOpen, isDateDropdownOpen]);

  const formatDateTime = (datetime) => {
    if (!datetime) return "Select";
    const date = new Date(datetime);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatDateForDisplay = (startDate, endDate) => {
    if (!startDate || !endDate) return "Select dates";

    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleString("default", { month: "short" });
    const endMonth = end.toLocaleString("default", { month: "short" });

    return `${start.getDate()} ${startMonth} ${start.getFullYear()} ${formatTime(
      start
    )} -
            ${end.getDate()} ${endMonth} ${end.getFullYear()} ${formatTime(
      end
    )}`;
  };

  const handleLogout = async () => {
    try {
      // Assuming your backend logout endpoint doesn't require a body for POST
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Log the error but proceed with client-side logout anyway
        console.error(
          "Backend logout failed:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error during backend logout attempt:", error);
    } finally {
      logout(); // Use the logout function from AuthContext to clear token and user data
      // Close any open dropdowns/menus
      setIsProfileDropdownOpen(false);
      setIsMobileMenuOpen(false);
      setIsDateDropdownOpen(false);
      window.location.href = "/"; // Full reload to ensure state reset and redirect
    }
  };

  const handleDeleteAccount = async () => {
    setIsProfileDropdownOpen(false); // Close profile dropdown when delete modal opens
    setShowDeleteConfirm(true); // Open the custom confirmation modal
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteConfirm(false); // Close the modal immediately

    if (!userData || !userData.id) {
      console.error("User data not available for deletion.");
      // Using a custom alert/notification instead of window.alert()
      setErrors({ delete: "Could not delete account: User data not found." });
      setTimeout(() => setErrors((prev) => ({ ...prev, delete: "" })), 5000);
      return;
    }

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/delete-user/${userData.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
        }
      );

      if (response.status === 200) {
        setErrors({ delete: "Account deleted successfully!" });
        setTimeout(() => setErrors((prev) => ({ ...prev, delete: "" })), 5000);
        logout(); // Log out the user after successful deletion
        window.location.href = "/"; // Redirect to home or login page
      } else {
        const errorMsg =
          response.data?.message ||
          response.data ||
          "Failed to delete account.";
        setErrors({ delete: `Error: ${errorMsg}` });
        setTimeout(() => setErrors((prev) => ({ ...prev, delete: "" })), 5000);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred.";
      setErrors({ delete: `Error deleting account: ${errorMessage}` });
      setTimeout(() => setErrors((prev) => ({ ...prev, delete: "" })), 5000);
    }
  };

  const cancelDeleteAccount = () => {
    setShowDeleteConfirm(false); // Close the confirmation modal
  };

  // const handleInputChange = (e) => {
  //   const { name, value } = e.target;
  //   let updatedStartDate = formData.startDate;
  //   let updatedEndDate = formData.endDate;
  //   let dateError = null;

  //   if (name === "startDate") {
  //     const selectedDate = new Date(value);
  //     const currentDate = new Date();

  //     // Validate start date is not in the past
  //     if (selectedDate < currentDate) {
  //       const newStartDate = roundToNextHour(currentDate);
  //       updatedStartDate = formatDateForInput(newStartDate);
  //       dateError =
  //         "Past dates can't be selected. Date set to next available time.";
  //     } else {
  //       updatedStartDate = value;
  //     }

  //     // If end date exists and is before new start date, adjust end date
  //     if (
  //       formData.endDate &&
  //       new Date(formData.endDate) <= new Date(updatedStartDate)
  //     ) {
  //       const newEndDate = new Date(updatedStartDate);
  //       newEndDate.setDate(newEndDate.getDate() + 1);
  //       updatedEndDate = formatDateForInput(newEndDate);
  //     }
  //   }

  //   if (name === "endDate") {
  //     const selectedEndDate = new Date(value);
  //     const startDateObj = new Date(formData.startDate);

  //     // Validate end date is after start date
  //     if (selectedEndDate <= startDateObj) {
  //       const newEndDate = new Date(startDateObj);
  //       newEndDate.setDate(startDateObj.getDate() + 1);
  //       updatedEndDate = formatDateForInput(newEndDate);
  //       dateError = "End date must be after start date. Date adjusted.";
  //     } else {
  //       updatedEndDate = value;
  //     }
  //   }

  //   // Update state with validated dates
  //   setFormData((prevData) => ({
  //     ...prevData,
  //     startDate: updatedStartDate,
  //     endDate: updatedEndDate,
  //     [name]: name === "startDate" ? updatedStartDate : updatedEndDate,
  //   }));

  //   // Set error if any
  //   if (dateError) {
  //     setErrors((prev) => ({ ...prev, [name]: dateError }));
  //     // Clear error after 3 seconds
  //     setTimeout(() => {
  //       setErrors((prev) => ({ ...prev, [name]: "" }));
  //     }, 3000);
  //   }
  // };

  const handleInputChange = (e) => {
  const { name, value } = e.target;
  let updatedStartDate = formData.startDate;
  let updatedEndDate = formData.endDate;
  let dateError = null;

  if (name === "startDate") {
    const selectedDate = new Date(value);
    const currentDate = new Date();

    // Validate start date is not in the past
    if (selectedDate < currentDate) {
      const newStartDate = roundToNextHour(currentDate);
      updatedStartDate = formatDateForInput(newStartDate);
      dateError = "Past dates can't be selected. Date set to next available time.";
    } else {
      updatedStartDate = value;
    }

    // If end date exists and is before new start date, adjust end date
    if (formData.endDate && new Date(formData.endDate) <= new Date(updatedStartDate)) {
      const newEndDate = new Date(updatedStartDate);
      newEndDate.setDate(newEndDate.getDate() + 1);
      updatedEndDate = formatDateForInput(newEndDate);
    }
  }

  if (name === "endDate") {
    const selectedEndDate = new Date(value);
    const startDateObj = new Date(formData.startDate);

    // Validate end date is after start date
    if (selectedEndDate <= startDateObj) {
      const newEndDate = new Date(startDateObj);
      newEndDate.setDate(startDateObj.getDate() + 1);
      updatedEndDate = formatDateForInput(newEndDate);
      dateError = "End date must be after start date. Date adjusted.";
    } else {
      // Check if the time difference is less than one hour
      const timeDifference = selectedEndDate - startDateObj;
      const oneHourInMilliseconds = 60 * 60 * 1000; // 1 hour in milliseconds

      if (timeDifference < oneHourInMilliseconds) {
        const newEndDate = new Date(startDateObj);
        newEndDate.setHours(startDateObj.getHours() + 1);
        updatedEndDate = formatDateForInput(newEndDate);
        dateError = "End date must be at least one hour after start date. Date adjusted.";
      } else {
        updatedEndDate = value;
      }
    }
  }

  // Update state with validated dates
  setFormData((prevData) => ({
    ...prevData,
    startDate: name === "startDate" ? updatedStartDate : prevData.startDate,
    endDate: name === "endDate" ? updatedEndDate : prevData.endDate,
    [name]: name === "startDate" ? updatedStartDate : updatedEndDate,
  }));

  // Set error if any
  if (dateError) {
    setErrors((prev) => ({ ...prev, [name]: dateError }));
    // Clear error after 3 seconds
    setTimeout(() => {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }, 3000);
  } else {
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }
};

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

  const handleSearch = () => {
    if (!formData.location) {
      setErrors({ ...errors, location: "Please select a location." });

      // Clear error after 3 seconds
      setTimeout(() => {
        setErrors((prev) => ({ ...prev, location: "" }));
      }, 3000);
      return;
    }

    // Close mobile menu if open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }

    navigate("/bike-list", { state: { formData } });
  };

  // Format the date range for display
  const formatDateRangeForDisplay = () => {
    if (!formData.startDate || !formData.endDate) return "Select dates";

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Format: May 10, 2025 10:00 PM - May 11, 2025 10:00 PM
    return `${
      months[start.getMonth()]
    } ${start.getDate()}, ${start.getFullYear()} ${formatTime(start)} -
            ${
              months[end.getMonth()]
            } ${end.getDate()}, ${end.getFullYear()} ${formatTime(end)}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  const hideDateTimeRoutes = [
    "/",
    "/profile",
    "/contactus",
    "/orders",
    "/checkout",
    "/login",
    "/register",
    "/invoice/:bookingId",
  ];
  const shouldHideDateTime = hideDateTimeRoutes.includes(location.pathname);

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#ec5a05] text-gray-800 shadow-lg"
          : "bg-[#ec5a05] text-gray-800 shadow-md"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-800"
          >
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>

          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-1">
              <img
                src="/okloggo.jpeg"
                alt="OkBikes Logo"
                className="h-10 w-20 object-contain"
              />
            </Link>
          </div>

          {/* Location Display - Mobile (Optional: Add content here if needed) */}
          <div className="md:hidden flex items-center space-x-1 text-gray-600">
            {/* Location icon and text */}
          </div>

          {/* Desktop Components - hidden in mobile */}
          <div className="hidden md:flex items-center px-20 space-x-4 flex-grow justify-center">
            {formData.location && (
              <div className="flex items-center space-x-1 text-gray-600">
                {/* Location icon and text (Optional: Add content here if needed) */}
              </div>
            )}

            {!shouldHideDateTime && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    min={formatDateForInput(new Date())}
                    onChange={handleInputChange}
                    className="px-2 py-1 border rounded text-gray-700 bg-white"
                  />
                  {errors.startDate && (
                    <div className="absolute -bottom-6 left-0 text-xs text-red-500 bg-white p-1 rounded shadow">
                      {errors.startDate}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={handleInputChange}
                    className="px-2 py-1 border rounded text-gray-700 bg-white"
                  />
                  {errors.endDate && (
                    <div className="absolute -bottom-6 left-0 text-xs text-red-500 bg-white p-1 rounded shadow">
                      {errors.endDate}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-800">
              {/* Phone icon and number (Optional: Add content here if needed) */}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                ref={buttonRef}
                id="profile-dropdown-button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-1 p-2 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
              >
                <FaUser />
                <span className="hidden md:inline text-sm font-medium">
                  {isLoggedIn && userData?.name ? userData.name : "Login"}
                </span>
              </button>

              {isProfileDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-40"
                >
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link
                    to="/contactus"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    Contact Us
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  {isLoggedIn ? (
                    <>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Log Out
                      </button>
                      {/* <button
                        onClick={handleDeleteAccount}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 mt-1"
                      >
                        Delete Account
                      </button> */}
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Selector Bar - Mobile Only */}
      {!shouldHideDateTime && (
        <div className="md:hidden bg-gray-50 py-2 px-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center justify-between w-full text-gray-700 text-sm"
          >
            <div className="flex-1 truncate pr-2">
              {formatDateRangeForDisplay()}
            </div>
            <IoChevronDown
              className={`text-gray-500 transition-transform ${
                isDateDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      )}

      {/* Date Picker Dropdown - Mobile */}
      {isDateDropdownOpen && (
        <div
          ref={dateDropdownRef}
          className="md:hidden bg-white shadow-lg border-t border-gray-200 p-4 z-40 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                min={formatDateForInput(new Date())}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
              {errors.startDate && (
                <div className="text-xs text-red-500 mt-1">
                  {errors.startDate}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                min={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
              {errors.endDate && (
                <div className="text-xs text-red-500 mt-1">
                  {errors.endDate}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu (Full Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu-area"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-0 bg-white z-40 md:hidden overflow-y-auto"
          >
            <div className="flex justify-end p-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-800"
              >
                <FaTimes size={24} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-4">
              {/* Navigation Links */}
              <div className="space-y-1">
                <Link
                  to="/"
                  className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/profile"
                  className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
                <Link
                  to="/orders"
                  className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <Link
                  to="/contactus"
                  className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact Us
                </Link>
              </div>

              <div className="border-t border-gray-200 my-2"></div>

              {/* User Actions */}
              <div>
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={handleLogout}
                      className="w-full mt-3 px-3 py-3 text-base font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center"
                    >
                      <span>Log Out</span>
                    </button>
                    {/* <button
                      onClick={handleDeleteAccount}
                      className="w-full mt-2 px-3 py-3 text-base font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center"
                    >
                      <span>Delete Account</span>
                    </button> */}
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="w-full mt-3 px-3 py-3 text-base font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Login / Register</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error notifications */}
      <AnimatePresence>
        {errors.location && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center justify-center"
          >
            <span>{errors.location}</span>
          </motion.div>
        )}
        {errors.startDate && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center justify-center"
          >
            <span>{errors.startDate}</span>
          </motion.div>
        )}
        {errors.endDate && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center justify-center"
          >
            <span>{errors.endDate}</span>
          </motion.div>
        )}
        {errors.delete && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center justify-center"
          >
            <span>{errors.delete}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]" // Increased z-index
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Confirm Account Deletion
              </h3>
              <p className="text-gray-700 mb-6">
                Are you absolutely sure you want to delete your account? This
                action is irreversible. All your data, including bookings and
                profile information, will be permanently removed.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={cancelDeleteAccount}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Delete My Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
