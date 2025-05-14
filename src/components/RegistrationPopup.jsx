import React, { useState } from "react";

const RegistrationPopup = ({ onClose, openLogin }) => {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [dlFront, setDlFront] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      convertToBase64(file, setter);
    }
  };

  const convertToBase64 = (file, setter) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result.split(",")[1]); // Store only the base64 part
    };
    reader.readAsDataURL(file);
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const validateName = (name) => {
    return name.trim() !== "" && /^[a-zA-Z\s]+$/.test(name);
  };

  const validateMobile = (mobile) => {
    return mobile.length === 10;
  };

  const validateFiles = () => {
    return aadharFront && aadharBack && dlFront;
  };

  const validateOTP = (otp) => {
    return otp.length === 4;
  };

  const sendOTP = async () => {
    if (!validateName(userName)) {
      setError("Enter a valid name.");
      return;
    }

    if (!validateMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!validateFiles()) {
      setError("Please upload all required documents.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/send-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: `+91${mobile}`,
          name: userName,
          aadharFrontSide: aadharFront,
          aadharBackSide: aadharBack,
          drivingLicense: dlFront,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP.");
      }

      setOtpSent(true);
      showAlert("OTP sent successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!validateOTP(otp)) {
      setError("Enter a valid 4-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/verify-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: `+91${mobile}`, otp, userName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid OTP.");
      }

      // Store JWT token in localStorage
      localStorage.setItem("jwtToken", data.token);
      showAlert("Registration successful!");

      // Fetch user details after successful registration
      await fetchUserDetails(mobile);

      setTimeout(() => {
        onClose();
        openLogin();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (phoneNumber) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/fetch-user-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: `+91${phoneNumber}` }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user details.");
      }

      const data = await response.json();
      console.log("User Details:", data);
      // You can use this data to display user details in your UI
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        {alertMessage && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow-md mt-2">
            {alertMessage}
          </div>
        )}
        <h2 className="text-xl font-bold mb-4">Register</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Enter your name"
          className="border p-2 w-full mb-2"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Enter 10-digit mobile number"
          className="border p-2 w-full mb-2"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
          maxLength={10}
        />

        <label>Aadhar Front/Back</label>
        <input type="file" accept="image/*" className="border p-2 w-full mb-2" required onChange={(e) => handleFileChange(e, setAadharFront)} />
        <input type="file" accept="image/*" className="border p-2 w-full mb-2" required onChange={(e) => handleFileChange(e, setAadharBack)} />

        <label>Driving License Front</label>
        <input type="file" accept="image/*" className="border p-2 w-full mb-2" onChange={(e) => handleFileChange(e, setDlFront)} />

        {!otpSent ? (
          <button
            onClick={sendOTP}
            disabled={loading || !validateMobile(mobile) || !validateName(userName) || !validateFiles()}
            className={`bg-blue-500 text-white px-4 py-2 w-full ${loading || !validateMobile(mobile) || !validateName(userName) || !validateFiles() ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        ) : (
          <>
            <input
              type="tel"
              placeholder="Enter 4-digit OTP"
              className="border p-2 w-full mt-2"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 4))}
            />
            <button
              onClick={verifyOTP}
              disabled={loading || !validateOTP(otp)}
              className={`bg-green-500 text-white px-4 py-2 w-full mt-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        <p className="text-sm mt-4 text-center">
          Already have an account? {" "}
          <button
            onClick={() => {
              onClose();
              openLogin();
            }}
            className="text-blue-500 underline"
          >
            Login here
          </button>
        </p>

        <button onClick={onClose} className="mt-4 text-red-500">
          Close
        </button>
      </div>
    </div>
  );
};

export default RegistrationPopup;
