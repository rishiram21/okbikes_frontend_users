import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaMotorcycle, FaCalendarAlt, FaMapMarkerAlt, FaRupeeSign, FaUser, FaPhone, FaUpload, FaEnvelope, FaIdCard, FaChevronDown } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGlobalState } from "../context/GlobalStateContext";
import { useAuth } from "../context/AuthContext";

const OrdersPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addOrder, user } = useGlobalState();
  const [mostRecentOrder, setMostRecentOrder] = useState(null);
  const [otherOrders, setOtherOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [images, setImages] = useState({
    front: null,
    left: null,
    right: null,
    back: null,
  });
  const [uploadType, setUploadType] = useState(null); // 'start' or 'end'
  const [orderLimit, setOrderLimit] = useState(1);

  useEffect(() => {
    console.log("Token from AuthContext:", token);
  }, [token]);

  // Scroll to the top of the page when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Retrieve JWT token from localStorage or sessionStorage
      const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");

      if (!token) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }

      // Fetch order history
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/booking/user/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.length > 0) {
        // Sort orders by bookingId (most recent first)
        const sortedOrders = response.data.sort((a, b) => b.bookingId - a.bookingId);
        // Separate the most recent order from the rest
        const [recentOrder, ...remainingOrders] = sortedOrders;

        // Fetch combined details for each order
        const combinedOrders = await Promise.all(sortedOrders.map(async (order) => {
          const combinedResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/booking/combined/${order.bookingId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          return combinedResponse.data;
        }));

        setMostRecentOrder(combinedOrders[0]);
        setOtherOrders(combinedOrders.slice(1));
        setDisplayedOrders(combinedOrders.slice(1, orderLimit + 1));
      } else {
        setError("No orders found for this user.");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch order history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update displayed orders when orderLimit changes
  useEffect(() => {
    setDisplayedOrders(otherOrders.slice(0, orderLimit));
  }, [otherOrders, orderLimit]);

  // Function to load more orders
  const handleLoadMore = () => {
    setOrderLimit(prevLimit => prevLimit + 2);
  };

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Function to handle booking cancellation confirmation
  const handleCancelBooking = (orderId) => {
    toast(
      <div className="flex flex-col items-center">
        <p className="mb-4">Are you sure you want to cancel this booking?</p>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              toast.dismiss();
              confirmCancelBooking(orderId);
            }}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Yes
          </button>
          <button
            onClick={toast.dismiss}
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            No
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        draggable: false,
        className: "custom-toast",
      }
    );
  };

  // Function to confirm and execute booking cancellation
  const confirmCancelBooking = async (orderId) => {
    try {
      const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");

      if (!token) {
        setError("User not authenticated. Please log in.");
        return;
      }

      // Use the API from allBooking to cancel the booking
      const response = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/booking/cancel/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Booking canceled successfully:", response.data);

      // Update the orders state to reflect the cancellation
      setMostRecentOrder((prevOrder) => (prevOrder.booking.bookingId === orderId ? { ...prevOrder, booking: { ...prevOrder.booking, status: "Cancelled" } } : prevOrder));
      setOtherOrders((prevOrders) =>
        prevOrders.map((order) => (order.booking.bookingId === orderId ? { ...order, booking: { ...order.booking, status: "Cancelled" } } : order))
      );
      setDisplayedOrders((prevOrders) =>
        prevOrders.map((order) => (order.booking.bookingId === orderId ? { ...order, booking: { ...order.booking, status: "Cancelled" } } : order))
      );

      toast.success("Booking cancelled successfully!");

      // Refresh the orders data
      fetchOrders();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError("Failed to cancel booking. Please try again.");
      toast.error("Failed to cancel booking. Please try again.");
    }
  };

  // Function to handle start trip confirmation
  const handleStartTrip = (order) => {
    toast(
      ({ closeToast }) => (
        <div className="flex flex-col items-center">
          <p className="mb-4 font-medium">Are you sure you want to start the trip?</p>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                closeToast(); // Close the toast manually
                setSelectedOrder(order);
                setUploadType("start");
                setShowUploadPopup(true);
              }}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
            >
              Yes
            </button>
            <button
              onClick={closeToast}
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
            >
              No
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className: "custom-toast",
      }
    );
  };

  // End Trip
  const handleEndTrip = (order) => {
    toast(
      <div className="flex flex-col items-center">
        <p className="mb-4">Are you sure you want to end the trip?</p>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              toast.dismiss();
              setSelectedOrder(order);
              setUploadType("end");
              setShowUploadPopup(true); // Reuse the same popup for end trip
            }}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Yes
          </button>
          <button
            onClick={toast.dismiss}
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            No
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        draggable: false,
        className: "custom-toast",
      }
    );
  };

  // Function to convert image to Base64
  const handleImageUpload = (side, file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;

      setImages((prevImages) => {
        if (uploadType === "start") {
          return { ...prevImages, [side]: base64Image };
        } else if (uploadType === "end") {
          return { ...prevImages, [`${side}_end`]: base64Image };
        } else {
          return prevImages;
        }
      });
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  // Start Trip Function to handle form submission
  const handleStartTripSubmit = async () => {
    const { front, left, right, back } = images;

    if (front && left && right && back) {
      // Prepare the payload
      const payload = {
        bookingId: selectedOrder.booking.bookingId, // Use bookingId here
        frontImageBase64: front,
        leftImageBase64: left,
        rightImageBase64: right,
        backImageBase64: back,
      };

      const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");

      if (!token) {
        alert("You are not logged in. Please login to start trip.");
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/booking/start-trip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }

        if (response.ok && data.message === "Trip started successfully") {
          console.log("Trip started successfully"); // Debugging statement
          toast.success("Trip started successfully!"); // Success toast

          // Update the status of the most recent and other orders
          setMostRecentOrder((prevOrder) =>
            prevOrder.booking.bookingId === selectedOrder.booking.bookingId
              ? { ...prevOrder, booking: { ...prevOrder.booking, status: "START_TRIP" } }
              : prevOrder
          );

          setOtherOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.booking.bookingId === selectedOrder.booking.bookingId
                ? { ...order, booking: { ...order.booking, status: "START_TRIP" } }
                : order
            )
          );

          setDisplayedOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.booking.bookingId === selectedOrder.booking.bookingId
                ? { ...order, booking: { ...order.booking, status: "START_TRIP" } }
                : order
            )
          );

          // Refresh the orders data
          fetchOrders();
        } else {
          toast.error("Error starting trip: " + (data.message || "Unexpected error"));
        }
      } catch (error) {
        toast.error("Error: " + error.message);
      } finally {
        setShowUploadPopup(false); // Close the upload popup in all cases
      }
    } else {
      toast.error("Please upload all 4 images.");
    }
  };

  // End Trip
  const handleEndTripSubmit = async () => {
    const { front_end, left_end, right_end, back_end } = images; // Assuming you store end images in the `images` state

    if (front_end && left_end && right_end && back_end) {
      const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");

      if (!token) {
        alert("You are not logged in. Please login to end trip.");
        return;
      }

      const payload = {
        bookingId: selectedOrder.booking.bookingId,
        frontImageBase64: front_end,
        leftImageBase64: left_end,
        rightImageBase64: right_end,
        backImageBase64: back_end,
      };

      try {
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/booking/end-trip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }

        if (response.ok && data.message === "Trip ended successfully") {
          console.log("Trip ended successfully"); // Debugging statement
          toast.success("Trip ended successfully!"); // Success toast

          setMostRecentOrder((prevOrder) =>
            prevOrder.booking.bookingId === selectedOrder.booking.bookingId
              ? { ...prevOrder, booking: { ...prevOrder.booking, status: "END_TRIP" } }
              : prevOrder
          );

          setOtherOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.booking.bookingId === selectedOrder.booking.bookingId
                ? { ...order, booking: { ...order.booking, status: "END_TRIP" } }
                : order
            )
          );

          setDisplayedOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.booking.bookingId === selectedOrder.booking.bookingId
                ? { ...order, booking: { ...order.booking, status: "END_TRIP" } }
                : order
            )
          );

          // Refresh the orders data
          fetchOrders();
        } else {
          toast.error("Failed to end trip: " + (data.message || "Unexpected error"));
        }
      } catch (error) {
        toast.error("Error: " + error.message);
      } finally {
        setShowUploadPopup(false);
      }
    } else {
      toast.error("Please upload all 4 images before submitting.");
    }
  };

  // Function to handle viewing the invoice
  const handleViewInvoice = (order) => {
    navigate(`/invoice/${order.booking.bookingId}`);
  };

  // Order card component to avoid duplication
  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src={order.vehicle.image || "path/to/default/bike/image.jpg"}
            alt={order.vehicle.model}
            className="w-24 h-24 object-contain"
          />
          <div>
            <h3 className="font-medium text-gray-800">{order.vehicle.model || "N/A"}</h3>
            <p className="text-sm text-gray-500">Bike Number: {order.vehicle.vehicleRegistrationNumber || "N/A"}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium
          ${order.booking.status === "COMPLETED" ? "bg-green-100 text-green-800" :
          order.booking.status === "Upcoming" ? "bg-blue-100 text-blue-800" :
          order.booking.status === "Active" ? "bg-yellow-100 text-yellow-800" :
          order.booking.status === "CANCELLED" ? "bg-red-100 text-red-800" :
          order.booking.status === "BOOKING_ACCEPTED" ? "bg-purple-100 text-purple-800" :
          order.booking.status === "START_TRIP" ? "bg-orange-100 text-orange-800" :
          order.booking.status === "END_TRIP" ? "bg-gray-100 text-gray-800" :
          "bg-gray-100 text-gray-800"}`}>
          {order.booking.status || "N/A"}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-col space-y-2">
          <p className="text-sm text-gray-500">Booking Details</p>
          <p className="font-medium">Booking ID: {order.booking.bookingId || "N/A"}</p>
          <p className="font-medium">Store Address: {order.store.address || "N/A"}</p>
          <p className="font-medium">Store Mobile Number: {order.store.phone || "N/A"}</p>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-start space-x-3">
            <FaCalendarAlt className="text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{formatDate(order.booking.startDate)}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <FaCalendarAlt className="text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{formatDate(order.booking.endDate)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <FaRupeeSign className="text-gray-400 mt-1" />
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-medium">
              ₹{order.booking.totalAmount ? Number(order.booking.totalAmount).toFixed(2) : "N/A"}
            </p>
          </div>
        </div>
        {order.booking.pickupOption === "DELIVERY_AT_LOCATION" && (
          <div className="flex items-start space-x-3">
            <FaMapMarkerAlt className="text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Delivery Location</p>
              <p className="font-medium">{order.booking.deliveryLocation || "N/A"}</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-100 flex justify-between items-center">
        {order.booking.status === "BOOKING_ACCEPTED" && (
          <button
            onClick={() => handleStartTrip(order)}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Start Trip
          </button>
        )}
        {order.booking.status === "START_TRIP" && (
          <>
            <button
              onClick={() => handleEndTrip(order)}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              disabled={order.booking.status === "END_TRIP"} // Disable if status is END_TRIP
            >
              End Trip
            </button>
          </>
        )}
        {order.booking.status === "END_TRIP" && (
          <button
            disabled
            className="bg-gray-300 text-gray-600 py-2 px-4 rounded cursor-not-allowed"
          >
            End Trip
          </button>
        )}
        {order.booking.status === "CANCELLED" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-600 py-2 px-4 rounded cursor-not-allowed"
          >
            Cancelled
          </button>
        ) : (
          order.booking.status !== "COMPLETED" && order.booking.status !== "BOOKING_ACCEPTED" && order.booking.status !== "START_TRIP" && order.booking.status !== "END_TRIP" && (
            <button
              onClick={() => handleCancelBooking(order.booking.bookingId)}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            >
              Cancel Booking
            </button>
          )
        )}
        {order.booking.status === "COMPLETED" && (
          <button
            onClick={() => handleViewInvoice(order)}
            className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
          >
            View Invoice
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-gray-600">Loading orders...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen text-center pt-24">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/" className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 relative">
      <ToastContainer />
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Orders</h1>
        {mostRecentOrder === null && otherOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Orders Found</h2>
            <p className="text-gray-600 mb-6">You have not placed any orders yet.</p>
            <Link to="/" className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600">
              Book Now
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Most Recent Order Column */}
            <div className="w-full md:w-1/2">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-yellow-500">
                Most Recent Order
              </h2>
              {mostRecentOrder ? (
                <OrderCard order={mostRecentOrder} />
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500">No recent orders</p>
                  <Link to="/" className="inline-block mt-4 text-orange-600 hover:text-orange-800 font-medium">
                    Book a vehicle now
                  </Link>
                </div>
              )}
            </div>
            {/* Other Orders Column */}
            <div className="w-full md:w-1/2">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-500 flex justify-between items-center">
                <div>
                  All Other Orders
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                    {otherOrders.length}
                  </span>
                </div>
              </h2>
              {otherOrders.length > 0 ? (
                <>
                  <div className="overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-orange-100 mb-4">
                    {displayedOrders.map((order) => (
                      <OrderCard key={order.booking.bookingId || order._id} order={order} />
                    ))}
                  </div>

                  {otherOrders.length > displayedOrders.length && (
                    <div className="text-center mt-2">
                      <button
                        onClick={handleLoadMore}
                        className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full flex items-center justify-center mx-auto hover:bg-orange-200 transition-colors duration-300"
                      >
                        Load More <FaChevronDown className="ml-2" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-gray-500">No other orders</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Popup */}
      {showUploadPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {uploadType === "start" ? "Start Trip - Upload Images" : "End Trip - Upload Images"}
            </h2>
            <p className="mb-4">
              Please upload 4 images of the vehicle {uploadType === "start" ? "before starting" : "after ending"} the trip.
            </p>

            {/* Front */}
            <div className="mb-4">
              <label className="block mb-2">Front Side</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("front", e.target.files[0])}
                className="mb-4"
                required
              />
            </div>

            {/* Left */}
            <div className="mb-4">
              <label className="block mb-2">Left Side</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("left", e.target.files[0])}
                className="mb-4"
                required
              />
            </div>

            {/* Right */}
            <div className="mb-4">
              <label className="block mb-2">Right Side</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("right", e.target.files[0])}
                className="mb-4"
                required
              />
            </div>

            {/* Back */}
            <div className="mb-4">
              <label className="block mb-2">Back Side</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload("back", e.target.files[0])}
                className="mb-4"
                required
              />
            </div>

            <div className="flex justify-between">
              {/* Conditionally call the correct handler */}
              <button
                onClick={uploadType === "start" ? handleStartTripSubmit : handleEndTripSubmit}
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                {uploadType === "start" ? "Start Trip" : "End Trip"}
              </button>
              <button
                onClick={() => setShowUploadPopup(false)}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
