import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Add refs for input fields
  const mobileInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const navigate = useNavigate();

  const showAlert = (message) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/send-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: `+91${mobile}` }),
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP.");
      }

      setOtpSent(true);
      showAlert("OTP sent successfully!");

      // Focus on OTP input after a short delay to allow rendering
      setTimeout(() => {
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 4) { 
      setError("Enter a valid 4-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: `+91${mobile}`, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid OTP.");
      }

      // Store JWT token in localStorage
      localStorage.setItem("jwtToken", data.token);

      // Show success animation instead of text alert
      setShowSuccessAnimation(true);

      setTimeout(() => {
        navigate("/profile"); // Redirect to checkout or dashboard
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle key press events for both inputs
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // Handle resend OTP
  const handleResendOTP = () => {
    setOtp("");
    sendOTP();
  };

  // Success animation component
  const SuccessAnimation = () => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
        <div className="text-center">
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-600 mt-4">Login Successful!</h3>
          <p className="text-gray-600 mt-2">Redirecting you shortly...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <style jsx>{`
        .success-checkmark {
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        .check-icon {
          width: 80px;
          height: 80px;
          position: relative;
          border-radius: 50%;
          box-sizing: content-box;
          border: 4px solid #4CAF50;
        }
        .check-icon::before {
          top: 3px;
          left: -2px;
          width: 30px;
          transform-origin: 100% 50%;
          border-radius: 100px 0 0 100px;
        }
        .check-icon::after {
          top: 0;
          left: 30px;
          width: 60px;
          transform-origin: 0 50%;
          border-radius: 0 100px 100px 0;
          animation: rotate-circle 4.25s ease-in;
        }
        .check-icon::before, .check-icon::after {
          content: '';
          height: 100px;
          position: absolute;
          background: #FFFFFF;
          transform: rotate(-45deg);
        }
        .icon-line {
          height: 5px;
          background-color: #4CAF50;
          display: block;
          border-radius: 2px;
          position: absolute;
          z-index: 10;
        }
        .icon-line.line-tip {
          top: 46px;
          left: 14px;
          width: 25px;
          transform: rotate(45deg);
          animation: icon-line-tip 0.75s;
        }
        .icon-line.line-long {
          top: 38px;
          right: 8px;
          width: 47px;
          transform: rotate(-45deg);
          animation: icon-line-long 0.75s;
        }
        .icon-circle {
          top: -4px;
          left: -4px;
          z-index: 10;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          position: absolute;
          box-sizing: content-box;
          border: 4px solid rgba(76, 175, 80, .5);
        }
        .icon-fix {
          top: 8px;
          width: 5px;
          left: 26px;
          z-index: 1;
          height: 85px;
          position: absolute;
          transform: rotate(-45deg);
          background-color: #FFFFFF;
        }
        @keyframes rotate-circle {
          0% {
            transform: rotate(-45deg);
          }
          5% {
            transform: rotate(-45deg);
          }
          12% {
            transform: rotate(-405deg);
          }
          100% {
            transform: rotate(-405deg);
          }
        }
        @keyframes icon-line-tip {
          0% {
            width: 0;
            left: 1px;
            top: 19px;
          }
          54% {
            width: 0;
            left: 1px;
            top: 19px;
          }
          70% {
            width: 50px;
            left: -8px;
            top: 37px;
          }
          84% {
            width: 17px;
            left: 21px;
            top: 48px;
          }
          100% {
            width: 25px;
            left: 14px;
            top: 45px;
          }
        }
        @keyframes icon-line-long {
          0% {
            width: 0;
            right: 46px;
            top: 54px;
          }
          65% {
            width: 0;
            right: 46px;
            top: 54px;
          }
          84% {
            width: 55px;
            right: 0px;
            top: 35px;
          }
          100% {
            width: 47px;
            right: 8px;
            top: 38px;
          }
        }
      `}</style>

      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        {alertMessage && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            {alertMessage}
          </div>
        )}

        {showSuccessAnimation ? <SuccessAnimation /> : (
          <>
            <h2 className="text-xl font-bold mb-4">Login</h2>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="mb-4">
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                className="border p-2 w-full mb-2 rounded"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                ref={mobileInputRef}
                onKeyPress={(e) => !otpSent && handleKeyPress(e, sendOTP)}
                disabled={otpSent && loading}
                autoFocus
              />

              {!otpSent ? (
                <button
                  onClick={sendOTP}
                  disabled={loading || mobile.length !== 10}
                  className={`bg-blue-500 text-white px-4 py-2 w-full rounded hover:bg-blue-600 transition duration-200 ${
                    loading || mobile.length !== 10 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              ) : (
                <div className="space-y-4">
                  <input
                    type="tel"
                    placeholder="Enter 4-digit OTP"
                    className="border p-2 w-full rounded"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    ref={otpInputRef}
                    onKeyPress={(e) => handleKeyPress(e, verifyOTP)}
                  />
                  
                  <button
                    onClick={verifyOTP}
                    disabled={loading || otp.length !== 4}
                    className={`bg-green-500 text-white px-4 py-2 w-full rounded hover:bg-green-600 transition duration-200 ${
                      loading || otp.length !== 4 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  
                  <div className="text-center">
                    <button
                      onClick={handleResendOTP}
                      disabled={loading}
                      className={`text-blue-500 underline text-sm ${
                        loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm mt-6 text-center">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-blue-500 underline hover:text-blue-700 transition duration-200 cursor-pointer"
              >
                Register here
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;