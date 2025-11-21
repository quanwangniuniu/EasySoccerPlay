import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "../firebase";

const PlayerList = ({ gameId, isOpen, onClose, parkName }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const db = getFirestore(app);

  useEffect(() => {
    if (isOpen && gameId) {
      fetchPlayers();
    }
  }, [isOpen, gameId]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const bookingsCollection = collection(db, "Bookings");
      const bookingsQuery = query(
        bookingsCollection,
        where("gameId", "==", gameId)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const playersList = [];

      bookingsSnapshot.docs.forEach((doc) => {
        const booking = doc.data();

        // Each booking document represents one player
        // The webhook creates separate documents for each player in a group booking
        const playerName =
          booking.playerName || booking.customerName || "Unknown Player";

        if (playerName && playerName.trim()) {
          playersList.push({
            id: doc.id,
            name: playerName.trim(),
            email: booking.customerEmail,
            phone: booking.customerPhone,
            bookedAt: booking.bookedAt,
            paymentId: booking.paymentIntentId,
            isAdmin: booking.isAdmin || playerName.includes("(admin)"),
            isManualBooking: booking.isManualBooking || false,
          });
        }
      });

      // Sort admin players first, then by bookedAt
      playersList.sort((a, b) => {
        // Admin players always come first
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;

        // If both are admin or both are regular players, sort by booking time
        if (!a.bookedAt || !b.bookedAt) return 0;
        const dateA = a.bookedAt.toDate
          ? a.bookedAt.toDate()
          : new Date(a.bookedAt);
        const dateB = b.bookedAt.toDate
          ? b.bookedAt.toDate()
          : new Date(b.bookedAt);
        return dateA - dateB; // Admin first, then earliest booking first
      });

      setPlayers(playersList);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Player List</h2>
            <p className="text-gray-300">{parkName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-300 p-2 rounded-xl hover:bg-gray-700/50"
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
              </div>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">
                  No Players Yet
                </h3>
                <p className="text-gray-400">
                  No one has booked for this game yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {players.length} Player{players.length !== 1 ? "s" : ""}{" "}
                  Registered
                </h3>
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                  <span className="text-blue-300 font-semibold">
                    Total: {players.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`rounded-xl p-4 border transition-all duration-300 ${
                      player.isAdmin
                        ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-500/50 hover:border-amber-400/70"
                        : "bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600 hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg ${
                            player.isAdmin
                              ? "bg-gradient-to-br from-amber-500 to-yellow-600"
                              : "bg-gradient-to-br from-blue-500 to-purple-600"
                          }`}
                        >
                          {player.isAdmin
                            ? "👑"
                            : player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white font-semibold text-lg">
                              {player.isAdmin
                                ? player.name.replace("(admin)", "").trim()
                                : player.name}
                            </h4>
                            {player.isAdmin && (
                              <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-500/30 font-semibold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {player.email && (
                              <p className="text-gray-300 text-sm flex items-center">
                                <svg
                                  className="w-4 h-4 mr-2 text-blue-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                {player.email}
                              </p>
                            )}
                            {player.phone && (
                              <p className="text-gray-300 text-sm flex items-center">
                                <svg
                                  className="w-4 h-4 mr-2 text-green-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                {player.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-gray-700/50 px-3 py-1 rounded-lg">
                          <span className="text-xs text-gray-400">Booked</span>
                          <p className="text-sm text-white font-medium">
                            {formatDateTime(player.bookedAt)}
                          </p>
                        </div>
                        {player.paymentId &&
                          !player.isManualBooking &&
                          !player.isAdmin && (
                            <p className="text-xs text-gray-500 mt-2">
                              Payment: {player.paymentId.slice(-8)}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerList;
