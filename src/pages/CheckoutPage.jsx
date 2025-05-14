import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalState } from "../context/GlobalStateContext";
import { FaRegCalendarAlt, FaMapMarkerAlt, FaClipboardCheck, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import numberToWords from 'number-to-words';
import { useAuth } from "../context/AuthContext"; // Import useAuth for token management

const convertToWords = (amount) => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeesInWords = numberToWords.toWords(rupees);
  const paiseInWords = numberToWords.toWords(paise);
  return `${rupeesInWords} rupees and ${paiseInWords} paise`;
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addOrder, user } = useGlobalState();
  const { token } = useAuth(); // Use the token from AuthContext

  const [checkoutData, setCheckoutData] = useState(location.state || {});
  const [loadingData, setLoadingData] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [selectedCouponFromDropdown, setSelectedCouponFromDropdown] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [documentMessage, setDocumentMessage] = useState("");
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  // useEffect(() => {
  //   // Check if the URL already has our reload parameter
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const hasReloaded = urlParams.get('reloaded');

  //   if (!hasReloaded) {
  //     // Add the parameter and reload
  //     const newUrl = window.location.pathname + '?reloaded=true' +
  //                    (window.location.hash || '');
  //     window.location.href = newUrl;
  //   }
  // }, []);

  // Log the token when the component mounts
  useEffect(() => {
    console.log("Token from AuthContext:", token);
  }, [token]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/coupons/all`);
        setCoupons(response.data);
      } catch (error) {
        console.error("Failed to fetch coupons:", error);
      } finally {
        setCouponLoading(false);
      }
    };

    const loadCheckoutData = () => {
      const sessionData = sessionStorage.getItem("checkoutData");
      const termsAccepted = sessionStorage.getItem("termsAccepted");

      if (location.state) {
        setCheckoutData(location.state);
        sessionStorage.setItem("checkoutData", JSON.stringify(location.state));
      } else if (sessionData) {
        setCheckoutData(JSON.parse(sessionData));
      }

      if (termsAccepted) {
        setTermsAccepted(JSON.parse(termsAccepted));
      }
    };

    fetchCoupons();
    loadCheckoutData();
    setLoadingData(false);
  }, [location.state]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCheckboxChange = () => {
    // Store the current state in sessionStorage
    sessionStorage.setItem("termsAccepted", !termsAccepted);
    sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));

    // Reload the page
    window.location.reload();
  };

  const {
    bike = {},
    rentalDays = 1,
    selectedPackage = {},
    addressDetails = {},
    pickupOption = "SELF_PICKUP",
    pickupDate = new Date(),
    dropDate = new Date(),
    storeName = ""
  } = checkoutData;

  const depositAmount = bike?.deposit || 0;
  const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;

  // Calculate base price with extra days
  const packagePrice = selectedPackage?.price || 0;
  const extraDays = Math.max(rentalDays - (selectedPackage?.days || 0), 0);
  const extraDaysPrice = extraDays * (checkoutData.oneDayPackage?.price || 0);
  const basePrice = packagePrice + extraDaysPrice;

  // Calculate GST on (basePrice + deliveryCharge)
  const taxableAmount = basePrice + deliveryCharge;
  const gstAmount = taxableAmount * 0.18;

  // Calculate total amount before discount
  const totalAmountBeforeDiscount = basePrice + deliveryCharge + gstAmount + depositAmount;

  // Handle dropdown selection
  const handleDropdownChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedCouponFromDropdown(selectedValue);
    if (selectedValue) {
      setCouponCode(selectedValue);
    }
  };

  const handleApplyCoupon = async () => {
    const trimmedCouponCode = couponCode ? couponCode.trim() : "";
    const codeToApply = trimmedCouponCode || selectedCouponFromDropdown;

    if (!codeToApply) {
      setCouponError("Please enter a coupon code or select one from the dropdown.");
      return;
    }

    const payload = {
      couponCode: codeToApply,
      originalPrice: basePrice,
      user: user.id,
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/coupons/apply`, payload);

      if (response.status === 200) {
        const appliedCouponData = coupons.find(coupon => coupon.couponCode === codeToApply);

        if (appliedCouponData) {
          let calculatedDiscount = 0;

          if (appliedCouponData.couponType === 'PERCENTAGE') {
            calculatedDiscount = (basePrice * appliedCouponData.discountValue) / 100;
          } else if (appliedCouponData.couponType === 'FIXED_VALUE') {
            calculatedDiscount = appliedCouponData.discountValue;
          }

          // Ensure discount doesn't exceed total amount
          calculatedDiscount = Math.min(calculatedDiscount, basePrice + deliveryCharge);

          setAppliedCoupon(appliedCouponData);
          setDiscount(calculatedDiscount);
          setCouponError("");
        } else {
          setCouponError("Invalid coupon data.");
        }
      } else {
        setCouponError("Failed to apply coupon. Please try again.");
      }
    } catch (error) {
      setCouponError(error.response?.data || "Error applying coupon.");
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setSelectedCouponFromDropdown("");
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponError("");
  };

  const handleConfirmationRequest = () => {
    if (!termsAccepted) {
      setShowTermsError(true);
      setTimeout(() => setShowTermsError(false), 3000);
      return;
    }

    setShowPaymentMethods(true);
  };

  const handlePayNow = () => {
    setShowConfirmation(true);
  };

  const createBooking = async (paymentMethod) => {
    try {
      if (!token) throw new Error("User not logged in.");

      const formatToLocalDateTime = (date) => {
        const d = new Date(date);
        return d.toISOString().slice(0, 19);
      };

      const bookingDetails = {
        vehicleId: bike.id,
        userId: user.id,
        packageId: selectedPackage.id,
        totalAmount: totalAmountBeforeDiscount - discount,
        addressType: pickupOption,
        deliveryLocation: pickupOption === "DELIVERY_AT_LOCATION" ? JSON.stringify(addressDetails) : "",
        deliverySelected: pickupOption === "DELIVERY_AT_LOCATION",
        startTime: formatToLocalDateTime(pickupDate),
        endTime: formatToLocalDateTime(dropDate),
        damage: 0.0,
        challan: 0.0,
        additionalCharges: 0.0,
        paymentMethod: paymentMethod,
        couponCode: appliedCoupon?.code || null,
      };

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/booking/book`,
        bookingDetails,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data;
    } catch (error) {
      console.error("Booking creation failed:", error);
      throw error;
    }
  };

  const handlePaymentSuccess = (bookingData) => {
    const completeOrder = {
      ...bookingData,
      bikeDetails: bike,
      totalPrice: totalAmountBeforeDiscount - discount,
      rentalDays,
      selectedPackage,
      pickupOption,
      addressDetails,
      pickupDate,
      dropDate,
      status: "Confirmed",
    };

    setDocumentMessage(bookingData.documentMessage || "");
    setBookingConfirmed(true);
    addOrder({ completeOrder });
    navigate("/orders");
  };

  const handleCODPayment = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);

    try {
      const bookingData = await createBooking("CASH_ON_CENTER");
      handlePaymentSuccess(bookingData);
    } catch (error) {
      setBookingError(error.response?.data?.message || "Booking failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);

    try {
      const bookingData = await createBooking("ONLINE");
      handlePaymentSuccess(bookingData);
    } catch (error) {
      setBookingError(error.response?.data?.message || "Booking failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const [bookingError, setBookingError] = useState("");

  const formatDate = (date) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
  };

  if (loadingData || couponLoading) {
    return <div className="text-center py-8">Loading booking details...</div>;
  }

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-gray-100 mt-14"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto py-8 px-4 lg:px-8 flex-grow">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">Rental Summary</h2>

            <div className="flex items-center space-x-4">
              <img
                src={bike?.img || "/placeholder-image.jpg"}
                alt={bike?.model}
                className="w-[150px] h-[108px] rounded-lg object-cover"
              />
              <div>
                <h3 className="text-lg font-semibold">{bike?.model}</h3>
                <p className="text-sm text-gray-600">
                  Package: {selectedPackage?.days} Days (₹{selectedPackage?.price})
                </p>
                <p className="text-sm text-gray-600">Duration: {rentalDays} Days</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">
                <FaRegCalendarAlt className="inline mr-2 text-orange-500" />
                Pickup/Drop Dates
              </h3>
              <div className="flex items-center space-x-2">
                <div className="text-sm">
                  <p>Pickup: {formatDate(pickupDate)}</p>
                  <p>Drop: {formatDate(dropDate)}</p>
                </div>
              </div>
            </div>

            {pickupOption === "DELIVERY_AT_LOCATION" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  <FaMapMarkerAlt className="inline mr-2 text-orange-500" />
                  Delivery Address
                </h3>
                <p className="text-sm text-gray-600">
                  {addressDetails?.fullAddress || "Our Store Location: Rental Street"}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Terms & Conditions</h3>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Valid ID required at pickup</li>
                <li>Fuel costs borne by renter</li>
                <li>Late return penalties apply</li>
                <li>Vehicle must be returned in original condition</li>
              </ul>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Apply Coupon</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Select Available Coupon:</label>
                  <select
                    value={selectedCouponFromDropdown}
                    onChange={handleDropdownChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a Coupon</option>
                    {coupons.map((coupon) => (
                      <option key={coupon.couponId} value={coupon.couponCode}>
                        {coupon.couponCode} - {coupon.couponType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Or Enter Coupon Code:</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <button
                  onClick={handleApplyCoupon}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
                >
                  Apply Coupon
                </button>

                {couponError && (
                  <p className="text-red-500 text-sm mt-1">{couponError}</p>
                )}

                {appliedCoupon && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                    <p className="text-green-700 text-sm">
                      Applied: {appliedCoupon.couponCode} - {appliedCoupon.couponType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountValue} OFF`}
                    </p>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-500 text-xs underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Price Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>₹{basePrice}</span>
                </div>

                {deliveryCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span>₹{deliveryCharge}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="text-green-500 font-semibold">
                    (Refundable) ₹{depositAmount}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-teal-500">
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Payable:</span>
                  <span>₹{(totalAmountBeforeDiscount - discount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4"
                />
                <span className="text-sm">I agree to terms & conditions</span>
              </div>
              <AnimatePresence>
                {showTermsError && (
                  <motion.div
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Please accept the terms & conditions
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-left mt-1 font-semibold">
                Total Payment in Words: {convertToWords(totalAmountBeforeDiscount - discount)}
              </p>
            </div>

            <button
              onClick={handleConfirmationRequest}
              disabled={isProcessing}
              className={`w-full py-2 px-4 rounded-lg transition-colors ${
                isProcessing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {isProcessing ? "Processing..." : `Pay Now`}
            </button>
          </div>
        </div>
      </div>

      {/* <button
        onClick={handleRefresh}
        className="fixed bottom-4 right-4 bg-orange-500 text-white p-3 square shadow-lg z-50 flex items-center gap-2"
      >
        <FaSyncAlt size={24} />
      </button> */}

      <AnimatePresence>
        {showPaymentMethods && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full m-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Select Payment Method</h3>
              <div className="space-y-4">
                <button
                  onClick={handleCODPayment}
                  disabled={isProcessing}
                  className={`w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors ${
                    isProcessing ? "cursor-not-allowed opacity-75" : ""
                  }`}
                >
                  Cash on Delivery (COD)
                </button>

                <div className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-center">
                  Razorpay - Coming Soon
                </div>
              </div>
              <button
                onClick={() => setShowPaymentMethods(false)}
                disabled={isProcessing}
                className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingConfirmed && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <FaClipboardCheck className="text-5xl text-green-500" />
              </div>

              <h2 className="text-2xl font-bold mt-6 mb-2 text-gray-800">
                Booking Confirmed!
              </h2>

              <p className="text-gray-600 mb-6">
                Your booking for {bike?.model} has been successfully confirmed.
              </p>

              {documentMessage && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
                  <p className="font-bold">Document Verification Message:</p>
                  <p>{documentMessage}</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    navigate("/orders");
                  }}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingError && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.div
                  className="w-24 h-24 bg-red-100 rounded-full mx-auto flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 1, repeat: 3 }}
                >
                  <FaExclamationTriangle className="text-5xl text-red-500" />
                </motion.div>
              </motion.div>

              <motion.h2
                className="text-2xl font-bold mt-6 mb-2 text-gray-800"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Booking Failed
              </motion.h2>

              <motion.p
                className="text-gray-600 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {bookingError}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={() => setBookingError("")}
                  className="py-2 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CheckoutPage;
