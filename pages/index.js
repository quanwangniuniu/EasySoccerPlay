import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "../components/AuthContext";
import GameCard from "../components/GameCard";
import ParticleBackground from "../components/ParticleBackground";
import { app } from "../firebase";
import Link from "next/link";

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const db = getFirestore(app);

  useEffect(() => {
    let isMounted = true;
    
    const loadGames = async () => {
      if (isMounted) {
        await fetchGames();
      }
    };
    
    loadGames();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      const gamesCollection = collection(db, "Game");
      
      // Try with orderBy first, but fallback to simple query if it fails
      let gamesQuery;
      let useOrderBy = true;
      
      try {
        gamesQuery = query(gamesCollection, orderBy("game-time-start"));
      } catch (queryError) {
        useOrderBy = false;
        gamesQuery = gamesCollection;
      }
      
      // Add timeout protection (30 seconds max)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout after 30 seconds")), 30000);
      });
      
      const gamesSnapshot = await Promise.race([
        getDocs(gamesQuery),
        timeoutPromise
      ]);

      let gamesData = gamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        parkName: doc.data()["park-name"],
        gameTimeStart: doc.data()["game-time-start"],
        gameTimeEnd: doc.data()["game-time-end"],
        totalPlayers: doc.data()["total-players"],
        bookedCount: doc.data()["booked-count"] || 0,
      }));

      // Sort manually if we didn't use orderBy
      if (!useOrderBy && gamesData.length > 0) {
        gamesData = gamesData.sort((a, b) => {
          const timeA = a.gameTimeStart?.toMillis?.() || 0;
          const timeB = b.gameTimeStart?.toMillis?.() || 0;
          return timeA - timeB;
        });
      }
      
      setGames(gamesData);
    } catch (error) {
      console.error("Error fetching games:", error);
      
      // Check for specific error types
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        // Try fallback query without orderBy
        try {
          const fallbackCollection = collection(db, "Game");
          const fallbackSnapshot = await getDocs(fallbackCollection);
          
          let fallbackGames = fallbackSnapshot.docs.map((doc) => ({
            id: doc.id,
            parkName: doc.data()["park-name"],
            gameTimeStart: doc.data()["game-time-start"],
            gameTimeEnd: doc.data()["game-time-end"],
            totalPlayers: doc.data()["total-players"],
            bookedCount: doc.data()["booked-count"] || 0,
          }));
          
          // Sort manually
          fallbackGames = fallbackGames.sort((a, b) => {
            const timeA = a.gameTimeStart?.toMillis?.() || 0;
            const timeB = b.gameTimeStart?.toMillis?.() || 0;
            return timeA - timeB;
          });
          
          setGames(fallbackGames);
          return;
        } catch (fallbackError) {
          console.error("Fallback query failed:", fallbackError);
        }
      }
      
      // Set empty array on error
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSuccess = (gameId) => {
    // Don't immediately refresh - let the success modal show first
    // The webhook will update the database, and user can manually refresh if needed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative">
      <ParticleBackground />
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl mr-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h1 className="lg:text-3xl text-xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                EasyPlay Soccer
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              {user ? (
                <Link
                  href="/admin"
                  className=" hidden lg:block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 font-semibold"
                >
                  Admin Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white px-6 py-3 rounded-xl hover:bg-gray-800/50 transition-all duration-300 border border-gray-700 hover:border-gray-600 font-semibold"
                >
                  Admin Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-6">
            Book Your Soccer Game
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Join our soccer community! Browse available games and book your
            spot. Perfect for players of all levels looking for a fun game.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-center space-x-4 text-gray-300">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Instant Booking</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-purple-400 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>All Skill Levels</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-800/50 rounded-2xl p-12 border border-gray-700/50 max-w-md mx-auto">
              <div className="text-gray-400 mb-6">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.09m2.291-4.09A9.99 9.99 0 0112 13c-2.038 0-3.9.783-5.291 2.09M12 6.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                No games available
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Check back later for new games or contact the admin to schedule
                one!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onBookingSuccess={handleBookingSuccess}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
