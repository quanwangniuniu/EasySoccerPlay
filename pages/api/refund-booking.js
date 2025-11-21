import Stripe from "stripe";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { app } from "../../firebase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, paymentIntentId, refundAmount, reason } = req.body;

    if (!bookingId || !paymentIntentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get the payment intent with expanded charges
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {
        expand: ["charges.data"],
      }
    );

    console.log("PaymentIntent Status:", paymentIntent.status);
    console.log("PaymentIntent Amount:", paymentIntent.amount);
    console.log("Charges Count:", paymentIntent.charges?.data?.length || 0);
    console.log("PaymentIntent ID:", paymentIntentId);

    if (
      !paymentIntent.charges ||
      !paymentIntent.charges.data ||
      !paymentIntent.charges.data[0]
    ) {
      return res.status(400).json({
        error: "No charge found for this payment",
        details: {
          paymentIntentStatus: paymentIntent.status,
          chargesCount: paymentIntent.charges?.data?.length || 0,
          paymentIntentId: paymentIntentId,
          message: `PaymentIntent has status '${paymentIntent.status}' but no charges. This usually means the payment was not completed.`,
        },
      });
    }

    const chargeId = paymentIntent.charges.data[0].id;

    // Create refund in Stripe
    const refundData = {
      charge: chargeId,
      reason: reason || "requested_by_customer",
    };

    // If refundAmount is specified, use it; otherwise refund the full amount
    if (refundAmount) {
      refundData.amount = refundAmount; // Amount in cents
    }

    const refund = await stripe.refunds.create(refundData);

    // Update booking status in Firestore
    const bookingRef = doc(db, "Bookings", bookingId);
    await updateDoc(bookingRef, {
      status: "refunded",
      refundId: refund.id,
      refundAmount: refund.amount,
      refundedAt: new Date(),
      refundReason: reason || "Admin refund",
    });

    // If this is a group booking, update all related bookings
    const groupBookingsQuery = query(
      collection(db, "Bookings"),
      where("paymentIntentId", "==", paymentIntentId)
    );
    const groupBookingsSnapshot = await getDocs(groupBookingsQuery);

    if (groupBookingsSnapshot.docs.length > 1) {
      const batch = writeBatch(db);

      groupBookingsSnapshot.docs.forEach((bookingDoc) => {
        if (bookingDoc.id !== bookingId) {
          batch.update(bookingDoc.ref, {
            status: "refunded",
            refundId: refund.id,
            refundAmount: Math.round(
              refund.amount / groupBookingsSnapshot.docs.length
            ), // Split refund amount
            refundedAt: new Date(),
            refundReason: reason || "Admin refund (group booking)",
          });
        }
      });

      await batch.commit();
    }

    // Update the game's booked count
    const bookingData = (
      await getDocs(
        query(
          collection(db, "Bookings"),
          where("paymentIntentId", "==", paymentIntentId)
        )
      )
    ).docs[0].data();

    if (bookingData.gameId) {
      const gameRef = doc(db, "Game", bookingData.gameId);
      const gameSnapshot = await getDocs(
        query(
          collection(db, "Game"),
          where("__name__", "==", bookingData.gameId)
        )
      );

      if (!gameSnapshot.empty) {
        const gameDoc = gameSnapshot.docs[0];
        const currentBookedCount = gameDoc.data()["booked-count"] || 0;
        const refundedPlayersCount = groupBookingsSnapshot.docs.length;

        await updateDoc(gameRef, {
          "booked-count": Math.max(
            0,
            currentBookedCount - refundedPlayersCount
          ),
        });
      }
    }

    res.status(200).json({
      message: "Refund processed successfully",
      refundId: refund.id,
      refundAmount: refund.amount,
      currency: refund.currency,
      status: refund.status,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      error: "Failed to process refund",
      details: error.message,
    });
  }
}
