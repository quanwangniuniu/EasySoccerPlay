import {
  getFirestore,
  doc,
  runTransaction,
  collection,
  Timestamp,
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
    const {
      gameId,
      parkName,
      playerName,
      customerEmail = "",
      customerPhone = "",
    } = req.body;

    if (!gameId || !parkName || !playerName) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "gameId, parkName, and playerName are required",
      });
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      const gameRef = doc(db, "Game", gameId);
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists()) {
        throw new Error("Game not found");
      }

      const gameData = gameDoc.data();
      const currentBooked = gameData["booked-count"] || 0;
      const totalPlayersCapacity = gameData["total-players"] || 0;

      // Check if game has enough spots
      if (currentBooked + 1 > totalPlayersCapacity) {
        throw new Error(
          `Not enough spots available. ${
            totalPlayersCapacity - currentBooked
          } spots remaining.`
        );
      }

      // Update the game's booked count
      transaction.update(gameRef, {
        "booked-count": currentBooked + 1,
        "last-updated": Timestamp.now(),
      });

      // Create manual booking record
      const bookingsRef = collection(db, "Bookings");
      const bookingData = {
        gameId: gameId,
        parkName: parkName,
        playerName: playerName.trim(),
        customerName: playerName.trim(),
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
        paymentIntentId: "manual_booking",
        amount: 0, // No charge for manual bookings
        amountPerPlayer: 0,
        currency: "aud",
        status: "confirmed",
        bookedAt: Timestamp.now(),
        gameDate: gameData["game-time-start"],
        gameStartTime: gameData["game-time-start"],
        gameEndTime: gameData["game-time-end"],
        numberOfPlayersInGroup: 1,
        playerIndex: 1,
        isManualBooking: true, // Flag to identify manual bookings
      };

      transaction.set(doc(bookingsRef), bookingData);

      return {
        newBookedCount: currentBooked + 1,
        playerName: playerName.trim(),
      };
    });

    console.log(
      `✅ Manual booking created for ${result.playerName} in game ${gameId}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully added ${result.playerName} to the game`,
      newBookedCount: result.newBookedCount,
    });
  } catch (error) {
    console.error("❌ Error creating manual booking:", error);

    if (error.message.includes("Not enough spots")) {
      return res.status(400).json({
        error: "Game is full",
        details: error.message,
      });
    }

    if (error.message.includes("Game not found")) {
      return res.status(404).json({
        error: "Game not found",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to create manual booking",
      details: error.message,
    });
  }
}
