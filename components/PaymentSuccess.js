import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const PaymentSuccess = ({
  isOpen,
  onClose,
  paymentDetails = {},
  bookingDetails = {},
  onViewBookings,
  onRefresh,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setAnimationStep(1);

      const timer1 = setTimeout(() => setAnimationStep(2), 300);
      const timer2 = setTimeout(() => setAnimationStep(3), 600);
      const timer3 = setTimeout(() => setShowConfetti(false), 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const {
    paymentId = "",
    amount = 0,
    numberOfPlayers = 1,
    playerNames = [],
    parkName = "",
    gameDate = null,
    gameTime = "",
  } = { ...paymentDetails, ...bookingDetails };

  const formatAmount = (amount) => {
    return `$${(amount / 100).toFixed(2)} AUD`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const timeObj = time.toDate ? time.toDate() : new Date(time);
    return timeObj.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    "#3B82F6",
                    "#10B981",
                    "#F59E0B",
                    "#EF4444",
                    "#8B5CF6",
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div
        className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-gray-700 max-w-lg w-full transform transition-all duration-500 relative ${
          animationStep >= 1 ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Success Icon */}
        <div className="text-center pt-8 pb-6">
          <div
            className={`mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center transform transition-all duration-700 ${
              animationStep >= 2 ? "scale-100 rotate-0" : "scale-0 rotate-180"
            }`}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div
            className={`mt-6 transform transition-all duration-500 delay-300 ${
              animationStep >= 3
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              🎉 Payment Successful!
            </h2>
            <p className="text-gray-300 text-lg">
              Your booking has been confirmed
            </p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl p-6 border border-gray-600/50 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Booking Details
            </h3>

            <div className="space-y-3">
              {parkName && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Location:</span>
                  <span className="text-white font-medium">{parkName}</span>
                </div>
              )}

              {gameDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Date:</span>
                  <span className="text-white font-medium">
                    {formatDate(gameDate)}
                  </span>
                </div>
              )}

              {gameTime && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Time:</span>
                  <span className="text-white font-medium">
                    {formatTime(gameTime)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Players:</span>
                <span className="text-white font-medium">
                  {numberOfPlayers}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <span className="text-gray-300">Total Paid:</span>
                <span className="text-green-400 font-bold text-lg">
                  {formatAmount(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Player Names */}
          {playerNames && playerNames.length > 0 && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-4 border border-blue-500/20 mb-6">
              <h4 className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wider">
                Registered Players
              </h4>
              <div className="flex flex-wrap gap-2">
                {playerNames.map((name, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-1 rounded-lg border border-blue-500/30"
                  >
                    <span className="text-blue-200 text-sm font-medium">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment ID */}
          {paymentId && (
            <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Payment ID:</span>
                <span className="text-gray-300 font-mono text-sm">
                  {paymentId.slice(-8)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                Refresh Page
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-600 hover:border-gray-500"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root level
  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};

export default PaymentSuccess;
