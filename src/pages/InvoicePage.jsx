import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Invoice from "./Invoice"; // Import the Invoice component
import {
  FaSpinner,
  FaArrowLeft,
  FaFileInvoice,
  FaExclamationTriangle,
} from "react-icons/fa";

const InvoicePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const token =
          localStorage.getItem("jwtToken") ||
          sessionStorage.getItem("jwtToken");

        if (!token) {
          setError("User not authenticated. Please log in.");
          return;
        }

        // Fetch combined details for the order
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/booking/combined/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const bookingDto = response.data;

        // Prepare invoice details
        const invoiceData = {
          booking: bookingDto.booking,
          userName: bookingDto.user.name,
          userPhone: bookingDto.user.phoneNumber,
          vehicleNumber: bookingDto.vehicle.vehicleRegistrationNumber,
          vehicleModel: bookingDto.vehicle.model,
          charges: [
            { type: "Damage", amount: bookingDto.booking.damage || 0 },
            { type: "Challan", amount: bookingDto.booking.challan || 0 },
            {
              type: "Additional",
              amount: bookingDto.booking.additionalCharges || 0,
            },
          ],
          challans: bookingDto.booking.challans || [],
          damages: bookingDto.booking.damages || [],
          packagePrice: bookingDto.vehiclePackage.price,
          securityDeposit: bookingDto.vehiclePackage.deposit,
        };

        setInvoiceDetails(invoiceData);
        setShowInvoice(true);
      } catch (err) {
        console.error("Error fetching invoice details:", err);
        setError("Failed to fetch invoice details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [bookingId]);

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    navigate("/orders");
  };

  const handleGoBack = () => {
    navigate("/orders");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-600 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src="/okbike.jpg"
                  alt="okbike Logo"
                  className="h-10 w-16"
                />
              </div>
              <div className="text-white">
                <span className="text-lg font-medium">Invoice Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="bg-orange-100 rounded-full p-6">
                    <FaSpinner className="animate-spin text-orange-600 text-4xl" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-orange-600 rounded-full p-2">
                    <FaFileInvoice className="text-white text-sm" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Generating Invoice
                </h2>
                <p className="text-gray-600 mb-6">
                  Please wait while we fetch your booking details...
                </p>
                <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-600">
                  <p className="text-orange-800 font-medium">
                    Booking ID: OKB-{bookingId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-900 to-orange-800 shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src="/src/assets/okloggo.jpeg"
                  alt="okbike Logo"
                  className="h-8 w-8"
                />
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  OkBike
                </h1>
              </div>
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-2 bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                <FaArrowLeft className="text-sm" />
                <span>Back to Orders</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-12">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="bg-red-100 rounded-full p-6">
                    <FaExclamationTriangle className="text-red-600 text-4xl" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Unable to Load Invoice
                </h2>
                <p className="text-red-600 mb-6 font-medium">{error}</p>
                <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-600 mb-8">
                  <p className="text-red-800 font-medium">
                    Booking ID: OKB-{bookingId}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </button>
                  <button
                    onClick={handleGoBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  >
                    <FaArrowLeft className="mr-2" />
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 h-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-600 shadow-lg print:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/okbike.jpg" alt="okbike Logo" className="h-10 w-14" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white text-right">
                <p className="text-sm text-orange-200">Booking ID</p>
                <p className="font-medium">OKB-{bookingId}</p>
              </div>
              <button
                onClick={handleCloseInvoice}
                className="flex items-center space-x-2 bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                <FaArrowLeft className="text-sm" />
                <span>Back to Orders</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={handleGoBack}
              className="hover:text-orange-600 transition duration-200"
            >
              Orders
            </button>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-gray-900 font-medium">Invoice</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {showInvoice && invoiceDetails && (
          <div className="max-w-4xl mx-auto">
            {/* Invoice Header Info */}
            {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-orange-100 rounded-full p-3">
                    <FaFileInvoice className="text-orange-600 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Invoice Generated
                    </h2>
                    <p className="text-gray-600">
                      For {invoiceDetails.userName} •{" "}
                      {invoiceDetails.vehicleModel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Generated on</p>
                  <p className="font-medium text-gray-900">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div> */}

            {/* Invoice Component */}
            <Invoice
              booking={invoiceDetails.booking}
              charges={invoiceDetails.charges}
              lateCharges={0}
              challans={invoiceDetails.challans}
              damages={invoiceDetails.damages}
              userName={invoiceDetails.userName}
              userPhone={invoiceDetails.userPhone}
              vehicleNumber={invoiceDetails.vehicleNumber}
              vehicleModel={invoiceDetails.vehicleModel}
              packagePrice={invoiceDetails.packagePrice}
              securityDeposit={invoiceDetails.securityDeposit}
              onClose={handleCloseInvoice}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePage;
