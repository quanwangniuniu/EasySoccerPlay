import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../components/AuthContext";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { app } from "../firebase";
import Link from "next/link";
import BookingHistory from "../components/BookingHistory";
import PlayerList from "../components/PlayerList";

export default function Admin() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    parkName: "",
    gameDate: "",
    startTime: "",
    endTime: "",
    totalPlayers: 22,
  });
  const [creating, setCreating] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [manualBookingData, setManualBookingData] = useState({
    playerName: "",
    customerEmail: "",
    customerPhone: "",
  });
  const [manualBookingLoading, setManualBookingLoading] = useState(false);
  const db = getFirestore(app);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchGames();
  }, [user, router]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const gamesCollection = collection(db, "Game");
      const gamesQuery = query(gamesCollection, orderBy("game-time-start"));
      const gamesSnapshot = await getDocs(gamesQuery);

      const gamesData = gamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        parkName: doc.data()["park-name"],
        gameTimeStart: doc.data()["game-time-start"],
        gameTimeEnd: doc.data()["game-time-end"],
        totalPlayers: doc.data()["total-players"],
        bookedCount: doc.data()["booked-count"] || 0,
      }));

      setGames(gamesData);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();

    try {
      setCreating(true);

      // Combine date and time for start and end times
      const startDateTime = new Date(
        `${formData.gameDate}T${formData.startTime}`
      );
      const endDateTime = new Date(`${formData.gameDate}T${formData.endTime}`);

      const gameData = {
        "park-name": formData.parkName,
        "game-time-start": Timestamp.fromDate(startDateTime),
        "game-time-end": Timestamp.fromDate(endDateTime),
        "total-players": parseInt(formData.totalPlayers),
        "booked-count": 1, // Ray Li (admin) is automatically booked
      };

      // Create the game
      const gameDocRef = await addDoc(collection(db, "Game"), gameData);
      const gameId = gameDocRef.id;

      // Automatically create admin booking for Ray Li
      const adminBookingData = {
        gameId: gameId,
        parkName: formData.parkName,
        playerName: "Ray Li (admin)",
        customerName: "Ray Li",
        customerEmail: "admin@easyplay.com",
        customerPhone: "",
        paymentIntentId: "admin_booking",
        amount: 0, // No charge for admin
        amountPerPlayer: 0,
        currency: "aud",
        status: "confirmed",
        bookedAt: Timestamp.now(),
        gameDate: Timestamp.fromDate(startDateTime),
        gameStartTime: Timestamp.fromDate(startDateTime),
        gameEndTime: Timestamp.fromDate(endDateTime),
        numberOfPlayersInGroup: 1,
        playerIndex: 1,
        isAdmin: true, // Flag to identify admin bookings
      };

      await addDoc(collection(db, "Bookings"), adminBookingData);

      console.log(`✅ Game created with admin booking - Game ID: ${gameId}`);

      // Reset form and refresh games
      setFormData({
        parkName: "",
        gameDate: "",
        startTime: "",
        endTime: "",
        totalPlayers: 22,
      });
      setShowCreateForm(false);
      fetchGames();
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Error creating game. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (
      confirm(
        "Are you sure you want to delete this game? This will also delete all associated bookings and cannot be undone."
      )
    ) {
      try {
        const response = await fetch("/api/delete-game", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.details || data.error || "Failed to delete game"
          );
        }

        alert(data.message);
        fetchGames();
      } catch (error) {
        console.error("Error deleting game:", error);
        alert("Error deleting game. Please try again.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleViewPlayers = (game) => {
    setSelectedGame(game);
    setShowPlayerList(true);
  };

  const handleManualBooking = (game) => {
    setSelectedGame(game);
    setShowManualBooking(true);
  };

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();

    if (!manualBookingData.playerName.trim()) {
      alert("Please enter a player name");
      return;
    }

    try {
      setManualBookingLoading(true);

      const response = await fetch("/api/manual-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: selectedGame.id,
          parkName: selectedGame.parkName,
          playerName: manualBookingData.playerName,
          customerEmail: manualBookingData.customerEmail,
          customerPhone: manualBookingData.customerPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to add player");
      }

      alert(data.message);

      // Reset form and close modal
      setManualBookingData({
        playerName: "",
        customerEmail: "",
        customerPhone: "",
      });
      setShowManualBooking(false);

      // Refresh games list
      fetchGames();
    } catch (error) {
      console.error("Error adding player manually:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setManualBookingLoading(false);
    }
  };

  const handleCloseManualBooking = () => {
    setShowManualBooking(false);
    setManualBookingData({
      playerName: "",
      customerEmail: "",
      customerPhone: "",
    });
    setSelectedGame(null);
  };

  const handleClosePlayerList = () => {
    setShowPlayerList(false);
    setSelectedGame(null);
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent"
              >
                EasyPlay Soccer
              </Link>
              <span className="ml-4 text-sm bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 px-3 py-2 rounded-xl border border-blue-500/30 font-semibold">
                Admin Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-300 font-medium">
                Welcome, {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-xl hover:bg-gray-800/50 transition-all duration-300 border border-gray-700 hover:border-gray-600 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Game Management
              </h1>
              <p className="text-gray-600 text-lg">
                Organize and manage soccer games for your community
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`inline-flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                showCreateForm
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              {showCreateForm ? (
                <>
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
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
                  Create New Game
                </>
              )}
            </button>
          </div>

          {/* Create Game Form */}
          {showCreateForm && (
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 mb-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Game
                </h2>
              </div>

              <form onSubmit={handleCreateGame} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Park Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.parkName}
                      onChange={(e) =>
                        setFormData({ ...formData, parkName: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium placeholder-gray-400"
                      placeholder="e.g., Perry Park"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Total Players *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={formData.totalPlayers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalPlayers: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Game Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.gameDate}
                      onChange={(e) =>
                        setFormData({ ...formData, gameDate: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium"
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-1">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className={`px-8 py-3 rounded-lg text-white font-semibold transition-all duration-200 ${
                      creating
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
                    }`}
                  >
                    {creating ? (
                      <span className="flex items-center">
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
                        Creating...
                      </span>
                    ) : (
                      "Create Game"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Booking History */}
        <div className="mb-8">
          <BookingHistory />
        </div>

        {/* Games List */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="px-8 py-6 border-b border-gray-700 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-t-2xl">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl mr-4 shadow-lg">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">All Games</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <p className="text-gray-300 font-medium mt-4">
                  Loading games...
                </p>
              </div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 max-w-md mx-auto">
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
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.09m2.291-4.09A9.99 9.99 0 0112 13c-2.038 0-3.9.783-5.291 2.09M12 6.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z"
                  />
                </svg>
                <h3 className="text-2xl font-bold text-white mb-4">
                  No games yet
                </h3>
                <p className="text-gray-400">
                  Create your first game using the form above!
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-800/50 to-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Park Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                      End Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {games.map((game, index) => (
                    <tr
                      key={game.id}
                      className={`hover:bg-gray-800/50 transition-colors duration-300 ${
                        index % 2 === 0 ? "bg-gray-900/50" : "bg-gray-800/30"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        <div className="flex items-center">
                          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                            <svg
                              className="w-4 h-4 text-white"
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
                          {game.parkName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">
                        {formatDateTime(game.gameTimeStart)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">
                        {formatDateTime(game.gameTimeEnd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              game.bookedCount === 0
                                ? "bg-green-500/20 text-green-300"
                                : game.bookedCount < game.totalPlayers / 2
                                ? "bg-yellow-500/20 text-yellow-300"
                                : game.bookedCount < game.totalPlayers
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {game.bookedCount} / {game.totalPlayers}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {game.totalPlayers - game.bookedCount} left
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPlayers(game)}
                            className="inline-flex items-center px-3 py-1 border border-blue-500/50 text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 hover:border-blue-400 rounded-lg transition-all duration-300 font-semibold"
                          >
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
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            View Players
                          </button>
                          <button
                            onClick={() => handleManualBooking(game)}
                            disabled={game.bookedCount >= game.totalPlayers}
                            className={`inline-flex items-center px-3 py-1 border rounded-lg transition-all duration-300 font-semibold ${
                              game.bookedCount >= game.totalPlayers
                                ? "border-gray-500/50 text-gray-400 bg-gray-500/20 cursor-not-allowed"
                                : "border-green-500/50 text-green-300 bg-green-500/20 hover:bg-green-500/30 hover:border-green-400"
                            }`}
                          >
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
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Manual Add
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-500/50 text-red-300 bg-red-500/20 hover:bg-red-500/30 hover:border-red-400 rounded-lg transition-all duration-300 font-semibold"
                          >
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
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Player List Modal */}
      <PlayerList
        gameId={selectedGame?.id}
        isOpen={showPlayerList}
        onClose={handleClosePlayerList}
        parkName={selectedGame?.parkName}
      />

      {/* Manual Booking Modal */}
      {showManualBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Manual Add Player
                </h2>
                <p className="text-gray-300 text-sm">
                  {selectedGame?.parkName}
                </p>
              </div>
              <button
                onClick={handleCloseManualBooking}
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

            {/* Form */}
            <form
              onSubmit={handleManualBookingSubmit}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={manualBookingData.playerName}
                  onChange={(e) =>
                    setManualBookingData({
                      ...manualBookingData,
                      playerName: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300"
                  placeholder="Enter player name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={manualBookingData.customerEmail}
                  onChange={(e) =>
                    setManualBookingData({
                      ...manualBookingData,
                      customerEmail: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={manualBookingData.customerPhone}
                  onChange={(e) =>
                    setManualBookingData({
                      ...manualBookingData,
                      customerPhone: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-300"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseManualBooking}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    manualBookingLoading || !manualBookingData.playerName.trim()
                  }
                  className={`flex-1 py-3 px-4 font-semibold rounded-lg transition-all duration-300 ${
                    manualBookingLoading || !manualBookingData.playerName.trim()
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  }`}
                >
                  {manualBookingLoading ? (
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
                      Adding...
                    </span>
                  ) : (
                    "Add Player"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
