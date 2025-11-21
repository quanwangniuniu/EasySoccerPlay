import { useState, useEffect } from "react";

const PaymentFailure = ({
  isOpen,
  onClose,
  onRetry,
  errorMessage = "Payment failed",
  errorDetails = {},
  bookingDetails = {},
}) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationStep(1);
      const timer1 = setTimeout(() => setAnimationStep(2), 300);
      const timer2 = setTimeout(() => setAnimationStep(3), 600);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const {
    amount = 0,
    numberOfPlayers = 1,
    parkName = "",
    gameDate = null,
    gameTime = "",
  } = bookingDetails;

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

  const getErrorIcon = () => {
    if (errorMessage.toLowerCase().includes("insufficient")) {
      return (
        <svg
          className="w-10 h-10 text-white"
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
      );
    }

    if (
      errorMessage.toLowerCase().includes("card") ||
      errorMessage.toLowerCase().includes("declined")
    ) {
      return (
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-10 h-10 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    );
  };

  const getErrorTitle = () => {
    if (errorMessage.toLowerCase().includes("insufficient")) {
      return "💳 Insufficient Funds";
    }

    if (
      errorMessage.toLowerCase().includes("card") ||
      errorMessage.toLowerCase().includes("declined")
    ) {
      return "💳 Card Declined";
    }

    if (
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("connection")
    ) {
      return "🌐 Connection Error";
    }

    return "❌ Payment Failed";
  };

  const getErrorSuggestion = () => {
    if (errorMessage.toLowerCase().includes("insufficient")) {
      return "Please check your account balance or try a different payment method.";
    }

    if (
      errorMessage.toLowerCase().includes("card") ||
      errorMessage.toLowerCase().includes("declined")
    ) {
      return "Please check your card details or try a different card.";
    }

    if (
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("connection")
    ) {
      return "Please check your internet connection and try again.";
    }

    return "Please try again or contact support if the problem persists.";
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-gray-700 max-w-lg w-full transform transition-all duration-500 ${
          animationStep >= 1 ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Error Icon */}
        <div className="text-center pt-8 pb-6">
          <div
            className={`mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center transform transition-all duration-700 ${
              animationStep >= 2 ? "scale-100 rotate-0" : "scale-0 rotate-180"
            }`}
          >
            {getErrorIcon()}
          </div>

          <div
            className={`mt-6 transform transition-all duration-500 delay-300 ${
              animationStep >= 3
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              {getErrorTitle()}
            </h2>
            <p className="text-gray-300 text-lg">{getErrorSuggestion()}</p>
          </div>
        </div>

        {/* Error Details */}
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl p-6 border border-red-500/20 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Error Details
            </h3>

            <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
              <p className="text-red-300 text-sm font-medium">{errorMessage}</p>
              {errorDetails.code && (
                <p className="text-red-400/70 text-xs mt-2 font-mono">
                  Error Code: {errorDetails.code}
                </p>
              )}
            </div>
          </div>

          {/* Booking Summary */}
          {(parkName || amount > 0) && (
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
                Booking Summary
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

                {numberOfPlayers > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Players:</span>
                    <span className="text-white font-medium">
                      {numberOfPlayers}
                    </span>
                  </div>
                )}

                {amount > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span className="text-gray-300">Amount:</span>
                    <span className="text-red-400 font-bold text-lg">
                      {formatAmount(amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Common Issues */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20 mb-6">
            <h4 className="text-sm font-semibold text-yellow-300 mb-3 uppercase tracking-wider flex items-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Common Solutions
            </h4>
            <ul className="text-yellow-200/80 text-sm space-y-1">
              <li>• Check your card details are correct</li>
              <li>• Ensure sufficient funds are available</li>
              <li>• Try a different payment method</li>
              <li>• Check your internet connection</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
              >
                Try Again
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-600 hover:border-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
