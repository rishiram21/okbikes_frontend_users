import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Invoice = ({
  booking,
  charges = [],
  lateCharges = 0,
  challans = [],
  damages = [],
  userName,
  userPhone,
  vehicleNumber,
  vehicleModel,
  packagePrice,
  securityDeposit,
  onClose,
}) => {
  // const calculateDuration = () => {
  //   if (!booking?.startDate || !booking?.endDate) return "";
  //   const start = new Date(booking.startDate);
  //   const end = new Date(booking.endDate);
  //   const diffTime = Math.abs(end - start);
  //   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  //   const diffHours = Math.floor(
  //     (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  //   );
  //   const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

  //   let durationText = "";
  //   if (diffDays > 0)
  //     durationText += `${diffDays} day${diffDays !== 1 ? "s" : ""} `;
  //   if (diffHours > 0 || diffDays > 0)
  //     durationText += `${diffHours} hour${diffHours !== 1 ? "s" : ""} `;
  //   if (diffMinutes > 0 || diffHours > 0 || diffDays > 0)
  //     durationText += `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;

  //   return durationText.trim();
  // };

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // const durationInDays = () => {
  //   const durationStr = calculateDuration();
  //   const daysMatch = durationStr.match(/(\d+)\s+day/);
  //   return daysMatch ? parseInt(daysMatch[1]) : 1;
  // };

  // const totalPackagePrice = packagePrice;
  // const deliveryCharge =
  //   booking?.addressType === "DELIVERY_AT_LOCATION" ? 250 : 0;
  // const gst = totalPackagePrice * 0.18;
  // const convenienceFee = 2.0;
  // const subtotal = totalPackagePrice + gst + convenienceFee + deliveryCharge;
  // const additionalChargesTotal = charges.reduce(
  //   (sum, charge) => sum + Number(charge.amount || 0),
  //   0
  // );
  // const challansTotal = challans.reduce(
  //   (sum, challan) => sum + Number(challan.amount || 0),
  //   0
  // );
  // const damagesTotal = damages.reduce(
  //   (sum, damage) => sum + Number(damage.amount || 0),
  //   0
  // );
  // const totalAmount =
  //   subtotal +
  //   additionalChargesTotal +
  //   lateCharges +
  //   challansTotal +
  //   damagesTotal;

  const calculateDuration = () => {
  if (!booking?.startDate || !booking?.endDate) return "";
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

  let durationText = "";
  if (diffDays > 0) durationText += `${diffDays} day${diffDays !== 1 ? "s" : ""} `;
  if (diffHours > 0 || diffDays > 0)
    durationText += `${diffHours} hour${diffHours !== 1 ? "s" : ""} `;
  if (diffMinutes > 0 || diffHours > 0 || diffDays > 0)
    durationText += `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;

  return durationText.trim();
};

const durationInDays = () => {
  const durationStr = calculateDuration();
  const daysMatch = durationStr.match(/(\d+)\s+day/);
  return daysMatch ? parseInt(daysMatch[1]) : 1;
};

// Calculate the total package price with duration
// const packagePrice = booking?.vehiclePackage?.price || 0;
const durationDays = durationInDays();
const totalPackagePrice = packagePrice * durationDays;
const deliveryCharge = booking?.addressType === "DELIVERY_AT_LOCATION" ? 250 : 0;
const gst = totalPackagePrice * 0.18;
const convenienceFee = 2.0;
const subtotal = totalPackagePrice + gst + convenienceFee + deliveryCharge;
const additionalChargesTotal = charges.reduce(
  (sum, charge) => sum + Number(charge.amount || 0),
  0
);
const challansTotal = challans.reduce(
  (sum, challan) => sum + Number(challan.amount || 0),
  0
);
const damagesTotal = damages.reduce(
  (sum, damage) => sum + Number(damage.amount || 0),
  0
);
const totalAmount =
  subtotal +
  additionalChargesTotal +
  lateCharges +
  challansTotal +
  damagesTotal;


  const handleDownload = () => {
    const invoiceElement = document.getElementById("invoice-container");
    const invoiceId = `okbike_Invoice_${booking?.bookingId || "Invoice"}`;

    const downloadStatusElement = document.createElement("div");
    downloadStatusElement.style.position = "fixed";
    downloadStatusElement.style.top = "10px";
    downloadStatusElement.style.left = "50%";
    downloadStatusElement.style.transform = "translateX(-50%)";
    downloadStatusElement.style.padding = "10px 20px";
    downloadStatusElement.style.background = "#4CAF50";
    downloadStatusElement.style.color = "white";
    downloadStatusElement.style.borderRadius = "4px";
    downloadStatusElement.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    downloadStatusElement.style.zIndex = "9999";
    downloadStatusElement.textContent = "Generating PDF...";
    document.body.appendChild(downloadStatusElement);

    const closeButton = document.getElementById("close-button");
    const actionButtons = document.getElementById("action-buttons");
    const originalCloseDisplay = closeButton?.style.display;
    const originalActionDisplay = actionButtons?.style.display;
    if (closeButton) closeButton.style.display = "none";
    if (actionButtons) actionButtons.style.display = "none";

    html2canvas(invoiceElement, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      allowTaint: true,
    })
      .then((canvas) => {
        if (closeButton) closeButton.style.display = originalCloseDisplay || "";
        if (actionButtons)
          actionButtons.style.display = originalActionDisplay || "";

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`${invoiceId}.pdf`);

        downloadStatusElement.textContent = "PDF Downloaded Successfully!";
        setTimeout(() => {
          if (document.body.contains(downloadStatusElement)) {
            document.body.removeChild(downloadStatusElement);
          }
        }, 2000);
      })
      .catch((error) => {
        console.error("Error generating PDF:", error);
        downloadStatusElement.textContent = "Error generating PDF";
        downloadStatusElement.style.background = "#f44336";
        setTimeout(() => {
          if (document.body.contains(downloadStatusElement)) {
            document.body.removeChild(downloadStatusElement);
          }
        }, 3000);
      });
  };

  return (
    <div className="bg-white w-full relative">
      <button
        id="close-button"
        onClick={onClose}
        className="fixed top-6 right-6 z-50 text-white bg-gray-700 hover:bg-gray-800 rounded-full p-2 shadow-lg print:hidden transition-colors duration-200"
        style={{ zIndex: 9999 }}
        aria-label="Close invoice"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div id="invoice-container" className="relative">
        <div className="bg-gradient-to-r from-orange-600 to-orange-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <img src="/okloggo.jpeg" alt="okbike Logo" className="h-12 w-20" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">OkBike</h1>
                <p className="text-orange-100 text-xs">Ride with confidence</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold tracking-wide uppercase mb-1">
                Invoice
              </h2>
              <div className="bg-orange-700 px-2 py-1 rounded inline-block">
                <p className="text-orange-100 text-xs font-medium">
                  OKB-{booking?.bookingId}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
          <div className="text-gray-600 text-xs">
            <span>Invoice Date: </span>
            <span className="font-medium">{today}</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between mb-4 gap-2">
            <div className="bg-gray-50 rounded p-2 border-l-2 border-orange-800 flex-1">
              <h3 className="font-bold text-gray-700 mb-1 text-xs uppercase tracking-wider">
                Billed To:
              </h3>
              <p className="text-gray-800 font-medium text-sm">{userName}</p>
              <p className="text-gray-600 text-xs">{userPhone}</p>
            </div>
            <div className="bg-gray-50 rounded p-2 border-l-2 border-orange-800 flex-1">
              <h3 className="font-bold text-gray-700 mb-1 text-xs uppercase tracking-wider">
                Payment Details:
              </h3>
              <p className="text-gray-600 text-xs">
                Payment Mode:{" "}
                <span className="font-medium">
                  {booking?.paymentMethod || "Cash On Center"}
                </span>
              </p>
              <p className="text-gray-600 text-xs">
                Security Deposit:{" "}
                <span className="font-medium">₹{securityDeposit}</span>
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-orange-900 pb-1 mb-2 flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Booking Summary
            </h3>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Vehicle Model</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {vehicleModel}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Vehicle Number</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {vehicleNumber || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">
                    Start Date & Time
                  </p>
                  <p className="font-medium text-gray-900 text-xs">
                    {new Date(booking?.startDate).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">End Date & Time</p>
                  <p className="font-medium text-gray-900 text-xs">
                    {new Date(booking?.endDate).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Duration</p>
                  <p className="font-medium text-gray-900 text-xs">
                    {calculateDuration()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Package</p>
                  <p className="font-medium text-gray-900 text-xs">
                    {booking?.vehiclePackage?.name || "Standard Package"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-orange-900 pb-1 mb-2 flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Charges
            </h3>
            <div className="rounded border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="text-left py-1 px-2 text-gray-700 font-semibold text-xs">
          Description
        </th>
        <th className="text-right py-1 px-2 text-gray-700 font-semibold text-xs">
          Amount
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      <tr>
        <td className="py-1 px-2 text-gray-700 text-xs">
          Package Price (Duration: {calculateDuration()})
        </td>
        <td className="py-1 px-2 text-gray-700 text-right text-xs">
          ₹{totalPackagePrice.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td className="py-1 px-2 text-gray-700 text-xs">
          GST (18%)
        </td>
        <td className="py-1 px-2 text-gray-700 text-right text-xs">
          ₹{gst.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td className="py-1 px-2 text-gray-700 text-xs">
          Convenience Fee
        </td>
        <td className="py-1 px-2 text-gray-700 text-right text-xs">
          ₹{convenienceFee.toFixed(2)}
        </td>
      </tr>
      {booking?.addressType === "DELIVERY_AT_LOCATION" && (
        <tr className="bg-orange-50">
          <td className="py-1 px-2 text-orange-700 font-medium text-xs">
            Delivery Charge
          </td>
          <td className="py-1 px-2 text-orange-700 font-medium text-right text-xs">
            ₹{deliveryCharge.toFixed(2)}
          </td>
        </tr>
      )}

      {charges
        .filter((charge) => charge.type === "Additional")
        .map((charge, index) => (
          <tr key={index}>
            <td className="py-1 px-2 text-gray-700 text-xs">
              {charge.type}
            </td>
            <td className="py-1 px-2 text-gray-700 text-right text-xs">
              ₹{charge.amount.toFixed(2)}
            </td>
          </tr>
        ))}
    </tbody>
    <tfoot className="bg-orange-50">
      <tr className="border-t border-orange-200">
        <td className="py-2 px-2 text-sm font-bold text-orange-900">
          Total Amount
        </td>
        <td className="py-2 px-2 text-lg font-bold text-orange-900 text-right">
          ₹{totalAmount.toFixed(2)}
        </td>
      </tr>
    </tfoot>
  </table>
  <div className="px-2 py-1 bg-gray-50">
    <p className="font-semibold text-red-600 text-xs">
      * Note: Deposit is not included in Total Amount
    </p>
  </div>
</div>
          </div>

          {/* <div className="mb-4 text-xs text-gray-600 border-t border-gray-200 pt-3">
            <h4 className="font-semibold text-gray-700 mb-1 flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Terms & Conditions:
            </h4>
            <ul className="list-disc pl-4 space-y-1">
              <li className="text-xs">
                Security deposit will be refunded after the bike is returned in
                good condition.
              </li>
              <li className="text-xs">
                Late returns will incur additional charges as per rental
                agreement.
              </li>
              <li className="text-xs">
                Fuel charges are not included in the package price.
              </li>
              <li className="text-xs">
                The renter is responsible for any traffic violations during the
                rental period.
              </li>
              <li className="text-xs">
                Damages to the vehicle will be charged as per assessment.
              </li>
              {booking?.addressType === "DELIVERY_AT_LOCATION" && (
                <li className="text-xs">
                  Delivery charge of ₹250 applies for location-based delivery
                  service.
                </li>
              )}
            </ul> */}
          {/* </div> */}

          <div className="text-center text-xs text-gray-600 mt-4 border-t border-gray-200 pt-3">
            <p className="font-medium">Thank you for choosing okbike!</p>
            <div className="flex justify-center items-center mt-1 space-x-2">
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 mr-1 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">okloadexpress11@gmail.com</span>
              </div>
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 mr-1 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-xs text-right">+917767060670 / +919112412191 </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="action-buttons"
        className="bg-gray-50 px-4 py-2 rounded-b-lg border-t border-gray-200 print:hidden"
      >
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <button
              className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300 flex items-center justify-center shadow-md text-xs"
              onClick={handleDownload}
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Invoice
            </button>
          </div>
          <button
            className="px-4 py-1.5 bg-orange-800 text-white rounded-md hover:bg-orange-700 transition duration-300 flex items-center justify-center shadow-md text-xs"
            onClick={() => window.print()}
          >
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
