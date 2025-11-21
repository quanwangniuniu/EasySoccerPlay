import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "../firebase";

const PlayerListSimple = ({ gameId, isOpen, onClose, parkName }) => {
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
            bookedAt: booking.bookedAt,
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

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[80vh] overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Players Registered
            </h2>
            <p className="text-gray-300 text-sm">{parkName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-300 p-2 rounded-xl hover:bg-gray-700/50"
          >
            <svg
              className="w-5 h-5"
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
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-700"></div>
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
              </div>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-3"
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
                <h3 className="text-lg font-bold text-white mb-2">
                  No Players Yet
                </h3>
                <p className="text-gray-400 text-sm">Be the first to book!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  {players.length} Player{players.length !== 1 ? "s" : ""}{" "}
                  Registered
                </h3>
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-1 rounded-lg border border-blue-500/30">
                  <span className="text-blue-300 font-semibold text-sm">
                    {players.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
                      player.isAdmin
                        ? "bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-500/50 hover:border-amber-400/70"
                        : "bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 hover:border-blue-500/50"
                    }`}
                  >
                    <div
                      className={`rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm ${
                        player.isAdmin
                          ? "bg-gradient-to-br from-amber-500 to-yellow-600"
                          : "bg-gradient-to-br from-blue-500 to-purple-600"
                      }`}
                    >
                      {player.isAdmin
                        ? "👑"
                        : player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">
                          {player.isAdmin
                            ? player.name.replace("(admin)", "").trim()
                            : player.name}
                        </p>
                        {player.isAdmin && (
                          <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-500/30 font-semibold">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root level
  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};

export default PlayerListSimple;
