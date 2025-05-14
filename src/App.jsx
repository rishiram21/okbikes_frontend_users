import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import BikeListPage from "./pages/BikeListPage";
import HomePage from "./pages/HomePage";
import BikeDetailsPage from "./pages/BikeDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";
import { FaWhatsapp } from "react-icons/fa";
import Footer from "./components/Footer";
import CheckoutPage from "./pages/CheckoutPage";
import { GlobalStateProvider } from "./context/GlobalStateContext";
import ContactUs from "./pages/ContactUs";
import { AuthProvider } from "./context/AuthContext";
import RegistrationPage from "./pages/RegistrationPage";
import InvoicePage from "./pages/InvoicePage";

// Wrapper to conditionally render the Navbar
const ConditionalNavbar = ({ children }) => {
  const location = useLocation();
  const hideNavbarRoutes = ["/"];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);
  return (
    <>
      {shouldShowNavbar && <Navbar />}
      {children}
    </>
  );
};

// Floating WhatsApp Icon Component
const WhatsAppIcon = () => {
  return (
    <a
      href="https://wa.me/1234567890"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition duration-300"
    >
      <FaWhatsapp className="text-2xl" />
    </a>
  );
};

// Footer Wrapper Component – Only shows on /bike-list
const ConditionalFooter = () => {
  const location = useLocation();
  const footerVisibleRoutes = ["/"];
  return footerVisibleRoutes.includes(location.pathname) ? <Footer /> : null;
};


// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <GlobalStateProvider>
        <Router>
          <ConditionalNavbar>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bike-list" element={<BikeListPage />} />
              <Route path="/bike-details" element={<BikeDetailsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/invoice/:bookingId" element={<InvoicePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/contactus" element={<ContactUs />} />
              <Route
                path="*"
                element={
                  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
                    <p className="text-gray-600 mb-8 text-center max-w-md">
                      The page you are looking for might have been removed or is temporarily unavailable.
                    </p>
                    <a
                      href="/"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Return to Home
                    </a>
                  </div>
                }
              />
            </Routes>
            <WhatsAppIcon />
            <ConditionalFooter />
          </ConditionalNavbar>
        </Router>
      </GlobalStateProvider>
    </AuthProvider>
  );
};

export default App;