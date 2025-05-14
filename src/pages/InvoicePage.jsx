import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Invoice from "./Invoice"; // Import the Invoice component

const InvoicePage = () => {
  const { bookingId } = useParams();
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");

        if (!token) {
          setError("User not authenticated. Please log in.");
          return;
        }

        // Fetch combined details for the order
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/booking/combined/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const bookingDto = response.data;

        // Prepare invoice details
        const invoiceData = {
          booking: bookingDto.booking,
          userName: bookingDto.user.name,
          userPhone: bookingDto.user.phoneNumber,
          vehicleNumber: bookingDto.vehicle.vehicleRegistrationNumber,
          vehicleModel: bookingDto.vehicle.model,
          charges: [
            { type: 'Damage', amount: bookingDto.booking.damage || 0 },
            { type: 'Challan', amount: bookingDto.booking.challan || 0 },
            { type: 'Additional', amount: bookingDto.booking.additionalCharges || 0 },
          ],
          challans: bookingDto.booking.challans || [],
          damages: bookingDto.booking.damages || [],
          packagePrice: bookingDto.vehiclePackage.price,
          securityDeposit: bookingDto.vehiclePackage.deposit,
        };

        setInvoiceDetails(invoiceData);
      } catch (err) {
        console.error("Error fetching invoice details:", err);
        setError("Failed to fetch invoice details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen text-center pt-24">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => window.history.back()} className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Invoice</h1>
        <Invoice
          booking={invoiceDetails.booking}
          charges={invoiceDetails.charges}
          lateCharges={0} // Assuming late charges are not applicable for users
          challans={invoiceDetails.challans}
          damages={invoiceDetails.damages}
          userName={invoiceDetails.userName}
          userPhone={invoiceDetails.userPhone}
          vehicleNumber={invoiceDetails.vehicleNumber}
          vehicleModel={invoiceDetails.vehicleModel}
          packagePrice={invoiceDetails.packagePrice}
          securityDeposit={invoiceDetails.securityDeposit}
        />
      </div>
    </div>
  );
};

export default InvoicePage;
