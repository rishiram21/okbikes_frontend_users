import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalState } from "../context/GlobalStateContext";
import { FaRegCalendarAlt, FaMapMarkerAlt, FaClipboardCheck, FaExclamationTriangle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import AsyncRazorpayButton from "../components/AsyncRazorpayButton";

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addOrder } = useGlobalState();
  const { token, tokenLoaded } = useAuth();

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
  const [userData, setUserData] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingData, setBookingData] = useState(null);

  // console.log("CheckoutPage - storeId:", checkoutData.storeId);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/users/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setBookingError("Failed to load user profile. Please try again.");
        // Don't navigate away immediately, give user a chance to retry
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/coupons/all`);
        setCoupons(response.data);
      } catch (error) {
        console.error("Failed to fetch coupons:", error);
        // Set a user-friendly error message but don't block the checkout
        setCouponError("Failed to load available coupons. You can still proceed without a coupon.");
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

    const intervalId = setInterval(() => {
      const sessionData = sessionStorage.getItem("checkoutData");
      if (sessionData) {
        setCheckoutData(JSON.parse(sessionData));
      }
    }, 1000); // Added missing interval time

    return () => clearInterval(intervalId);
  }, [location.state]);

  const {
    bike = {},
    rentalDays = 1,
    selectedPackage = {},
    addressDetails = {},
    pickupOption = "SELF_PICKUP",
    pickupDate = new Date(),
    dropDate = new Date(),
    storeName = "",
    totalPrice = 0
  } = checkoutData;

  const depositAmount = bike?.deposit || 0;
  const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
  const convenienceFee = 2;
  const basePrice = totalPrice;
  const taxableAmount = basePrice;
  const gstAmount = taxableAmount * 0.18;
  // const totalAmountBeforeDiscount = basePrice + deliveryCharge + gstAmount + depositAmount;
  // const payableAmount = Math.max(0, totalAmountBeforeDiscount - discount);
  const totalAmountBeforeDiscount = basePrice + deliveryCharge + gstAmount + depositAmount + convenienceFee;
  const payableAmount = Math.max(0, totalAmountBeforeDiscount - discount);

  const handleDropdownChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedCouponFromDropdown(selectedValue);
    if (selectedValue) {
      setCouponCode(selectedValue);
    }
    // Clear previous errors when user makes a new selection
    setCouponError("");
  };

  const handleApplyCoupon = async () => {
    const trimmedCouponCode = couponCode ? couponCode.trim() : "";
    const codeToApply = trimmedCouponCode || selectedCouponFromDropdown;

    if (!codeToApply) {
      setCouponError("Please enter a coupon code or select one from the dropdown.");
      return;
    }

    if (!userData?.id) {
      setCouponError("User data not loaded. Please refresh the page and try again.");
      return;
    }

    const payload = {
      couponCode: codeToApply,
      originalPrice: basePrice,
      user: userData.id,
    };

    try {
      setCouponError(""); // Clear previous errors
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

          calculatedDiscount = Math.min(calculatedDiscount, basePrice + deliveryCharge);

          setAppliedCoupon(appliedCouponData);
          setDiscount(calculatedDiscount);
          setCouponError("");
        } else {
          setCouponError("Coupon applied but details not found. Please contact support.");
        }
      } else {
        setCouponError("Failed to apply coupon. Please try again.");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data || 
                          "Error applying coupon. Please check the code and try again.";
      setCouponError(errorMessage);
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

    if (!userData) {
      setBookingError("User data not loaded. Please refresh the page and try again.");
      return;
    }

    setShowPaymentMethods(true);
  };

  const handlePayNow = () => {
    setShowConfirmation(true);
  };

  const createBooking = async (paymentMethod) => {
    try {
      if (!token) {
        throw new Error("User not logged in. Please log in and try again.");
      }

      if (!userData?.id) {
        throw new Error("User data not available. Please refresh the page and try again.");
      }

      const validPaymentMethods = ["CASH_ON_CENTER", "ONLINE"];
      if (!validPaymentMethods.includes(paymentMethod)) {
        throw new Error("Invalid payment method selected.");
      }

      const formatToLocalDateTime = (date) => {
        const d = new Date(date);
        return d.toISOString().slice(0, 19);
      };

      const bookingDetails = {
        vehicleId: bike.id,
        userId: userData.id,
        packageId: selectedPackage.id,
        totalAmount: payableAmount,
        addressType: pickupOption,
        deliveryLocation: pickupOption === "DELIVERY_AT_LOCATION" ? JSON.stringify(addressDetails) : "",
        deliverySelected: pickupOption === "DELIVERY_AT_LOCATION",
        startDate: formatToLocalDateTime(pickupDate),
        endDate: formatToLocalDateTime(dropDate),
        damage: 0.0,
        challan: 0.0,
        additionalCharges: 0.0,
        paymentMethod: paymentMethod,
        couponCode: appliedCoupon?.couponCode || null,
        deliveryCharge: deliveryCharge,
        depositAmount: depositAmount,
        storeId: checkoutData.storeId,
      };

      console.log("Sending booking details:", bookingDetails);

      const endpoint = paymentMethod === "ONLINE" ? "/booking/create" : "/booking/book";

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}${endpoint}`,
        bookingDetails,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Booking response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Booking creation failed:", error);
      
      // Extract meaningful error message
      let errorMessage = "Booking failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const handlePaymentSuccess = (bookingData) => {
    try {
      console.log("Payment success with booking data:", bookingData);
      
      const completeOrder = {
        ...bookingData,
        bikeDetails: bike,
        totalPrice: payableAmount,
        rentalDays,
        selectedPackage,
        pickupOption,
        addressDetails,
        pickupDate,
        dropDate,
        status: "Confirmed",
      };

      // Extract document message from various possible locations
      const docMessage = bookingData.documentMessage || 
                        bookingData.message || 
                        bookingData.data?.documentMessage || 
                        bookingData.data?.message || 
                        "";

      setDocumentMessage(docMessage);
      setBookingConfirmed(true);
      addOrder(completeOrder);
      
      // Clear any previous errors
      setBookingError("");
      setShowPaymentMethods(false);
    } catch (error) {
      console.error("Error processing payment success:", error);
      setBookingError("Booking completed but there was an issue processing the response. Please check your orders.");
    }
  };

  const handleCODPayment = async () => {
    setShowConfirmation(false);
    setShowPaymentMethods(false);
    setIsProcessing(true);
    setBookingError(""); // Clear previous errors

    try {
      const bookingData = await createBooking("CASH_ON_CENTER");
      handlePaymentSuccess(bookingData);
    } catch (error) {
      console.error("COD Payment failed:", error);
      setBookingError(error.message || "Cash on Delivery booking failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);
    setBookingError(""); // Clear previous errors

    try {
      const bookingData = await createBooking("ONLINE");
      setBookingData(bookingData);
      // Keep payment methods open for Razorpay integration
      setShowPaymentMethods(true);
    } catch (error) {
      console.error("Online Payment setup failed:", error);
      setBookingError(error.message || "Online payment setup failed. Please try again.");
      setShowPaymentMethods(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-GB', options);
  };

  // Show loading state
  if (!tokenLoaded || couponLoading || loadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  // Show error if userData failed to load
  if (!userData && !bookingError) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Failed to load user data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
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
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">
                <FaMapMarkerAlt className="inline mr-2 text-orange-500" />
                {pickupOption}
              </h3>
              <p className="text-sm text-gray-600">
                {pickupOption === "SELF_PICKUP" ? storeName : addressDetails?.fullAddress || "Our Store Location: Rental Street"}
              </p>
              {pickupOption === "DELIVERY_AT_LOCATION" && (
                <div>
                  <p className="text-sm text-gray-600">Pin Code: {addressDetails?.pinCode}</p>
                  <p className="text-sm text-gray-600">Nearby Landmark: {addressDetails?.nearby}</p>
                </div>
              )}
            </div>

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
            {/* <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Apply Coupon</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Select Available Coupon:</label>
                  <select
                    value={selectedCouponFromDropdown}
                    onChange={handleDropdownChange}
                    className="w-full p-2 border rounded"
                    disabled={coupons.length === 0}
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
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError(""); // Clear error when user types
                    }}
                    placeholder="Enter coupon code"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <button
                  onClick={handleApplyCoupon}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={(!couponCode.trim() && !selectedCouponFromDropdown) || !userData}
                >
                  Apply Coupon
                </button>

                {couponError && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-100 p-3 text-red-700 shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 flex-shrink-0 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.578-1.14.832-1.962L13.832 4.962a1.25 1.25 0 00-1.664 0L4.25 17.038c-.746.822-.222 1.962.832 1.962z"
                      />
                    </svg>
                    <p className="text-sm font-medium">{couponError}</p>
                  </div>
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
            </div> */}

            <div className="space-y-4">
  <h3 className="text-lg font-semibold text-gray-700">Price Details</h3>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span>Total Price:</span>
      <span>₹{basePrice}</span>
    </div>
    <div className="flex justify-between text-pink-500">
      <span>Delivery Charge:</span>
      <span>₹{deliveryCharge}</span>
    </div>
    <div className="flex justify-between text-pink-500">
      <span>Security Deposit:</span>
      <span className="text-green-500 font-semibold">
        (Refundable after trip) ₹{depositAmount}
      </span>
    </div>
    <div className="flex justify-between text-pink-500">
      <span>GST (18%):</span>
      <span>₹{gstAmount.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-pink-500">
      <span>Convenience Fee:</span>
      <span>₹{convenienceFee}</span>
    </div>
    {discount > 0 && (
      <div className="flex justify-between text-teal-500">
        <span>Discount:</span>
        <span>-₹{discount}</span>
      </div>
    )}
    <div className="flex justify-between font-semibold border-t pt-2">
      <span>Total Payable:</span>
      <span>₹{payableAmount.toFixed(2)}</span>
    </div>
  </div>
</div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={() => {
                    setTermsAccepted(!termsAccepted);
                    sessionStorage.setItem("termsAccepted", JSON.stringify(!termsAccepted));
                  }}
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
              
              <button
                onClick={handleConfirmationRequest}
                disabled={isProcessing || !userData}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${
                  isProcessing || !userData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                {isProcessing ? "Processing..." : `Confirm Booking: ₹${payableAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Modal */}
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
                  {isProcessing ? "Processing..." : "Cash on Delivery (COD)"}
                </button>

                {/* <AsyncRazorpayButton
                  bikeModel={bike?.model}
                  customer={userData}
                  createBooking={createBooking}
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => {
                    console.error("Razorpay error:", error);
                    setBookingError(error.message || "Payment failed. Please try again.");
                    setShowPaymentMethods(false);
                  }}
                /> */}
              </div>
              <button
                onClick={() => setShowPaymentMethods(false)}
                disabled={isProcessing}
                className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
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
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Booking</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to confirm your booking for {bike?.model}?</p>

              <div className="bg-orange-50 border border-orange-200 p-3 rounded-md mb-6">
                <p className="text-orange-700 font-medium">Total Amount: ₹{payableAmount.toFixed(2)}</p>
                <p className="text-orange-600 text-sm">Duration: {rentalDays} Days</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayNow}
                  className="flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  Confirm
                </button>
              </div>
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