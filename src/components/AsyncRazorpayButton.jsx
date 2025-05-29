import React, { useState } from "react";
import axios from "axios";
import RazorpayButton from "./RazorPayButton";

const AsyncRazorpayButton = ({
  bikeModel,
  customer,
  createBooking,
  onSuccess,
  onError
}) => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create booking (which includes Razorpay order creation)
      const bookingResponse = await createBooking("ONLINE"); // Ensure the correct payment method is passed

      // Validate critical response fields
      if (!bookingResponse?.bookingId) {
        throw new Error("Booking ID missing in response");
      }

      if (!bookingResponse?.orderId) {
        throw new Error("Razorpay order ID missing in response");
      }

      if (!bookingResponse?.totalAmount) {
        throw new Error("Payment amount missing in response");
      }

      setOrderData({
        bookingId: bookingResponse.bookingId,
        orderId: bookingResponse.orderId,
        amount: bookingResponse.totalAmount / 100, // Convert from paise to rupees
        documentMessage: bookingResponse.documentMessage || ""
      });

    } catch (err) {
      console.error("Booking initialization error:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = async () => {
    await initializeBooking();
  };

  if (loading) {
    return (
      <div className="w-full text-center py-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="text-sm text-gray-500">Creating your booking...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-4">
        <div className="text-red-500 mb-2">Failed to initialize payment: {error}</div>
        <button
          onClick={handlePaymentClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {orderData?.documentMessage && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
          {orderData.documentMessage}
        </div>
      )}

      {!orderData ? (
        <button
          onClick={handlePaymentClick}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
        >
          Proceed to Razorpay Payment
        </button>
      ) : (
        <RazorpayButton
          amount={orderData.amount}
          bikeModel={bikeModel}
          customer={customer}
          orderId={orderData.orderId}
          bookingId={orderData.bookingId}
          handleOnlinePaymentSuccess={() => onSuccess(orderData)}
        />
      )}
    </div>
  );
};

export default AsyncRazorpayButton;