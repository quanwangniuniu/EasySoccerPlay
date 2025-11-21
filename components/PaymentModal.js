import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Modal from "react-modal";

const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

// Set the app element for accessibility
if (typeof window !== "undefined") {
  Modal.setAppElement("#__next");
}

const CheckoutForm = ({
  gameId,
  parkName,
  amount,
  onSuccess,
  onCancel,
  onFailure,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [numberOfPlayers, setNumberOfPlayers] = useState(1);
  const [additionalPlayers, setAdditionalPlayers] = useState([]);

  // Update additional players array when numberOfPlayers changes
  useEffect(() => {
    const newAdditionalPlayers = [];
    for (let i = 0; i < numberOfPlayers - 1; i++) {
      newAdditionalPlayers.push({
        name: additionalPlayers[i]?.name || "",
      });
    }
    setAdditionalPlayers(newAdditionalPlayers);
  }, [numberOfPlayers]);

  // Create payment intent when component mounts
  useEffect(() => {
    if (gameId && amount) {
      const createPaymentIntent = async () => {
        try {
          const response = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: amount * numberOfPlayers,
              gameId,
              parkName,
              numberOfPlayers,
              players: [
                { name: customerInfo.name },
                ...additionalPlayers.filter((player) => player.name),
              ].filter((player) => player.name),
            }),
          });

          const data = await response.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setError("Failed to create payment intent");
          }
        } catch (err) {
          setError("Network error");
        }
      };

      createPaymentIntent();
    }
  }, [gameId, amount, numberOfPlayers, customerInfo.name, additionalPlayers]);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "transparent",
        "::placeholder": {
          color: "#9ca3af",
        },
        ":focus": {
          color: "#ffffff",
        },
      },
      invalid: {
        color: "#f87171",
      },
      complete: {
        color: "#10b981",
      },
    },
    hidePostalCode: true, // Hide postal code for Australian cards
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (
      !customerInfo.name ||
      !customerInfo.email ||
      (numberOfPlayers > 1 && additionalPlayers.some((player) => !player.name))
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      // Create payment intent with updated information
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * numberOfPlayers,
          gameId,
          parkName,
          numberOfPlayers,
          players: [
            { name: customerInfo.name },
            ...additionalPlayers.filter((player) => player.name),
          ].filter((player) => player.name),
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
        }),
      });

      const { clientSecret: newClientSecret } = await response.json();

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        newClientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
              address: {
                country: "AU", // Set country to Australia
              },
            },
          },
        }
      );

      if (error) {
        setError(error.message);
        if (onFailure) {
          onFailure(error);
        }
      } else if (paymentIntent.status === "succeeded") {
        // Include form data as fallback in case metadata is missing
        const enhancedPaymentIntent = {
          ...paymentIntent,
          formData: {
            numberOfPlayers,
            playerNames: [
              customerInfo.name,
              ...additionalPlayers.filter((p) => p.name).map((p) => p.name),
            ],
            customerName: customerInfo.name,
            customerEmail: customerInfo.email,
            customerPhone: customerInfo.phone,
          },
        };
        onSuccess(enhancedPaymentIntent);
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred";
      setError(errorMessage);
      if (onFailure) {
        onFailure({ message: errorMessage, originalError: err });
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Park name with icon */}
      <div className="flex items-center justify-center mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-blue-400 mr-2"
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
          <span className="text-lg font-semibold text-white">{parkName}</span>
        </div>
      </div>

      {/* Number of Players */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Number of players:
        </label>
        <select
          value={numberOfPlayers}
          onChange={(e) => setNumberOfPlayers(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
        >
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <option key={num} value={num} className="bg-gray-800 text-white">
              {num} player{num > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Total booking fee */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-4 rounded-xl border border-gray-600">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">
            Total booking fee:
          </span>
          <span className="text-lg font-bold text-blue-400">
            ${((amount * numberOfPlayers) / 100).toFixed(2)} AUD
          </span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-white">Your Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white placeholder-gray-400"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={customerInfo.email}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white placeholder-gray-400"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            value={customerInfo.phone}
            onChange={(e) =>
              setCustomerInfo({ ...customerInfo, phone: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white placeholder-gray-400"
            placeholder="+61 400 000 000"
          />
        </div>
      </div>

      {/* Additional Players */}
      {numberOfPlayers > 1 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-white">
            Additional Players
          </h4>
          <div className="space-y-3">
            {additionalPlayers.map((player, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Player {index + 2} Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={player.name}
                  onChange={(e) => {
                    const newAdditionalPlayers = [...additionalPlayers];
                    newAdditionalPlayers[index] = {
                      ...player,
                      name: e.target.value,
                    };
                    setAdditionalPlayers(newAdditionalPlayers);
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white placeholder-gray-400"
                  placeholder={`Player ${index + 2} name`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Details */}
      <div className="border border-gray-600 rounded-xl p-4 bg-gray-800/50">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Card details
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border-2 border-gray-600 rounded-xl text-gray-300 font-semibold hover:bg-gray-800/50 hover:border-gray-500 hover:text-white transition-all duration-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            !stripe ||
            isLoading ||
            !customerInfo.name ||
            !customerInfo.email ||
            !clientSecret ||
            (numberOfPlayers > 1 &&
              additionalPlayers.some((player) => !player.name))
          }
          className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 ${
            !stripe ||
            isLoading ||
            !customerInfo.name ||
            !customerInfo.email ||
            !clientSecret ||
            (numberOfPlayers > 1 &&
              additionalPlayers.some((player) => !player.name))
              ? "bg-gray-700 cursor-not-allowed text-gray-400"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
          }`}
        >
          {isLoading ? (
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
              Processing...
            </span>
          ) : (
            `Pay $${((amount * numberOfPlayers) / 100).toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

const PaymentModal = ({
  isOpen,
  onClose,
  gameId,
  parkName,
  amount = 1800,
  onSuccess,
  onFailure,
}) => {
  const stripePromise = getStripe();

  const modalStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      padding: "0",
      border: "1px solid rgb(55, 65, 81)",
      borderRadius: "1.5rem",
      background:
        "linear-gradient(135deg, rgb(17, 24, 39) 0%, rgb(31, 41, 55) 100%)",
      boxShadow:
        "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 130, 246, 0.1)",
      maxWidth: "36rem",
      width: "90vw",
      maxHeight: "90vh",
      overflow: "auto",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      backdropFilter: "blur(12px)",
      zIndex: 9999,
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={modalStyles}
      contentLabel="Book Your Spot"
    >
      <div className="p-8">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Book Your Spot
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-300 p-3 rounded-xl hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            locale: "en-AU",
            appearance: {
              theme: "night",
              variables: {
                colorPrimary: "#3B82F6",
                colorBackground: "#1F2937",
                colorText: "#FFFFFF",
                colorDanger: "#EF4444",
                fontFamily: "system-ui, sans-serif",
                borderRadius: "8px",
              },
            },
          }}
        >
          <CheckoutForm
            gameId={gameId}
            parkName={parkName}
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onClose}
            onFailure={onFailure}
          />
        </Elements>
      </div>
    </Modal>
  );
};

export default PaymentModal;
