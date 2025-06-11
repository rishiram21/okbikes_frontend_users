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
import { CheckCircle, ChevronDown } from 'lucide-react';

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
  const { token } = useAuth();
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
  const [rentalHours, setRentalHours] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullScreenTerms, setShowFullScreenTerms] = useState(false);

  const terms = [
    "The Responsibility of the vehicle will remain with the customer from the time of taking the vehicle from the company to the time of leaving the vehicle in the company.",
    "If there is any major, the bike will be cleared in insurance.",
    "The bike should be in the same condition as when it was taken.",
    "Since the vehicle has a GPS tracker, the customer will immediately notice wherever the vehicle goes.",
    "Once the bike has been booked, if the customer does not come to pick up the bike within the stipulated time or if the booking is cancelled, the booking amount will not be refunded.",
    "If the bike does not return within the given time, the company may charge extra charges.",
    "If the customer wants to extend the term, the customer should inform the company one day before the expiry of the term.",
    "If the bike is left outdoors, it is the customer's responsibility to return the bike to the company in the condition in which it was taken.",
    "If the customer leaves the bike in closed condition at the location, the deposit and rent will not be returned, and the company will take legal action against the customer.",
    "If the customer returns the bike before the tenure ends, the rent for the remaining days will not be refunded, only the deposit will be refunded.",
    "The case of damage to the two – wheeler on rent due to accident, mishandling, carelessness appropriate charges will be calculated by the company and the customer is liable to pay.",
    "In case of minor damages to the helmet. The customer is liable to pay a fine as per vendor.",
    "If the user damages the vehicles or gets a traffic challan, the money will be Deducted from the deposited amount.",
    "When the customer takes the bike for rent, there is enough petrol to go from go dawn to the petrol pump. When the customer returns the vehicle to the company, it is mandatory to keep enough petrol for the vehicle to reach the pump again.",
    "The deposit amount will be given to the customer within 24 hours after checking the vehicle Traffic challan.",
    "When the customer parks the vehicle in no parking, travels with a triple seat or drives on the wrong Side, then the customer is required to pay traffic toll charges. Company is not responsible for this."
  ];

  const FullScreenTermsModal = ({ terms, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Terms & Conditions</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            {terms.map((term, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600 text-sm leading-relaxed">{term}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-600">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">Additional Important Notes:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-orange-700">
              <div className="bg-white p-2 rounded text-center">
                <strong>Late Fee:</strong> ₹100/hour
              </div>
              <div className="bg-white p-2 rounded text-center">
                <strong>Cancellation:</strong> Not allowed
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      setIsLoggedIn(true);
    }

    if (bike.categoryId) {
      fetchPackages(bike.categoryId);
    }

    window.scrollTo(0, 0);
  }, [bike.categoryId]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setRentalDays(diffDays > 0 ? diffDays : 1);
      setRentalHours(diffHours);
    }
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    if (packages.length > 0) {
      const bestPackage = findBestPackage(packages, rentalDays);
      setSelectedPackage(bestPackage);
      const oneDayPkg = packages.find(pkg => pkg.days === 1);
      setOneDayPackage(oneDayPkg);
    }
  }, [rentalDays, packages]);

  const findBestPackage = (packages, days) => {
    const sortedPackages = [...packages].sort((a, b) => b.days - a.days);
    for (const pkg of sortedPackages) {
      if (pkg.days <= days) {
        return pkg;
      }
    }
    return sortedPackages[sortedPackages.length - 1];
  };

  const fetchPackages = async (categoryId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/package/list/${categoryId}`);
      const data = response.data;
      const activePackages = data.filter(pkg => pkg.active && pkg.days > 0);
      setPackages(activePackages);
      if (activePackages.length > 0) {
        setSelectedPackage(findBestPackage(activePackages, rentalDays));
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      setPackages([]);
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
        rentalDays: pkg.days
      });
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedPackage || !oneDayPackage) {
      return 0;
    }
    const packagePrice = selectedPackage.price || 0;
    const extraDays = rentalDays - (selectedPackage.days || 0);
    const extraDaysPrice = extraDays > 0 ? extraDays * (oneDayPackage.price || 0) : 0;
    const additionalHoursPrice = rentalHours * 100;
    const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
    return packagePrice + extraDaysPrice + additionalHoursPrice;
  };

  const calculatePricePerUnit = () => {
    if (!selectedPackage) return 0;
    const packagePricePerDay = selectedPackage.price / selectedPackage.days;
    const extraDaysPricePerDay = oneDayPackage.price;
    const totalDays = rentalDays;
    const packageDays = selectedPackage.days;
    const extraDays = totalDays - packageDays;
    if (extraDays > 0) {
      return (packagePricePerDay * packageDays + extraDaysPricePerDay * extraDays) / totalDays;
    }
    return packagePricePerDay;
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
      pinCode: !addressDetails.pinCode.trim()
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
    if (pickupOption === "DELIVERY_AT_LOCATION" && !addressDetails.fullAddress) {
      setShowAddressPopup(true);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmCheckout = () => {
    const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
    const checkoutData = {
      bike,
      totalPrice: calculateTotalPrice(),
      deposit: bike.deposit,
      selectedPackage,
      rentalDays,
      rentalHours,
      addressDetails,
      pickupOption,
      deliveryCharge,
      pricePerUnit: calculatePricePerUnit(),
      pickupDate: new Date(formData.startDate),
      dropDate: new Date(formData.endDate),
      storeName: bike.storeName || "Our Store Location: Rental Street",
      storeId: bike.storeId,
    };

    if (!isLoggedIn) {
      sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
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
    const savedData = sessionStorage.getItem('checkoutData');
    if (savedData) {
      navigate("/checkout", { state: JSON.parse(savedData) });
      sessionStorage.removeItem('checkoutData');
    }
  };

  const handleRegistrationSuccess = () => {
    setIsLoggedIn(true);
    setIsRegistrationPopupOpen(false);
  };

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

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isAnimating ? 0 : 1 }}
      transition={{ duration: 0.6 }}
      className="container mx-auto py-6 px-4 lg:px-6 mt-20 relative"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col shadow border items-center rounded-lg overflow-hidden">
          <img
            src={bike.img || "/placeholder-image.jpg"}
            alt={bike.name || "Bike Image"}
            className="w-96 h-auto object-contain mt-32"
          />
          <p className="mt-3 text-gray-500 text-xs italic">
            *Images are for representation purposes only.
          </p>
          <div className="mt-6 p-6 bg-gray-50 rounded-lg shadow-inner w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Terms & Conditions</h2>
            <div className="space-y-3">
              {terms.slice(0, 2).map((term, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600 text-sm leading-relaxed">{term}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowFullScreenTerms(true)}
              className="mt-4 flex items-center gap-2 text-orange-600 hover:text-orange-800 font-medium text-sm transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Read More ({terms.length - 4} more terms)
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">{bike.model || "Bike Name"}</h2>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              <FaTags className="inline mr-2 text-orange-400" /> Packages
            </h3>
            <div className="relative">
              <button
                onClick={() => setPackageDropdownOpen(!packageDropdownOpen)}
                className={`py-2 px-4 border w-full flex justify-between items-center rounded transition-all duration-300 ${
                  packageDropdownOpen ? "bg-orange-300 text-black" : "bg-white text-black"
                }`}
              >
                <span>
                  {selectedPackage
                    ? `${selectedPackage.days} Days (₹${selectedPackage.price})`
                    : "Select Package"}
                </span>
                {packageDropdownOpen ? <AiOutlineCaretUp className="ml-2" /> : <AiOutlineCaretDown className="ml-2" />}
              </button>
              {packageDropdownOpen && (
                <div className="absolute z-10 mt-2 bg-white border shadow-lg rounded w-full">
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handlePackageSelection(pkg)}
                        className={`block w-full text-left py-2 px-4 hover:bg-orange-100 text-sm transition-all duration-300 ${
                          selectedPackage?.id === pkg.id ? "bg-orange-300" : "text-gray-800"
                        }`}
                      >
                        {pkg.days} Days (₹{pkg.price})
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center p-2">No packages available</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              <FaCalendarAlt className="inline mr-2 text-orange-400" /> Rental Duration
            </h3>
            <div className="text-sm text-gray-600">
              <p>From: {formatDateTime(formData.startDate)}</p>
              <p>To: {formatDateTime(formData.endDate)}</p>
              <p>Duration: {rentalDays} Days {rentalHours > 0 && `+ ${rentalHours} Hours`}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              <FaMapMarkerAlt className="inline mr-2 text-orange-400" /> Pickup Option
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setPickupOption("SELF_PICKUP")}
                className={`py-2 px-4 border-2 rounded text-sm transition-all duration-300 ${
                  pickupOption === "SELF_PICKUP"
                    ? "bg-orange-300 text-black border-orange-300"
                    : "bg-white text-black border-orange-300"
                }`}
              >
                Self Pickup
              </button>
              <button
                onClick={() => {
                  setPickupOption("DELIVERY_AT_LOCATION");
                  setShowAddressPopup(true);
                }}
                className={`py-2 px-4 border-2 rounded text-sm transition-all duration-300 ${
                  pickupOption === "DELIVERY_AT_LOCATION"
                    ? "bg-orange-300 text-black border-orange-300"
                    : "bg-white text-black border-orange-300"
                }`}
              >
                Delivery at Location
              </button>
            </div>
            {pickupOption === "DELIVERY_AT_LOCATION" && addressDetails.fullAddress && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-800">Delivery Address:</p>
                <p className="text-sm text-gray-600">{addressDetails.fullAddress}</p>
                {addressDetails.pinCode && <p className="text-sm text-gray-600">Pin: {addressDetails.pinCode}</p>}
                {addressDetails.nearby && <p className="text-sm text-gray-600">Landmark: {addressDetails.nearby}</p>}
                <button
                  onClick={() => setShowAddressPopup(true)}
                  className="text-xs text-orange-500 mt-1 hover:text-orange-600"
                >
                  Edit Address
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-lg font-bold text-gray-800">Price Breakdown:</h3>
            {selectedPackage && (
              <>
                <p className="text-sm text-gray-600">
                  <strong>Package:</strong> {selectedPackage.days} Days (₹{selectedPackage.price})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Deposit:</strong> {selectedPackage.deposit}
                </p>
                {rentalHours > 0 && (
                  <p className="text-sm text-gray-600">
                    <strong>Additional Hours:</strong> {rentalHours} Hours (₹{rentalHours * 100})
                  </p>
                )}
              </>
            )}
            {pickupOption === "DELIVERY_AT_LOCATION" && (
              <p className="text-sm text-gray-600">
                <strong>Delivery Charge:</strong> ₹250
              </p>
            )}
            <hr className="my-2" />
            <h3 className="text-lg font-bold text-gray-800">
              Total Price: ₹{totalPrice.toFixed(2)}
            </h3>
          </div>

          <button
            onClick={handleProceedToCheckout}
            disabled={isLoading}
            className={`w-full py-3 bg-orange-400 text-white font-semibold rounded hover:bg-orange-500 transition-all duration-300 ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Processing..." : "Proceed to Checkout"}
          </button>

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
              openLogin={() => {
                setIsRegistrationPopupOpen(false);
                setIsLoginPopupOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {showAddressPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-[90%] space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">Enter Delivery Address</h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Full Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressDetails.fullAddress}
                onChange={(e) => handleAddressChange("fullAddress", e.target.value)}
                className={`w-full p-2 border rounded text-sm ${
                  addressErrors.fullAddress ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter full address"
                required
              />
              {addressErrors.fullAddress && (
                <p className="text-red-500 text-xs mt-1">Full address is required</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={addressDetails.pinCode}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (/^\d{0,6}$/.test(value))) {
                    handleAddressChange("pinCode", value);
                  }
                }}
                className={`w-full p-2 border rounded text-sm ${
                  addressErrors.pinCode ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter pin code"
                required
              />
              {addressErrors.pinCode && (
                <p className="text-red-500 text-xs mt-1">Pin code is required</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Nearby Landmark</label>
              <input
                type="text"
                value={addressDetails.nearby}
                onChange={(e) => handleAddressChange("nearby", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="Enter nearby landmark (optional)"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddressPopup(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-xl border-l-4 border-orange-400 max-w-md w-11/12"
            >
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Are you sure?</h3>
                <p className="text-center text-gray-600 mb-6">
                  Ready to proceed with your bike rental for {rentalDays} days {rentalHours > 0 && `+ ${rentalHours} hours`}?
                  <br />
                  Total amount: ₹{totalPrice.toFixed(2)}
                </p>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={cancelCheckout}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCheckout}
                    className="flex-1 py-2 px-4 bg-orange-400 text-white rounded hover:bg-orange-500 transition-all duration-300 font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showFullScreenTerms && (
        <FullScreenTermsModal
          terms={terms}
          onClose={() => setShowFullScreenTerms(false)}
        />
      )}
    </motion.div>
  );
};

export default BikeDetailsPage;