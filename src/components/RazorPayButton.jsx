import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const RazorpayButton = ({
  amount,
  bikeModel,
  customer,
  orderId,
  bookingId,
  handleOnlinePaymentSuccess,
}) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const loadScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        setIsScriptLoaded(true);
        return resolve(true);
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        setIsScriptLoaded(true);
        resolve(true);
      };

      script.onerror = () => {
        setIsScriptLoaded(false);
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!isScriptLoaded) {
      alert("Razorpay SDK failed to load. Please refresh the page.");
      return;
    }

    if (!bookingId) {
      console.error("Booking ID is required for payment");
      alert("Booking information is missing. Please try again.");
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) throw new Error("User not logged in.");

      const options = {
        key: "rzp_test_6iRE2VEfQ2p7qE",
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "VeGo Bike",
        description: `Booking for ${bikeModel}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const payload = {
              bookingId,
              orderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };

            const verifyRes = await axios.post(
              `${import.meta.env.VITE_BASE_URL}/booking/payment/verify`,
              payload,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyRes.status === 200) {
              handleOnlinePaymentSuccess();
              navigate("/orders");
            } else {
              throw new Error(verifyRes.data?.message || "Payment verification failed");
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            alert(err.message);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: customer?.name || "",
          email: customer?.email || "",
          contact: customer?.contact || "",
        },
        notes: {
          bookingId,
          bikeModel,
        },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on("payment.failed", (response) => {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

    } catch (err) {
      console.error("Payment error:", err);
      alert("Something went wrong during payment initialization.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadScript();
  }, []);

  return (
    <button
  onClick={handlePayment}
  disabled={!isScriptLoaded || isProcessing || !bookingId || !orderId}
  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
>
  {!bookingId ? "Preparing payment..." :
   isProcessing ? "Processing..." :
   isScriptLoaded ? `Pay ₹${(amount * 100).toFixed(2)}` :
   "Loading payment..."}
</button>

  );
};

export default RazorpayButton;