import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaFilter,
  FaTimes,
  FaSpinner,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSortAmountDown,
  FaSortAmountUp,
  FaEraser
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const BikeListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { checkToken } = useAuth();

// For debugging:
  const tokenStatus = checkToken();
  console.log("Token status:", tokenStatus);
  
   // Log the token when the component mounts and whenever it changes
  useEffect(() => {
    console.log("Token from AuthContext:", token);
    
    // Setup authenticated API headers if token exists
    if (token) {
      console.log("Setting up authenticated API with token");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);


  // // Log the token when the component mounts
  // useEffect(() => {
  //   console.log("Token from AuthContext:", token);
  // }, [token]);

  

  const { formData } = location.state || {};

  const [bikes, setBikes] = useState([]);
  const [filteredBikes, setFilteredBikes] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    vehicleType: [],
    brands: [],
    fuelType: [],
    location: "",
  });
  const [sortOrder, setSortOrder] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef(null);
  const bikesPerPage = 8;

  // Fetch bikes based on form data
  useEffect(() => {
    if (formData) {
      fetchAvailableBikes();
    } else {
      console.error(
        "No form data found. Please return to the home page and make a selection."
      );
      navigate("/");
    }
  }, [formData, navigate]);

  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchAvailableBikes = async () => {
    setLoading(true);

    const startTime = new Date(formData.startDate)
      .toISOString()
      .replace("T", " ")
      .split(".")[0];
    const endTime = new Date(formData.endDate)
      .toISOString()
      .replace("T", " ")
      .split(".")[0];

    const params = {
      cityId: formData.cityId,
      startTime,
      endTime,
    };

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/vehicle/available`,
        {
          params,
        }
      );
      const bikesData = response.data?.content || [];
      // Ensure each bike has a categoryName
      const combinedBikes = bikesData.map(bike => ({
        ...bike,
        categoryName: bike.categoryName || "Unknown", // Default to "Unknown" if not set
      }));

      // Add the Ola scooter as a static entry
      // const olaScooter = {
      //   id: 1,
      //   model: "Ola Electric",
      //   image: "/ola.jpg",
      //   perDayRent: 399,
      //   deposit: 0,
      //   registrationYear: 2023,
      //   storeName: "Wakad", // Use a dynamic location if needed
      //   categoryName: "Scooter",
      //   categoryId: 1,
      //   fuelType: "ELECTRIC",
      //   brand: "Ola",
      //   vehicleType: "Scooter",
      // };

      // combinedBikes.push(olaScooter);

      console.log("Fetched Bikes:", combinedBikes);
      setBikes(combinedBikes);
      setFilteredBikes(combinedBikes);
    } catch (error) {
      console.error("Error fetching bikes:", error);
      // Fallback to the Ola scooter if fetch fails
      // const olaScooter = {
      //   id: 1,
      //   model: "Ola Electric",
      //   image: "/ola.jpg",
      //   perDayRent: 399,
      //   deposit: 0,
      //   registrationYear: 2023,
      //   storeName: "Wakad", // Use a dynamic location if needed
      //   categoryName: "Scooter",
      //   categoryId: 1,
      //   fuelType: "ELECTRIC",
      //   brand: "Ola",
      //   vehicleType: "Scooter",
      // };

      // setBikes([olaScooter]);
      // setFilteredBikes([olaScooter]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (filters, order) => {
    let result = [...bikes];

    console.log("Applying filters:", filters);

    if (filters.vehicleType.length > 0) {
      result = result.filter((bike) =>
        filters.vehicleType.includes(bike.categoryName)
      );
    }

    if (filters.brands.length > 0) {
      result = result.filter((bike) =>
        filters.brands.includes(bike.brand)
      );
    }

    if (filters.fuelType.length > 0) {
      result = result.filter((bike) =>
        filters.fuelType.includes(bike.fuelType)
      );
    }

    if (filters.location) {
      result = result.filter((bike) => bike.storeName === filters.location);
    }

    if (order === "asc")
      result.sort((a, b) => a.perDayRent - b.perDayRent);
    if (order === "desc")
      result.sort((a, b) => b.perDayRent - a.perDayRent);

    console.log("Filtered bikes:", result);

    setFilteredBikes(result);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const toggleFilter = (filterArray, value) =>
    filterArray.includes(value)
      ? filterArray.filter((item) => item !== value)
      : [...filterArray, value];

  const updateFilters = (filterType, value) => {
    const newFilters = { ...selectedFilters };

    if (filterType === "vehicleType") {
      newFilters.vehicleType = toggleFilter(newFilters.vehicleType, value);
    } else if (filterType === "brands") {
      newFilters.brands = toggleFilter(newFilters.brands, value);
    } else if (filterType === "fuelType") {
      newFilters.fuelType = toggleFilter(newFilters.fuelType, value);
    } else if (filterType === "location") {
      newFilters.location = value;
    }

    console.log("Updated filters:", newFilters);

    setSelectedFilters(newFilters);
    applyFilters(newFilters, sortOrder);
  };

  const handleSort = (order) => {
    setSortOrder(order);
    applyFilters(selectedFilters, order);
  };

  const resetFilters = () => {
    setSelectedFilters({
      vehicleType: [],
      brands: [],
      fuelType: [],
      location: "",
    });
    setSortOrder("");
    applyFilters({
      vehicleType: [],
      brands: [],
      fuelType: [],
      location: "",
    }, "");
  };

  const indexOfLastBike = currentPage * bikesPerPage;
  const indexOfFirstBike = indexOfLastBike - bikesPerPage;
  const currentBikes = filteredBikes.slice(indexOfFirstBike, indexOfLastBike);
  const totalPages = Math.ceil(filteredBikes.length / bikesPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo(0, 0);
    }
  };

  // Scroll to filter section when it becomes visible on mobile
  useEffect(() => {
    if (showFilters && filterRef.current) {
      filterRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showFilters]);

  // Create filter checkbox component for reuse
  const FilterCheckbox = ({ label, value, filterType }) => {
    const isChecked = selectedFilters[filterType].includes(value);

    return (
      <label className="flex items-center mb-2 text-sm cursor-pointer group">
        <div className={`w-5 h-5 mr-2 border rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 group-hover:border-orange-300'}`}>
          {isChecked && <FaTimes className="text-white text-xs" />}
        </div>
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={() => updateFilters(filterType, value)}
        />
        <span className="group-hover:text-orange-600 transition-colors">{label}</span>
      </label>
    );
  };

  // Function to display current filter status and results count
  const FilterStatus = () => {
    const activeFiltersCount =
      selectedFilters.vehicleType.length +
      selectedFilters.brands.length +
      selectedFilters.fuelType.length +
      (selectedFilters.location ? 1 : 0);

    return (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 p-3 bg-gray-50 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Available Bikes ({filteredBikes.length})
          </h2>
          {activeFiltersCount > 0 && (
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <span>Filters applied: {activeFiltersCount}</span>
              <button
                onClick={resetFilters}
                className="text-orange-500 hover:text-orange-700 flex items-center gap-1"
              >
                <FaEraser size={12} />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex mt-3 md:mt-0 gap-2">
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${sortOrder === "asc" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            onClick={() => handleSort("asc")}
          >
            <FaSortAmountUp size={12} />
            <span>Price: Low to High</span>
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${sortOrder === "desc" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            onClick={() => handleSort("desc")}
          >
            <FaSortAmountDown size={12} />
            <span>Price: High to Low</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 relative min-h-screen mt-20">
      {/* Filter toggle button for mobile */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="lg:hidden fixed bottom-8 left-4 bg-orange-600 text-white p-3 rounded-full shadow-lg z-50 flex items-center justify-center"
        aria-label="Toggle filters"
      >
        {showFilters ? <FaTimes size={20} /> : <FaFilter size={24} />}
      </button>

      {/* Filter sidebar */}
      <aside
        ref={filterRef}
        className={`w-full lg:w-1/4 bg-white p-5 rounded-lg shadow-md transition-all duration-300 ease-in-out ${
          showFilters ? "block" : "hidden lg:block"
        } ${showFilters ? "fixed inset-0 z-40 overflow-y-auto lg:static lg:z-auto" : ""}`}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Filters</h3>
          <button
            onClick={() => setShowFilters(false)}
            className="lg:hidden text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Close filters"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Vehicle Type filter section */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wider border-b pb-2">
            Vehicle Type
          </h4>
          <div className="mt-3">
            <FilterCheckbox label="Scooter" value="Scooter" filterType="vehicleType" />
            <FilterCheckbox label="Bike" value="Bike" filterType="vehicleType" />
          </div>
        </div>

        {/* Brands filter section */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wider border-b pb-2">
            Brands
          </h4>
          <div className="mt-3">
            <FilterCheckbox label="Bajaj" value="Bajaj" filterType="brands" />
            <FilterCheckbox label="Honda" value="Honda" filterType="brands" />
            <FilterCheckbox label="Ola" value="Ola" filterType="brands" />
          </div>
        </div>

        {/* Fuel Type filter section */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wider border-b pb-2">
            Fuel Type
          </h4>
          <div className="mt-3">
            <FilterCheckbox label="CNG" value="CNG" filterType="fuelType" />
            <FilterCheckbox label="Electric" value="ELECTRIC" filterType="fuelType" />
            <FilterCheckbox label="Petrol" value="PETROL" filterType="fuelType" />
          </div>
        </div>

        {/* Location filter section */}
<div className="mb-6">
  <h4 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wider border-b pb-2">
    Location
  </h4>
  <ul className="space-y-2">
    <li>
      {/* <button
        className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
          selectedFilters.location === "" ? "bg-orange-100 border-orange-400" : "bg-white border-gray-300"
        }`}
        onClick={() => updateFilters("location", "")}
      >
        All Locations
      </button> */}
    </li>
    {Array.from(new Set(bikes.map(bike => bike.storeName))).map((location, index) => (
      <li key={index}>
        <button
          className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
            selectedFilters.location === location ? "bg-orange-100 border-orange-400" : "bg-white border-gray-300"
          }`}
          onClick={() => updateFilters("location", location)}
        >
          {location}
        </button>
      </li>
    ))}
  </ul>
</div>


        {/* Reset filters button */}
        <button
          className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium"
          onClick={resetFilters}
        >
          <FaEraser /> Reset All Filters
        </button>
      </aside>

      {/* Main content area */}
      <main className="w-full lg:w-3/4 flex flex-col">
        {/* Filter status bar */}
        <FilterStatus />

        {/* Bikes grid or loading spinner */}
        <div className="flex-grow">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-96">
              <FaSpinner className="animate-spin text-orange-500 text-4xl mb-4" />
              <p className="text-gray-600">Loading available bikes...</p>
            </div>
          ) : currentBikes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {currentBikes.map((bike) => (
                <div
                  key={bike.id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
                >
                  {/* Image container */}
                  <div className="h-48 bg-gray-50 flex items-center justify-center p-4 border-b relative overflow-hidden">
                    <img
                      src={bike.image || "/default-image.jpg"}
                      alt={bike.model}
                      className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
                    />
                    {bike.fuelType && (
                      <span className="absolute top-2 right-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                        {bike.fuelType}
                      </span>
                    )}
                  </div>

                  {/* Content container */}
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {bike.model}
                    </h3>

                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <span className="bg-gray-100 px-2 py-1 rounded-full">{bike.categoryName}</span>
                      {bike.registrationYear && (
                        <span className="ml-2">Year: {bike.registrationYear}</span>
                      )}
                    </div>

                    <div className="flex items-center text-sm mb-2">
                      <FaMapMarkerAlt className="text-orange-500 mr-1" />
                      <p className="text-gray-600 truncate">{bike.storeName}</p>
                    </div>

                    <div className="mt-auto pt-3 border-t">
  <div className="flex justify-between items-end">
    <div>
      <p className="text-xs text-gray-500">Price per day</p>
      <p className="text-xl font-bold text-orange-600">₹{bike.perDayRent}</p>
    </div>
    {bike.id === 1 && bike.model === "Ola Electric" ? (
      <button
        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium"
        disabled
      >
        Coming Soon
      </button>
    ) : (
      <button
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        onClick={() =>
          navigate(`/bike-details`, {
            state: {
              id: bike.id,
              model: bike.model,
              name: bike.name,
              img: bike.image,
              basePrice: bike.perDayRent,
              deposit: bike.deposit,
              registrationYear: bike.registrationYear,
              storeName: bike.storeName,
              categoryName: bike.categoryName,
              categoryId: bike.categoryId,
              storeId: bike.storeId,
            },
          })
        }
      >
        Rent Now
      </button>
    )}
  </div>
</div>

                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-64 bg-gray-50 rounded-lg p-6">
              <img
                src="/api/placeholder/120/120"
                alt="No bikes available"
                className="mb-4 opacity-50"
              />
              <p className="text-center text-gray-500 mb-2">No bikes available with the selected filters</p>
              <button
                onClick={resetFilters}
                className="text-orange-500 hover:underline flex items-center gap-1"
              >
                <FaEraser size={12} />
                <span>Clear filters and try again</span>
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredBikes.length > bikesPerPage && (
          <div className="mt-8 flex justify-center items-center">
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center justify-center px-3 py-2 rounded-l-lg border ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-orange-600 border-gray-200 hover:bg-orange-50"
                }`}
              >
                <FaChevronLeft size={14} />
              </button>

              {/* Show only a limited number of page buttons */}
              {[...Array(totalPages).keys()]
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  const pageNum = page + 1;
                  return (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1 ||
                    (pageNum === 2 && currentPage === 1) ||
                    (pageNum === totalPages - 1 && currentPage === totalPages)
                  );
                })
                .map((page, index, array) => {
                  const pageNum = page + 1;
                  const showEllipsis = index > 0 && array[index - 1] !== page - 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && (
                        <span className="flex items-center justify-center px-3 py-2 border-t border-b border-gray-200 bg-white text-gray-500">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => paginate(pageNum)}
                        className={`min-w-[40px] flex items-center justify-center px-3 py-2 border ${
                          currentPage === pageNum
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-orange-50"
                        } ${
                          index === 0 && pageNum !== 1 ? "rounded-l-lg" : ""
                        } ${
                          index === array.length - 1 && pageNum !== totalPages ? "rounded-r-lg" : ""
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center justify-center px-3 py-2 rounded-r-lg border ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-orange-600 border-gray-200 hover:bg-orange-50"
                }`}
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BikeListPage;