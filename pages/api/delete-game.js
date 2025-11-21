import {
  getFirestore,
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  try {
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      // First, check if the game exists
      const gameRef = doc(db, "Game", gameId);
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists()) {
        throw new Error("Game not found");
      }

      // Get all bookings for this game (outside transaction since we need to query)
      const bookingsQuery = query(
        collection(db, "Bookings"),
        where("gameId", "==", gameId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      // Delete the game within the transaction
      transaction.delete(gameRef);

      return {
        gameData: gameDoc.data(),
        bookingsToDelete: bookingsSnapshot.docs,
      };
    });

    // Delete associated bookings after the main transaction
    // (Firestore transactions have limitations with queries)
    const bookingDeletionPromises = result.bookingsToDelete.map((bookingDoc) =>
      deleteDoc(doc(db, "Bookings", bookingDoc.id))
    );

    await Promise.all(bookingDeletionPromises);

    const deletedBookingsCount = result.bookingsToDelete.length;

    res.status(200).json({
      success: true,
      message: `Game deleted successfully${
        deletedBookingsCount > 0
          ? ` along with ${deletedBookingsCount} booking(s)`
          : ""
      }`,
      deletedBookingsCount,
      gameData: result.gameData,
    });
  } catch (error) {
    console.error("Error deleting game:", error);
    res.status(500).json({
      error: "Failed to delete game",
      details: error.message,
    });
  }
}
