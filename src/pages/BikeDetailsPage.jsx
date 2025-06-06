import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaTags, FaCalendarAlt } from "react-icons/fa";
import { AiOutlineCaretDown, AiOutlineCaretUp } from "react-icons/ai";
import LoginPopup from "../components/LoginPopup";
import RegistrationPopup from "../components/RegistrationPopup";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalState } from "../context/GlobalStateContext";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, ChevronDown } from "lucide-react"; // Keeping ChevronDown for consistency if needed elsewhere

const BikeDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bike = location.state || {};
  const { formData, setFormData } = useGlobalState();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isRegistrationPopupOpen, setIsRegistrationPopupOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [oneDayPackage, setOneDayPackage] = useState(null);
  const [packageDropdownOpen, setPackageDropdownOpen] = useState(false);
  const [pickupOption, setPickupOption] = useState("SELF_PICKUP");
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const { token } = useAuth(); // Assuming useAuth provides the token
  const [addressDetails, setAddressDetails] = useState({
    fullAddress: "",
    pinCode: "",
    nearby: "",
  });

  const [addressErrors, setAddressErrors] = useState({
    fullAddress: false,
    pinCode: false,
  });
  const [rentalDays, setRentalDays] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem("jwtToken");
    if (storedToken) {
      setIsLoggedIn(true);
    }

    // Fetch packages if categoryId is available
    if (bike.categoryId) {
      fetchPackages(bike.categoryId);
    }

    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, [bike.categoryId]); // Dependency on bike.categoryId to re-fetch packages

  useEffect(() => {
    // Calculate rental days based on formData.startDate and endDate
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Use ceil to include partial days as full days if needed for calculation
      setRentalDays(diffDays > 0 ? diffDays : 1);
    }
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    // Automatically select the best package based on rentalDays
    if (packages.length > 0) {
      const bestPackage = findBestPackage(packages, rentalDays);
      setSelectedPackage(bestPackage);
      const oneDayPkg = packages.find((pkg) => pkg.days === 1);
      setOneDayPackage(oneDayPkg);
    }
  }, [rentalDays, packages]);

  const findBestPackage = (packages, days) => {
    // Sort packages by days in descending order to find the largest fitting package
    const sortedPackages = [...packages].sort((a, b) => b.days - a.days);
    for (const pkg of sortedPackages) {
      if (pkg.days <= days) {
        return pkg;
      }
    }
    // If no package fits, return the package with the minimum days (assuming it's always 1 day)
    return sortedPackages[sortedPackages.length - 1] || null;
  };

  const fetchPackages = async (categoryId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/package/list/${categoryId}`
      );
      const data = response.data;
      const activePackages = data.filter((pkg) => pkg.active && pkg.days > 0);
      setPackages(activePackages);
      if (activePackages.length > 0) {
        setSelectedPackage(findBestPackage(activePackages, rentalDays));
      } else {
        setSelectedPackage(null); // No active packages found
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      setPackages([]);
      setSelectedPackage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageSelection = (pkg) => {
    setSelectedPackage(pkg);
    setPackageDropdownOpen(false);
    if (pkg.days) {
      setRentalDays(pkg.days);
      const startDate = new Date(formData.startDate || new Date());
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + pkg.days);
      setFormData({
        ...formData,
        startDate: formatDateForInput(startDate),
        endDate: formatDateForInput(endDate),
        rentalDays: pkg.days,
      });
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedPackage || !oneDayPackage) {
      return 0;
    }
    const packagePrice = selectedPackage.price || 0;
    const extraDays = rentalDays - (selectedPackage.days || 0);
    const extraDaysPrice =
      extraDays > 0 ? extraDays * (oneDayPackage.price || 0) : 0;
    const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
    return packagePrice + extraDaysPrice + deliveryCharge;
  };

  const calculatePricePerUnit = () => {
    if (!selectedPackage || rentalDays === 0) return 0;
    const packagePrice = selectedPackage.price || 0;
    const extraDays = rentalDays - (selectedPackage.days || 0);
    const extraDaysPrice =
      extraDays > 0 && oneDayPackage
        ? extraDays * (oneDayPackage.price || 0)
        : 0;
    return (packagePrice + extraDaysPrice) / rentalDays;
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const totalPrice = calculateTotalPrice();

  const handleAddressChange = (field, value) => {
    setAddressDetails((prevDetails) => ({ ...prevDetails, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prevErrors) => ({ ...prevErrors, [field]: false }));
    }
  };

  const validateAddress = () => {
    const errors = {
      fullAddress: !addressDetails.fullAddress.trim(),
      pinCode: !addressDetails.pinCode.trim(),
    };
    setAddressErrors(errors);
    return !errors.fullAddress && !errors.pinCode;
  };

  const handleSaveAddress = () => {
    if (validateAddress()) {
      setShowAddressPopup(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedPackage) {
      alert("Please select a rental package before proceeding.");
      return;
    }
    if (pickupOption === "DELIVERY_AT_LOCATION") {
      if (!addressDetails.fullAddress || !addressDetails.pinCode) {
        setShowAddressPopup(true);
        return;
      }
    }
    setShowConfirmation(true);
  };

  const confirmCheckout = () => {
    const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
    const checkoutData = {
      bike,
      totalPrice: calculateTotalPrice(),
      selectedPackage,
      rentalDays,
      addressDetails,
      pickupOption,
      deliveryCharge,
      pricePerUnit: calculatePricePerUnit(),
      pickupDate: formData.startDate
        ? new Date(formData.startDate).toISOString()
        : new Date().toISOString(), // Ensure ISO string for consistency
      dropDate: formData.endDate
        ? new Date(formData.endDate).toISOString()
        : new Date().toISOString(),
      storeName: bike.storeName || "Our Store Location: Rental Street",
      storeId: bike.storeId,
    };

    if (!isLoggedIn) {
      sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));
      setIsLoginPopupOpen(true);
      setShowConfirmation(false);
      return;
    }

    setIsAnimating(true);
    setShowConfirmation(false);

    setTimeout(() => {
      navigate("/checkout", { state: checkoutData });
    }, 600);
  };

  const cancelCheckout = () => {
    setShowConfirmation(false);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setIsLoginPopupOpen(false);
    const savedData = sessionStorage.getItem("checkoutData");
    if (savedData) {
      navigate("/checkout", { state: JSON.parse(savedData) });
      sessionStorage.removeItem("checkoutData");
    }
  };

  const handleRegistrationSuccess = () => {
    setIsLoggedIn(true);
    setIsRegistrationPopupOpen(false);
    // If registration is successful, and there's saved checkout data, proceed to checkout
    const savedData = sessionStorage.getItem("checkoutData");
    if (savedData) {
      navigate("/checkout", { state: JSON.parse(savedData) });
      sessionStorage.removeItem("checkoutData");
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return "Select Date"; // More descriptive
    const date = new Date(datetime);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} // Changed initial opacity to 0 for a fade-in effect on page load
      animate={{ opacity: isAnimating ? 0 : 1 }}
      transition={{ duration: 0.6 }}
      className="container mx-auto py-6 px-4 md:px-6 lg:px-8 mt-20 relative min-h-screen" // Added min-h-screen for better layout
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {" "}
        {/* Adjusted gap */}
        {/* Bike Image Section */}
        <div className="flex flex-col items-center justify-center bg-white shadow-lg border border-gray-100 rounded-xl overflow-hidden p-4">
          {" "}
          {/* Enhanced styling */}
          <img
            src={
              bike.img ||
              "https://via.placeholder.com/400x300?text=Bike+Image+Not+Available"
            } // Better placeholder
            alt={bike.name || "Bike Image"}
            className="w-full max-w-md h-64 sm:h-80 md:h-96 object-contain mt-8 md:mt-12 lg:mt-16 xl:mt-20 transform transition-transform duration-500 hover:scale-105" // Responsive image size, added hover effect
          />
          <p className="mt-4 text-gray-500 text-xs italic text-center">
            *Images are for representation purposes only.
          </p>
        </div>
        {/* Bike Details and Checkout Section */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg space-y-6">
          {" "}
          {/* Adjusted padding and shadow */}
          <h2 className="text-3xl font-extrabold text-gray-800 border-b pb-3 mb-4">
            {" "}
            {/* Larger, bolder title */}
            {bike.model || "Bike Model Not Available"}
          </h2>
          {/* Packages Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-700 flex items-center">
              <FaTags className="inline mr-3 text-orange-500" /> Rental Packages
            </h3>
            <div className="relative">
              <button
                onClick={() => setPackageDropdownOpen(!packageDropdownOpen)}
                className={`py-3 px-5 border border-gray-300 w-full flex justify-between items-center rounded-lg text-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  packageDropdownOpen
                    ? "bg-orange-100 text-orange-800 border-orange-400"
                    : "bg-white text-gray-800"
                }`}
                aria-haspopup="listbox"
                aria-expanded={packageDropdownOpen}
              >
                <span>
                  {selectedPackage
                    ? `${
                        selectedPackage.days
                      } Days (₹${selectedPackage.price.toLocaleString()})`
                    : "Select a Package"}
                </span>
                {packageDropdownOpen ? (
                  <AiOutlineCaretUp className="ml-2 text-orange-600" />
                ) : (
                  <AiOutlineCaretDown className="ml-2 text-gray-500" />
                )}
              </button>
              <AnimatePresence>
                {packageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-20 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg w-full max-h-60 overflow-y-auto"
                    role="listbox"
                  >
                    {isLoading ? (
                      <p className="p-4 text-center text-gray-500">
                        Loading packages...
                      </p>
                    ) : packages.length > 0 ? (
                      packages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => handlePackageSelection(pkg)}
                          className={`block w-full text-left py-3 px-5 hover:bg-orange-50 text-base transition-all duration-200 ${
                            selectedPackage?.id === pkg.id
                              ? "bg-orange-200 font-semibold text-orange-900"
                              : "text-gray-800"
                          }`}
                          role="option"
                          aria-selected={selectedPackage?.id === pkg.id}
                        >
                          {pkg.days} Days (₹{pkg.price.toLocaleString()})
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-center text-gray-500">
                        No active packages available.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Rental Duration Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-700 flex items-center">
              <FaCalendarAlt className="inline mr-3 text-orange-500" /> Your
              Rental Duration
            </h3>
            <div className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="mb-1">
                <span className="font-medium">Pickup Date:</span>{" "}
                {formatDateTime(formData.startDate)}
              </p>
              <p className="mb-1">
                <span className="font-medium">Drop-off Date:</span>{" "}
                {formatDateTime(formData.endDate)}
              </p>
              <p>
                <span className="font-medium">Calculated Duration:</span>{" "}
                {rentalDays} Day{rentalDays !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Pickup Option Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-700 flex items-center">
              <FaMapMarkerAlt className="inline mr-3 text-orange-500" /> Choose
              Pickup Option
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setPickupOption("SELF_PICKUP")}
                className={`flex-1 py-3 px-5 border-2 rounded-lg text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  pickupOption === "SELF_PICKUP"
                    ? "bg-orange-400 text-white border-orange-400 shadow-md"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Self Pickup
              </button>
              <button
                onClick={() => {
                  setPickupOption("DELIVERY_AT_LOCATION");
                  setShowAddressPopup(true);
                }}
                className={`flex-1 py-3 px-5 border-2 rounded-lg text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                  pickupOption === "DELIVERY_AT_LOCATION"
                    ? "bg-orange-400 text-white border-orange-400 shadow-md"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Delivery at Location
              </button>
            </div>
            {pickupOption === "DELIVERY_AT_LOCATION" &&
              addressDetails.fullAddress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <p className="text-sm font-semibold text-orange-700 mb-1">
                    Delivery Address:
                  </p>
                  <p className="text-sm text-gray-700">
                    {addressDetails.fullAddress}
                  </p>
                  {addressDetails.pinCode && (
                    <p className="text-sm text-gray-700">
                      Pin Code: {addressDetails.pinCode}
                    </p>
                  )}
                  {addressDetails.nearby && (
                    <p className="text-sm text-gray-700">
                      Landmark: {addressDetails.nearby}
                    </p>
                  )}
                  <button
                    onClick={() => setShowAddressPopup(true)}
                    className="text-xs text-blue-600 mt-2 hover:underline font-medium"
                  >
                    Edit Address
                  </button>
                </motion.div>
              )}
          </div>
          {/* Price Breakdown */}
          <div className="mt-6 space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-3 mb-2">
              Order Summary:
            </h3>
            {selectedPackage ? (
              <>
                <div className="flex justify-between text-base text-gray-700">
                  <span>
                    {selectedPackage.days} Day
                    {selectedPackage.days !== 1 ? "s" : ""} Package:
                  </span>
                  <span>₹{selectedPackage.price.toLocaleString()}</span>
                </div>
                {rentalDays > selectedPackage.days && oneDayPackage && (
                  <div className="flex justify-between text-base text-gray-700">
                    <span>
                      Extra {rentalDays - selectedPackage.days} Day
                      {rentalDays - selectedPackage.days !== 1 ? "s" : ""}:
                    </span>
                    <span>
                      ₹
                      {(
                        (rentalDays - selectedPackage.days) *
                        oneDayPackage.price
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {pickupOption === "DELIVERY_AT_LOCATION" && (
                  <div className="flex justify-between text-base text-gray-700">
                    <span>Delivery Charge:</span>
                    <span>₹250.00</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">
                Please select a package to see price breakdown.
              </p>
            )}
            <hr className="my-4 border-gray-300" />
            <div className="flex justify-between text-2xl font-extrabold text-orange-600">
              <span>Total Payable:</span>
              <span>₹{totalPrice.toFixed(2).toLocaleString()}</span>
            </div>
          </div>
          {/* Proceed to Checkout Button */}
          <button
            onClick={handleProceedToCheckout}
            disabled={isLoading || !selectedPackage}
            className={`w-full py-4 bg-orange-500 text-white text-xl font-semibold rounded-lg hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 ${
              isLoading || !selectedPackage
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
          >
            {isLoading ? "Processing..." : "Proceed to Checkout"}
          </button>
          {/* Login/Registration Popups */}
          {isLoginPopupOpen && (
            <LoginPopup
              onClose={() => setIsLoginPopupOpen(false)}
              onLogin={handleLoginSuccess}
              openRegistration={() => {
                setIsLoginPopupOpen(false);
                setIsRegistrationPopupOpen(true);
              }}
            />
          )}
          {isRegistrationPopupOpen && (
            <RegistrationPopup
              onClose={() => setIsRegistrationPopupOpen(false)}
              onRegister={handleRegistrationSuccess} // Corrected prop name
              openLogin={() => {
                setIsRegistrationPopupOpen(false);
                setIsLoginPopupOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Delivery Address Popup */}
      <AnimatePresence>
        {showAddressPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg space-y-5 border-t-4 border-orange-500"
            >
              <h2 className="text-2xl font-bold text-gray-800 text-center">
                Enter Delivery Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="fullAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="fullAddress"
                    value={addressDetails.fullAddress}
                    onChange={(e) =>
                      handleAddressChange("fullAddress", e.target.value)
                    }
                    className={`w-full p-3 border rounded-lg text-base resize-none focus:outline-none focus:ring-2 ${
                      addressErrors.fullAddress
                        ? "border-red-500 ring-red-200"
                        : "border-gray-300 focus:border-orange-400 focus:ring-orange-200"
                    }`}
                    placeholder="House No., Street Name, Area..."
                    rows="3"
                    required
                  />
                  {addressErrors.fullAddress && (
                    <p className="text-red-500 text-xs mt-1">
                      Full address is required.
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="pinCode"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Pin Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pinCode"
                    type="tel"
                    value={addressDetails.pinCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d{0,6}$/.test(value)) {
                        handleAddressChange("pinCode", value);
                      }
                    }}
                    className={`w-full p-3 border rounded-lg text-base focus:outline-none focus:ring-2 ${
                      addressErrors.pinCode
                        ? "border-red-500 ring-red-200"
                        : "border-gray-300 focus:border-orange-400 focus:ring-orange-200"
                    }`}
                    placeholder="Enter Pincode"
                    maxLength="6"
                    required
                  />
                  {addressErrors.pinCode && (
                    <p className="text-red-500 text-xs mt-1">
                      Pin code is required and should be 6 digits.
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="nearby"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    id="nearby"
                    type="text"
                    value={addressDetails.nearby}
                    onChange={(e) =>
                      handleAddressChange("nearby", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:border-orange-400 focus:ring-orange-200"
                    placeholder="e.g., Near City Hospital"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddressPopup(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium"
                >
                  Save Address
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Popup */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-orange-500 max-w-md w-full text-center"
            >
              <CheckCircle className="text-orange-500 w-16 h-16 mx-auto mb-4" />{" "}
              {/* Larger icon */}
              <h3 className="text-2xl font-bold mb-3 text-gray-800">
                Confirm Your Rental
              </h3>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                You are about to rent the{" "}
                <span className="font-semibold">{bike.model}</span> for{" "}
                <span className="font-semibold">
                  {rentalDays} Day{rentalDays !== 1 ? "s" : ""}
                </span>
                .
                <br />
                Your total payable amount is:{" "}
                <span className="text-orange-600 font-extrabold text-xl">
                  ₹{totalPrice.toFixed(2).toLocaleString()}
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  onClick={cancelCheckout}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmCheckout}
                  className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-300 font-semibold"
                >
                  Confirm & Pay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BikeDetailsPage;
