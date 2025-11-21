import { useState } from "react";
import PaymentModal from "./PaymentModal";
import PlayerListSimple from "./PlayerListSimple";
import PaymentSuccess from "./PaymentSuccess";
import PaymentFailure from "./PaymentFailure";

const GameCard = ({ game, onBookingSuccess }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [localBookedCount, setLocalBookedCount] = useState(game.bookedCount);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentFailure, setShowPaymentFailure] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBooking = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentFailure = (error) => {
    setPaymentError({
      message: error.message || "Payment failed",
      code: error.code || null,
      details: error,
    });
    setShowPaymentModal(false);
    setShowPaymentFailure(true);
  };

  const handleRetryPayment = () => {
    setShowPaymentFailure(false);
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      setIsBooking(true);

      // Debug logging
      console.log("🎉 Payment Success - PaymentIntent:", paymentIntent);
      console.log("🎉 Payment Success - Metadata:", paymentIntent.metadata);

      // The Stripe webhook will handle updating the booking count
      // No need to call /api/update-booking here as it would duplicate the count

      // Get number of players from payment intent metadata with null checks
      const metadata = paymentIntent.metadata || {};
      const formData = paymentIntent.formData || {};

      const numberOfPlayers =
        parseInt(metadata.numberOfPlayers) || formData.numberOfPlayers || 1;

      const playerNames = metadata.playerNames
        ? metadata.playerNames.split(", ")
        : formData.playerNames && formData.playerNames.length > 0
        ? formData.playerNames
        : metadata.customerName
        ? [metadata.customerName]
        : formData.customerName
        ? [formData.customerName]
        : [`Player 1`];

      // Update local state optimistically (will be corrected on page refresh)
      setLocalBookedCount((prevCount) => prevCount + numberOfPlayers);
      setShowPaymentModal(false);

      // Prepare payment data for success modal
      setPaymentData({
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        numberOfPlayers: numberOfPlayers,
        playerNames: playerNames,
        parkName: game.parkName,
        gameDate: game.gameTimeStart,
        gameTime: game.gameTimeStart,
      });

      // Show success modal
      setShowPaymentSuccess(true);

      // Call parent callback if provided to refresh the games list
      if (onBookingSuccess) {
        onBookingSuccess(game.id);
      }
    } catch (error) {
      console.error("Error processing payment success:", error);

      // Still show success since payment went through
      const fallbackMetadata = paymentIntent.metadata || {};
      const fallbackFormData = paymentIntent.formData || {};
      setPaymentData({
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        numberOfPlayers:
          parseInt(fallbackMetadata.numberOfPlayers) ||
          fallbackFormData.numberOfPlayers ||
          1,
        playerNames: fallbackMetadata.playerNames
          ? fallbackMetadata.playerNames.split(", ")
          : fallbackFormData.playerNames &&
            fallbackFormData.playerNames.length > 0
          ? fallbackFormData.playerNames
          : fallbackMetadata.customerName
          ? [fallbackMetadata.customerName]
          : fallbackFormData.customerName
          ? [fallbackFormData.customerName]
          : [`Player 1`],
        parkName: game.parkName,
        gameDate: game.gameTimeStart,
        gameTime: game.gameTimeStart,
      });
      setShowPaymentSuccess(true);

      // Don't auto-refresh - let user see the success modal first
    } finally {
      setIsBooking(false);
    }
  };

  const spotsLeft = game.totalPlayers - localBookedCount;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 hover:shadow-3xl hover:border-blue-500/50 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 backdrop-blur-sm card-hover glass float">
      {/* Park Name Header */}
      <div className="flex items-center mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl mr-4 shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-shimmer">{game.parkName}</h3>
      </div>

      {/* Date and Time */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center text-gray-300 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <svg
            className="w-5 h-5 mr-3 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-semibold text-white">
            {formatDate(game.gameTimeStart)}
          </span>
        </div>
        <div className="flex items-center text-gray-300 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <svg
            className="w-5 h-5 mr-3 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold text-white">
            {formatTime(game.gameTimeStart)} - {formatTime(game.gameTimeEnd)}
          </span>
        </div>
      </div>

      {/* Player Count */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Players Registered
          </span>
          <span
            className={`text-lg font-bold px-3 py-1 rounded-full ${
              spotsLeft > 5
                ? "text-emerald-400 bg-emerald-500/20"
                : spotsLeft > 0
                ? "text-amber-400 bg-amber-500/20"
                : "text-red-400 bg-red-500/20"
            }`}
          >
            {localBookedCount} / {game.totalPlayers}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 shadow-inner">
          <div
            className={`h-3 rounded-full transition-all duration-500 shadow-lg ${
              spotsLeft > 5
                ? "bg-gradient-to-r from-emerald-500 to-green-400"
                : spotsLeft > 0
                ? "bg-gradient-to-r from-amber-500 to-orange-400"
                : "bg-gradient-to-r from-red-500 to-pink-400"
            }`}
            style={{
              width: `${(localBookedCount / game.totalPlayers) * 100}%`,
            }}
          ></div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              spotsLeft > 5
                ? "text-emerald-300 bg-emerald-500/10"
                : spotsLeft > 0
                ? "text-amber-300 bg-amber-500/10"
                : "text-red-300 bg-red-500/10"
            }`}
          >
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "Fully Booked"}
          </span>
          {localBookedCount > 0 && (
            <button
              onClick={() => setShowPlayerList(true)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1 rounded-lg transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50"
            >
              See Players
            </button>
          )}
        </div>
      </div>

      {/* Book Button */}
      <button
        onClick={handleBooking}
        disabled={spotsLeft === 0 || isBooking}
        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
          spotsLeft === 0
            ? "bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600"
            : isBooking
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white cursor-wait animate-pulse pulse-glow"
            : "bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white hover:from-blue-600 hover:via-purple-700 hover:to-pink-600 shadow-2xl hover:shadow-blue-500/25 hover:-translate-y-1 hover:scale-105 border border-blue-500/50 glow-button"
        }`}
      >
        {spotsLeft === 0 ? (
          <span className="flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            Fully Booked
          </span>
        ) : isBooking ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
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
            Booking...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Book Spot
          </span>
        )}
      </button>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        gameId={game.id}
        parkName={game.parkName}
        amount={1800}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />

      <PaymentSuccess
        isOpen={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        paymentDetails={paymentData}
        bookingDetails={{
          parkName: game.parkName,
          gameDate: game.gameTimeStart,
          gameTime: game.gameTimeStart,
        }}
        onRefresh={() => window.location.reload()}
      />

      <PaymentFailure
        isOpen={showPaymentFailure}
        onClose={() => setShowPaymentFailure(false)}
        onRetry={handleRetryPayment}
        errorMessage={paymentError?.message}
        errorDetails={paymentError?.details}
        bookingDetails={{
          parkName: game.parkName,
          gameDate: game.gameTimeStart,
          gameTime: game.gameTimeStart,
          amount: 1800,
          numberOfPlayers: 1,
        }}
      />

      <PlayerListSimple
        gameId={game.id}
        isOpen={showPlayerList}
        onClose={() => setShowPlayerList(false)}
        parkName={game.parkName}
      />
    </div>
  );
};

export default GameCard;
