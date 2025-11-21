import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { app } from "../firebase";

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null); // Track which booking is being cancelled
  const [refunding, setRefunding] = useState(null); // Track which booking is being refunded
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [filter, setFilter] = useState("all"); // all, today, week, month
  const db = getFirestore(app);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const bookingsCollection = collection(db, "Bookings");
      const bookingsQuery = query(
        bookingsCollection,
        orderBy("bookedAt", "desc")
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsData = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId, booking) => {
    const isGroupBooking =
      booking.numberOfPlayersInGroup && booking.numberOfPlayersInGroup > 1;
    const confirmMessage = isGroupBooking
      ? `Are you sure you want to cancel the entire group booking (${booking.numberOfPlayersInGroup} players) for ${booking.customerName}? This will cancel all players in this group and cannot be undone.`
      : `Are you sure you want to cancel the booking for ${
          booking.playerName || booking.customerName
        }? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setCancelling(bookingId);

      const response = await fetch("/api/cancel-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          paymentIntentId: booking.paymentIntentId, // Send payment intent ID to cancel all related bookings
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      // Refresh the bookings list
      await fetchBookings();

      const successMessage = isGroupBooking
        ? `Group booking cancelled successfully! ${
            data.deletedBookingsCount || booking.numberOfPlayersInGroup
          } player bookings removed.`
        : "Booking cancelled successfully!";

      alert(successMessage);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert(`Error cancelling booking: ${error.message}`);
    } finally {
      setCancelling(null);
    }
  };

  const handleRefundBooking = (booking) => {
    setSelectedBooking(booking);
    setRefundAmount(""); // Full refund by default
    setRefundReason("");
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!selectedBooking) return;

    try {
      setRefunding(selectedBooking.id);

      const refundData = {
        bookingId: selectedBooking.id,
        paymentIntentId: selectedBooking.paymentIntentId,
        reason: refundReason || "Admin refund",
      };

      // If partial refund amount is specified, convert to cents
      if (refundAmount && refundAmount !== "") {
        const amountInCents = Math.round(parseFloat(refundAmount) * 100);
        if (amountInCents > 0 && amountInCents <= selectedBooking.amount) {
          refundData.refundAmount = amountInCents;
        } else {
          alert("Invalid refund amount");
          return;
        }
      }

      const response = await fetch("/api/refund-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      // Refresh the bookings list
      await fetchBookings();

      alert(`Refund processed successfully! Refund ID: ${data.refundId}`);
      setShowRefundModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Error processing refund:", error);
      alert(`Error processing refund: ${error.message}`);
    } finally {
      setRefunding(null);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-AU", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `$${(amount / 100).toFixed(2)} AUD`;
  };

  const getFilteredBookings = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return bookings.filter((booking) => {
      const bookingDate = booking.bookedAt.toDate
        ? booking.bookedAt.toDate()
        : new Date(booking.bookedAt);

      switch (filter) {
        case "today":
          return bookingDate >= today;
        case "week":
          return bookingDate >= weekAgo;
        case "month":
          return bookingDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const filteredBookings = getFilteredBookings();
  const totalRevenue = filteredBookings.reduce(
    (sum, booking) => sum + booking.amount,
    0
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-lg mr-3">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Booking History
              </h2>
              <p className="text-sm text-gray-600">
                Total Revenue: {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            {["all", "today", "week", "month"].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  filter === filterOption
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading bookings...</p>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.09m2.291-4.09A9.99 9.99 0 0112 13c-2.038 0-3.9.783-5.291 2.09M12 6.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No bookings found
          </h3>
          <p className="text-gray-600">
            No bookings match the selected filter period.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Game Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Booked At
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredBookings.map((booking, index) => (
                <tr
                  key={booking.id}
                  className={`hover:bg-purple-50 transition-colors duration-150 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {booking.playerName || booking.customerName}
                        </div>
                        {booking.numberOfPlayersInGroup &&
                          booking.numberOfPlayersInGroup > 1 && (
                            <div className="text-xs text-gray-500">
                              Player {booking.playerIndex} of{" "}
                              {booking.numberOfPlayersInGroup}
                            </div>
                          )}
                        {booking.playerName &&
                          booking.playerName !== booking.customerName && (
                            <div className="text-xs text-gray-500">
                              Booked by: {booking.customerName}
                            </div>
                          )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      <div>{booking.customerEmail}</div>
                      {booking.customerPhone && (
                        <div className="text-xs text-gray-500">
                          {booking.customerPhone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">{booking.parkName}</div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(booking.gameStartTime)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {booking.amountPerPlayer
                          ? formatCurrency(booking.amountPerPlayer)
                          : formatCurrency(booking.amount)}
                      </span>
                      {booking.numberOfPlayersInGroup &&
                        booking.numberOfPlayersInGroup > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Total: {formatCurrency(booking.amount)}
                          </div>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateTime(booking.bookedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "refunded"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {booking.status}
                    </span>
                    {booking.status === "refunded" && booking.refundAmount && (
                      <div className="text-xs text-gray-500 mt-1">
                        Refunded: {formatCurrency(booking.refundAmount)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {booking.paymentIntentId.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {booking.status === "confirmed" &&
                        booking.paymentIntentId && (
                          <>
                            <button
                              onClick={() => handleRefundBooking(booking)}
                              disabled={refunding === booking.id}
                              className={`inline-flex items-center px-3 py-1 border rounded-lg transition-all duration-200 font-semibold ${
                                refunding === booking.id
                                  ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                  : "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400"
                              }`}
                            >
                              {refunding === booking.id ? (
                                <>
                                  <svg
                                    className="animate-spin w-4 h-4 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                    />
                                  </svg>
                                  Refund
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleCancelBooking(booking.id, booking)
                              }
                              disabled={cancelling === booking.id}
                              className={`inline-flex items-center px-3 py-1 border rounded-lg transition-all duration-200 font-semibold ${
                                cancelling === booking.id
                                  ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                  : "border-red-300 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400"
                              }`}
                            >
                              {cancelling === booking.id ? (
                                <>
                                  <svg
                                    className="animate-spin w-4 h-4 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  Cancel
                                </>
                              )}
                            </button>
                          </>
                        )}
                      {booking.status === "refunded" && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-lg">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Refunded
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Process Refund
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedBooking.playerName || selectedBooking.customerName} -{" "}
                {selectedBooking.parkName}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Original Amount:</strong>{" "}
                  {formatCurrency(selectedBooking.amount)}
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  <strong>Payment ID:</strong>{" "}
                  {selectedBooking.paymentIntentId.slice(-8)}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount (leave empty for full refund)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedBooking.amount / 100}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Max: $${(selectedBooking.amount / 100).toFixed(
                    2
                  )}`}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="requested_by_customer">
                    Customer Request
                  </option>
                  <option value="duplicate">Duplicate Payment</option>
                  <option value="fraudulent">Fraudulent</option>
                  <option value="admin_decision">Admin Decision</option>
                  <option value="event_cancelled">Event Cancelled</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedBooking(null);
                    setRefundAmount("");
                    setRefundReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processRefund}
                  disabled={refunding}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {refunding ? "Processing..." : "Process Refund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
