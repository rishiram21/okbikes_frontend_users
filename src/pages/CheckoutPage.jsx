import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalState } from "../context/GlobalStateContext";
import {
  FaRegCalendarAlt,
  FaMapMarkerAlt,
  FaClipboardCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
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
  const [selectedCouponFromDropdown, setSelectedCouponFromDropdown] =
    useState("");
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


  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = localStorage.getItem("jwtToken");
        if (!storedToken) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BASE_URL}/users/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setBookingError(
          "Failed to load user profile. Please refresh the page or try again later."
        );
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/coupons/all`
        );
        setCoupons(response.data);
      } catch (error) {
        console.error("Failed to fetch coupons:", error);
        setCouponError(
          "Failed to load available coupons. You can still proceed without a coupon."
        );
      } finally {
        setCouponLoading(false);
      }
    };

    const loadCheckoutData = () => {
      const sessionData = sessionStorage.getItem("checkoutData");
      const termsAcceptedSession = sessionStorage.getItem("termsAccepted");

      if (location.state) {
        setCheckoutData(location.state);
        sessionStorage.setItem("checkoutData", JSON.stringify(location.state));
      } else if (sessionData) {
        setCheckoutData(JSON.parse(sessionData));
      }

      if (termsAcceptedSession) {
        setTermsAccepted(JSON.parse(termsAcceptedSession));
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
    }, 1000);

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
    totalPrice = 0,
  } = checkoutData;

  // console.log(selectedPackage.deposit);


  const depositAmount = selectedPackage?.deposit || 0;
  const deliveryCharge = pickupOption === "DELIVERY_AT_LOCATION" ? 250 : 0;
  const convenienceFee = 2;
  const basePrice = totalPrice;
  const taxableAmount = basePrice + deliveryCharge + convenienceFee;
  const gstAmount = basePrice * 0.18;
  const totalAmountBeforeDiscount =basePrice + deliveryCharge + gstAmount + depositAmount + convenienceFee;
  const payableAmount = Math.max(0, totalAmountBeforeDiscount - discount);

  const handleDropdownChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedCouponFromDropdown(selectedValue);
    if (selectedValue) {
      setCouponCode(selectedValue);
    }
    setCouponError("");
  };

  const handleApplyCoupon = async () => {
    const trimmedCouponCode = couponCode ? couponCode.trim() : "";
    const codeToApply = trimmedCouponCode || selectedCouponFromDropdown;

    if (!codeToApply) {
      setCouponError(
        "Please enter a coupon code or select one from the dropdown."
      );
      return;
    }

    if (!userData?.id) {
      setCouponError(
        "User data not loaded. Please refresh the page and try again."
      );
      return;
    }

    const payload = {
      couponCode: codeToApply,
      originalPrice: basePrice,
      user: userData.id,
    };

    try {
      setCouponError("");
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/coupons/apply`,
        payload
      );

      if (response.status === 200) {
        const appliedCouponData = coupons.find(
          (coupon) => coupon.couponCode === codeToApply
        );

        if (appliedCouponData) {
          let calculatedDiscount = 0;

          if (appliedCouponData.couponType === "PERCENTAGE") {
            calculatedDiscount =
              (basePrice * appliedCouponData.discountValue) / 100;
          } else if (appliedCouponData.couponType === "FIXED_VALUE") {
            calculatedDiscount = appliedCouponData.discountValue;
          }

          calculatedDiscount = Math.min(
            calculatedDiscount,
            basePrice + deliveryCharge
          );

          setAppliedCoupon(appliedCouponData);
          setDiscount(calculatedDiscount);
          setCouponError("");
        } else {
          setCouponError(
            "Coupon applied but details not found. Please contact support."
          );
        }
      } else {
        setCouponError("Failed to apply coupon. Please try again.");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      const errorMessage =
        error.response?.data?.message ||
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
      setBookingError(
        "User data not loaded. Please refresh the page and try again."
      );
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
        throw new Error(
          "User data not available. Please refresh the page and try again."
        );
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
        deliveryLocation:
          pickupOption === "DELIVERY_AT_LOCATION"
            ? JSON.stringify(addressDetails)
            : "",
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

      const endpoint =
        paymentMethod === "ONLINE" ? "/booking/create" : "/booking/book";

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}${endpoint}`,
        bookingDetails,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Booking response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Booking creation failed:", error);

      let errorMessage = "Booking failed. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const handlePaymentSuccess = (bookingDataResponse) => {
    try {
      console.log("Payment success with booking data:", bookingDataResponse);

      const completeOrder = {
        ...bookingDataResponse,
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

      const docMessage =
        bookingDataResponse.documentMessage ||
        bookingDataResponse.message ||
        bookingDataResponse.data?.documentMessage ||
        bookingDataResponse.data?.message ||
        "";

      setDocumentMessage(docMessage);
      setBookingConfirmed(true);
      addOrder(completeOrder);

      setBookingError("");
      setShowPaymentMethods(false);
    } catch (error) {
      console.error("Error processing payment success:", error);
      setBookingError(
        "Booking completed but there was an issue processing the response. Please check your orders."
      );
    }
  };

  const handleCODPayment = async () => {
    setShowConfirmation(false);
    setShowPaymentMethods(false);
    setIsProcessing(true);
    setBookingError("");

    try {
      const bookingData = await createBooking("CASH_ON_CENTER");
      handlePaymentSuccess(bookingData);
    } catch (error) {
      console.error("COD Payment failed:", error);
      setBookingError(
        error.message || "Cash on Delivery booking failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);
    setBookingError("");

    try {
      const bookingDataFromAPI = await createBooking("ONLINE");
      setBookingData(bookingDataFromAPI);
      setShowPaymentMethods(true);
    } catch (error) {
      console.error("Online Payment setup failed:", error);
      setBookingError(
        error.message || "Online payment setup failed. Please try again."
      );
      setShowPaymentMethods(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Date(date).toLocaleDateString("en-GB", options);
  };

  if (!tokenLoaded || couponLoading || loadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">
            Fetching your rental details...
          </p>
        </div>
      </div>
    );
  }

  if (!userData && bookingError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center py-8 bg-white p-6 rounded-lg shadow-lg">
          <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4 font-semibold">{bookingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center py-8 bg-white p-6 rounded-lg shadow-lg">
          <p className="text-gray-700 mb-4">
            Attempting to load user profile...
          </p>
          <div className="animate-pulse text-orange-500 font-bold">
            Please wait
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-gray-100 pt-16 pb-8 mt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto py-8 px-4 lg:px-8 flex-grow">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-4">
              Your Rental Summary
            </h2>

            <div className="flex items-center space-x-6 bg-gray-50 p-4 rounded-lg">
              <img
                src={
                  bike?.img ||
                  "https://via.placeholder.com/150x100?text=Bike+Image"
                }
                alt={bike?.model}
                className="w-36 h-24 rounded-lg object-cover shadow-md"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {bike?.model}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Package: {selectedPackage?.days} Days (₹
                  {selectedPackage?.price})
                </p>
                <p className="text-sm text-gray-600">
                  Duration: {rentalDays} Day{rentalDays > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                <FaRegCalendarAlt className="inline mr-3 text-orange-500 text-2xl" />
                Pickup/Drop Dates
              </h3>
              <div className="grid grid-cols-2 gap-4 text-base">
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="font-medium text-gray-800">Pickup Date:</p>
                  <p className="text-blue-700">{formatDate(pickupDate)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-md">
                  <p className="font-medium text-gray-800">Drop Date:</p>
                  <p className="text-red-700">{formatDate(dropDate)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                <FaMapMarkerAlt className="inline mr-3 text-orange-500 text-2xl" />
                {pickupOption === "SELF_PICKUP"
                  ? "Self-Pickup Location"
                  : "Delivery Address"}
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg text-base text-gray-700">
                {pickupOption === "SELF_PICKUP" ? (
                  <p className="font-medium">
                    {storeName || "Our Main Rental Center"}
                  </p>
                ) : (
                  <>
                    <p className="font-medium">{addressDetails?.fullAddress}</p>
                    <p>Pin Code: {addressDetails?.pinCode}</p>
                    {addressDetails?.nearby && (
                      <p className="text-sm text-gray-500 mt-1">
                        Landmark: {addressDetails?.nearby}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* <div className="space-y-4 pt-4 border-t">
              <h3 className="text-xl font-semibold text-gray-700">
                Terms & Conditions
              </h3>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-2 bg-gray-50 p-4 rounded-lg">
                <li>
                  Valid Driving License (DL) and Aadhar Card (or Passport for
                  foreigners) are mandatory and must be presented at the time of
                  pickup.
                </li>
                <li>
                  Fuel costs are the responsibility of the renter. The vehicle
                  will be provided with a certain fuel level and must be
                  returned with the same level.
                </li>
                <li>
                  Late return of the vehicle will incur additional charges,
                  typically calculated per hour or per day beyond the agreed
                  drop-off time.
                </li>
                <li>
                  The vehicle must be returned in the same condition as it was
                  picked up, barring normal wear and tear. Any damages will be
                  assessed and deducted from the security deposit.
                </li>
                <li>
                  In case of breakdown or accident, the renter must immediately
                  inform the rental provider. Unauthorized repairs are not
                  permitted.
                </li>
                <li>
                  The security deposit is refundable after a thorough inspection
                  of the vehicle, typically within 3-7 business days, provided
                  there are no damages or outstanding dues.
                </li>
              </ul>
            </div> */}
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6 space-y-6 h-fit sticky top-20">
            <div className="space-y-4 pt-4">
              <h3 className="text-2xl font-bold text-gray-800">
                Price Details
              </h3>
              <div className="space-y-2 text-base text-gray-700">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>₹{basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>₹{deliveryCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Convenience Fee:</span>
                  <span>₹{convenienceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Security Deposit:</span>
                  <span>₹{depositAmount.toFixed(2)} (Refundable)</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t-2 border-gray-200 pt-3 mt-3">
                  <span>Total Payable:</span>
                  <span>₹{payableAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onChange={() => {
                    setTermsAccepted(!termsAccepted);
                    sessionStorage.setItem(
                      "termsAccepted",
                      JSON.stringify(!termsAccepted)
                    );
                  }}
                  className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="terms-checkbox"
                  className="text-base text-gray-700 cursor-pointer"
                >
                  I agree to the{" "}
                  <a href="/terms" className="text-blue-600 hover:underline">
                    terms & conditions
                  </a>
                </label>
              </div>

              <AnimatePresence>
                {showTermsError && (
                  <motion.div
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <FaExclamationTriangle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm font-medium">
                      Please accept the terms & conditions to proceed.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleConfirmationRequest}
                disabled={isProcessing || !userData}
                className={`w-full py-3 px-4 rounded-lg text-lg font-semibold transition-colors shadow-md ${
                  isProcessing || !userData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
              >
                {isProcessing
                  ? "Processing..."
                  : `Proceed to Payment: ₹${payableAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPaymentMethods && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Select Payment Method
              </h3>
              <div className="space-y-4">
                <button
                  onClick={handleCODPayment}
                  disabled={isProcessing}
                  className={`w-full bg-indigo-600 text-white py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors shadow-md ${
                    isProcessing ? "cursor-not-allowed opacity-75" : ""
                  }`}
                >
                  {isProcessing ? "Processing..." : "Cash on Center (COC)"}
                </button>

                {bookingData && (
                  <AsyncRazorpayButton
                    orderId={bookingData.orderId}
                    amount={payableAmount.toFixed(2)}
                    bikeModel={bike?.model}
                    customer={userData}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => {
                      console.error("Razorpay error:", error);
                      setBookingError(
                        error.message ||
                          "Online payment failed. Please try again."
                      );
                      setShowPaymentMethods(false);
                      setIsProcessing(false);
                    }}
                    buttonText="Pay Online (Razorpay)"
                  />
                )}
                {/* {!bookingData && (
                  // <button
                  //   onClick={handleOnlinePayment}
                  //   disabled={true}
                  //   className="w-full bg-green-500 text-white py-3 rounded-lg text-lg font-medium hover:bg-green-600 transition-colors shadow-md cursor-not-allowed opacity-75"
                  // >
                  //   Pay Online
                  // </button>
                )} */}
              </div>
              <button
                onClick={() => {
                  setShowPaymentMethods(false);
                  setBookingData(null);
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
                className="mt-6 w-full bg-gray-200 text-gray-700 py-3 rounded-lg text-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
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
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-xl shadow-3xl max-w-sm w-full text-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 100 }}
            >
              <motion.div
                className="w-28 h-28 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
              >
                <FaClipboardCheck className="text-6xl text-green-600" />
              </motion.div>

              <h2 className="text-3xl font-extrabold mt-6 mb-3 text-gray-900">
                Booking Confirmed!
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                Your booking for{" "}
                <span className="font-semibold">{bike?.model}</span> has been
                successfully placed.
              </p>

              {documentMessage && (
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-md text-left">
                  <p className="font-bold text-blue-900 mb-1">Important:</p>
                  <p className="text-sm">{documentMessage}</p>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  className="bg-orange-600 text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-orange-700 transition-colors shadow-md"
                  onClick={() => {
                    navigate("/orders");
                    sessionStorage.removeItem("checkoutData");
                    sessionStorage.removeItem("termsAccepted");
                  }}
                >
                  View My Bookings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingError && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-xl shadow-3xl max-w-sm w-full text-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 100 }}
            >
              <motion.div
                className="w-28 h-28 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
              >
                <FaExclamationTriangle className="text-6xl text-red-600" />
              </motion.div>

              <h2 className="text-3xl font-extrabold mt-6 mb-3 text-gray-900">
                Booking Failed!
              </h2>

              <p className="text-lg text-gray-700 mb-6">{bookingError}</p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  onClick={() => setBookingError("")}
                  className="py-3 px-6 bg-red-600 text-white rounded-md text-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
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