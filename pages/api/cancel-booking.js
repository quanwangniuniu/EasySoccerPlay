import {
  getFirestore,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  getDoc,
  getDocs,
  collection,
  query,
  where,
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
    const { bookingId, paymentIntentId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Get the booking document first to get payment intent ID if not provided
    const bookingRef = doc(db, "Bookings", bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const bookingData = bookingDoc.data();
    const gameId = bookingData.gameId;
    const targetPaymentIntentId =
      paymentIntentId || bookingData.paymentIntentId;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID not found in booking" });
    }

    // Find all bookings with the same payment intent ID (for group bookings)
    const relatedBookingsQuery = query(
      collection(db, "Bookings"),
      where("paymentIntentId", "==", targetPaymentIntentId)
    );
    const relatedBookingsSnapshot = await getDocs(relatedBookingsQuery);
    const relatedBookings = relatedBookingsSnapshot.docs;

    if (relatedBookings.length === 0) {
      return res
        .status(404)
        .json({ error: "No bookings found for this payment" });
    }

    // Use a transaction to ensure data consistency
    await runTransaction(db, async (transaction) => {
      // Get the game document
      const gameRef = doc(db, "Game", gameId);
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists()) {
        throw new Error("Game not found");
      }

      const gameData = gameDoc.data();
      const currentBooked = gameData["booked-count"] || 0;
      const bookingsToCancel = relatedBookings.length;

      // Ensure we don't go below 0
      if (currentBooked < bookingsToCancel) {
        throw new Error(
          `Cannot cancel ${bookingsToCancel} bookings - only ${currentBooked} bookings exist`
        );
      }

      // Delete all related bookings
      relatedBookings.forEach((bookingDoc) => {
        transaction.delete(doc(db, "Bookings", bookingDoc.id));
      });

      // Decrease the game's booked count by the number of cancelled bookings
      transaction.update(gameRef, {
        "booked-count": increment(-bookingsToCancel),
      });
    });

    res.status(200).json({
      success: true,
      message:
        relatedBookings.length > 1
          ? `Group booking cancelled successfully - ${relatedBookings.length} players removed`
          : "Booking cancelled successfully",
      deletedBookingsCount: relatedBookings.length,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      error: "Failed to cancel booking",
      details: error.message,
    });
  }
}
