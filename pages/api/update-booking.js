import {
  getFirestore,
  doc,
  updateDoc,
  increment,
  getDoc,
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

    // First check if the game exists and has available spots
    const gameRef = doc(db, "Game", gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      return res.status(404).json({ error: "Game not found" });
    }

    const gameData = gameSnap.data();
    const currentBooked = gameData["booked-count"] || 0;
    const totalPlayers = gameData["total-players"] || 0;

    if (currentBooked >= totalPlayers) {
      return res.status(400).json({ error: "Game is fully booked" });
    }

    // Update the booking count
    await updateDoc(gameRef, {
      "booked-count": increment(1),
    });

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      newBookedCount: currentBooked + 1,
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
}
