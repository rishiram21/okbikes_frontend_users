import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaShieldAlt,
  FaFileAlt,
  FaChevronDown,
  FaChevronRight,
  FaMapMarkerAlt,
  FaCalendarAlt
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDocSectionOpen, setIsDocSectionOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState({
    aadharFrontSide: { image: null, status: null },
    aadharBackSide: { image: null, status: null },
    drivingLicense: { image: null, status: null },
  });
  const navigate = useNavigate();


  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    console.log("Token from localStorage:", token);

    if (!token) {
      navigate("/login");
      return;
    }



    const fetchUserProfile = async () => {
      try {
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
        setUploadedImages({
          aadharFrontSide: { image: data.aadharFrontSide, status: data.aadharFrontStatus },
          aadharBackSide: { image: data.aadharBackSide, status: data.aadharBackStatus },
          drivingLicense: { image: data.drivingLicense, status: data.drivingLicenseStatus },
        });

        const serializedData = JSON.stringify(data);
        if (serializedData.length > 5000000) {
          throw new Error('Data size exceeds the limit');
        }

        localStorage.setItem("userData", serializedData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded. Clearing some data...');
          localStorage.clear();
          localStorage.setItem("userData", JSON.stringify(userData));
        }
        localStorage.removeItem("jwtToken");
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const toggleDocSection = () => {
    setIsDocSectionOpen(!isDocSectionOpen);
  };

  const handleImageUpload = (event, imageType) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => ({
          ...prev,
          [imageType]: { image: reader.result, status: 'PENDING' }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    const token = localStorage.getItem("jwtToken");
    let userId;
    try {
      const userResponse = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/booking/user/id`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      userId = userResponse.data;
      console.log("[Document Verification] User ID:", userId);
    } catch (error) {
      console.error("Error fetching user ID:", error);
      toast.error("Unable to fetch user details.");
      navigate("/profile");
      return;
    }

    if (!token || !userId) {
      navigate("/profile");
      return;
    }

    console.log("User ID at runtime:", userId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/booking/user/reupload-documents/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aadharFrontSide: uploadedImages.aadharFrontSide.image,
            aadharBackSide: uploadedImages.aadharBackSide.image,
            drivingLicense: uploadedImages.drivingLicense.image,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload documents");
      }

      const result = await response.json();
      console.log("Documents uploaded successfully:", result);
      toast.success("Documents uploaded successfully!");

      setUserData(prev => ({
        ...prev,
        ...result
      }));

      // Update the status of the documents
      setUploadedImages(prev => ({
        ...prev,
        aadharFrontSide: { ...prev.aadharFrontSide, status: result.aadharFrontStatus },
        aadharBackSide: { ...prev.aadharBackSide, status: result.aadharBackStatus },
        drivingLicense: { ...prev.drivingLicense, status: result.drivingLicenseStatus },
      }));
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error(error.message || "Failed to upload documents. Please try again.");
    }
  };

  // Check if all documents are approved
  const areAllDocumentsApproved = () => {
    return (
      uploadedImages.aadharFrontSide.status === 'APPROVED' &&
      uploadedImages.aadharBackSide.status === 'APPROVED' &&
      uploadedImages.drivingLicense.status === 'APPROVED'
    );
  };

  const handleEditProfile = () => {
    toast.info("Profile editing will be available soon!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <motion.div
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <ToastContainer />
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <motion.h1
          className="text-3xl font-bold text-gray-800 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          My Profile
        </motion.h1>

        {userData ? (
          <div className="space-y-6">
            {/* Enhanced Personal Information Section */}
            <motion.div
              className="bg-white rounded-lg shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
                <div className="flex items-center space-x-4">
                  <div className="bg-white rounded-full p-3 shadow-md">
                    <FaUser className="text-orange-600 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Personal Information</h2>
                    <p className="text-orange-100 text-sm">Your profile details</p>
                  </div>
                </div>
              </div>

              {/* Content section */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
                    {userData?.name || "Your Name"}
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileDetail
                    icon={<FaPhone className="text-lg" />}
                    label="Phone Number"
                    value={userData?.phoneNumber}
                  />

                  {/* <ProfileDetail
                    icon={<FaEnvelope className="text-lg" />}
                    label="Email Address"
                    value={userData?.email || "Add your email"}
                  /> */}

                </div>

              </div>
            </motion.div>

            {/* Documents Section */}
            <motion.div
              className="bg-white rounded-lg shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 flex justify-between items-center cursor-pointer"
                onClick={toggleDocSection}
              >
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <FaFileAlt className="mr-2 text-orange-500" />
                  My Documents
                </h3>
                {isDocSectionOpen ? (
                  <FaChevronDown className="text-gray-600" />
                ) : (
                  <FaChevronRight className="text-gray-600" />
                )}
              </div>

              <motion.div
                className="p-6"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: isDocSectionOpen ? "auto" : 0,
                  opacity: isDocSectionOpen ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DocumentCard
                    title="Aadhar Card (Front)"
                    icon={<FaIdCard className="text-orange-500" />}
                  >
                    <ProfileImageDetail
                      label="Front Side"
                      imageData={uploadedImages.aadharFrontSide.image}
                      status={uploadedImages.aadharFrontSide.status}
                    />
                    {uploadedImages.aadharFrontSide.status !== 'APPROVED' && (
                      <label className="block w-full mt-2">
                        <span className="inline-block w-full py-2 bg-orange-600 text-white text-center rounded-md cursor-pointer hover:bg-orange-700 transition-colors">
                          Upload Document
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "aadharFrontSide")}
                          className="hidden"
                        />
                      </label>
                    )}
                  </DocumentCard>

                  <DocumentCard
                    title="Aadhar Card (Back)"
                    icon={<FaIdCard className="text-orange-500" />}
                  >
                    <ProfileImageDetail
                      label="Back Side"
                      imageData={uploadedImages.aadharBackSide.image}
                      status={uploadedImages.aadharBackSide.status}
                    />
                    {uploadedImages.aadharBackSide.status !== 'APPROVED' && (
                      <label className="block w-full mt-2">
                        <span className="inline-block w-full py-2 bg-orange-600 text-white text-center rounded-md cursor-pointer hover:bg-orange-700 transition-colors">
                          Upload Document
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "aadharBackSide")}
                          className="hidden"
                        />
                      </label>
                    )}
                  </DocumentCard>

                  <DocumentCard
                    title="Driving License"
                    icon={<FaShieldAlt className="text-orange-500" />}
                  >
                    <ProfileImageDetail
                      label="Driving License"
                      imageData={uploadedImages.drivingLicense.image}
                      status={uploadedImages.drivingLicense.status}
                    />
                    {uploadedImages.drivingLicense.status !== 'APPROVED' && (
                      <label className="block w-full mt-2">
                        <span className="inline-block w-full py-2 bg-orange-600 text-white text-center rounded-md cursor-pointer hover:bg-orange-700 transition-colors">
                          Upload Document
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "drivingLicense")}
                          className="hidden"
                        />
                      </label>
                    )}
                  </DocumentCard>
                </div>

                {!areAllDocumentsApproved() && (
                  <motion.button
                    className="mt-6 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
                    onClick={handleVerify}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Verify Documents
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="bg-white rounded-lg shadow-md p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-600">User information not available.</p>
            <motion.button
              className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ProfileDetail = ({ icon, label, value }) => (
  <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
    <div className="text-orange-500 bg-white p-3 rounded-full shadow-sm">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value || "N/A"}</p>
    </div>
  </div>
);

const ProfileImageDetail = ({ label, imageData, status }) => {
  const getImageSource = () => {
    if (!imageData) return null;
    if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
      return imageData;
    }
    return `data:image/png;base64,${imageData}`;
  };

  const getStatusColorClass = () => {
    switch(status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="border-b border-gray-100 pb-3">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
        {imageData ? (
          <motion.img
            src={getImageSource()}
            alt={label}
            className="max-w-full max-h-full object-contain"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <p className="font-medium text-gray-500">No Image</p>
        )}
      </div>
      <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium text-center inline-block w-full border ${getStatusColorClass()}`}>
        Status: {status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'Pending'}
      </div>
    </div>
  );
};

const DocumentCard = ({ title, icon, children }) => (
  <motion.div
    className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex-1"
    whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
    transition={{ duration: 0.2 }}
  >
    <div className="flex items-center space-x-2 mb-4">
      {icon}
      <h4 className="font-semibold text-gray-700">{title}</h4>
    </div>
    {children}
  </motion.div>
);

export default ProfilePage;