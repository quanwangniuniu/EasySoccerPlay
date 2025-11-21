import Stripe from "stripe";
import { buffer } from "micro";
import {
  getFirestore,
  doc,
  runTransaction,
  collection,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/firebase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore(app);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("🔥 WEBHOOK CALLED - Method:", req.method);
  console.log("🔥 WEBHOOK HEADERS:", req.headers);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("🔥 WEBHOOK SECRET EXISTS:", !!webhookSecret);
  console.log("🔥 SIGNATURE EXISTS:", !!sig);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log("🔥 WEBHOOK EVENT CONSTRUCTED:", event.type);
  } catch (err) {
    console.error(`🔥 Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      console.log("🔥 PROCESSING PAYMENT SUCCESS");
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      console.log("🔥 Payment failed:", failedPayment.id);
      break;

    default:
      console.log(`🔥 Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

async function handleSuccessfulPayment(paymentIntent) {
  try {
    console.log("🔥 HANDLING SUCCESSFUL PAYMENT");
    console.log("🔥 Payment Intent ID:", paymentIntent.id);
    console.log("🔥 Payment Intent Metadata:", paymentIntent.metadata);

    // Validate currency is AUD
    if (paymentIntent.currency !== "aud") {
      console.error(
        `🔥 Invalid currency: ${paymentIntent.currency}. Expected: aud`
      );
      return;
    }

    const gameId = paymentIntent.metadata.gameId;
    const parkName = paymentIntent.metadata.parkName;
    const customerEmail = paymentIntent.metadata.customerEmail;
    const customerName = paymentIntent.metadata.customerName;
    const customerPhone = paymentIntent.metadata.customerPhone;
    const numberOfPlayers =
      parseInt(paymentIntent.metadata.numberOfPlayers) || 1;
    const playerNames = paymentIntent.metadata.playerNames
      ? paymentIntent.metadata.playerNames.split(", ")
      : [customerName];

    console.log("🔥 EXTRACTED DATA:");
    console.log("🔥 Game ID:", gameId);
    console.log("🔥 Park Name:", parkName);
    console.log("🔥 Number of Players:", numberOfPlayers);
    console.log("🔥 Player Names:", playerNames);

    if (!gameId) {
      console.error("🔥 No gameId found in payment intent metadata");
      return;
    }

    // Use a transaction to ensure data consistency
    console.log("🔥 STARTING FIREBASE TRANSACTION");
    await runTransaction(db, async (transaction) => {
      console.log("🔥 INSIDE TRANSACTION - Getting game document");
      const gameRef = doc(db, "Game", gameId);
      const gameDoc = await transaction.get(gameRef);

      if (!gameDoc.exists()) {
        console.error("🔥 GAME NOT FOUND:", gameId);
        throw new Error("Game not found");
      }

      const gameData = gameDoc.data();
      const currentBooked = gameData["booked-count"] || 0;
      const totalPlayersCapacity = gameData["total-players"] || 0;

      console.log("🔥 GAME DATA:");
      console.log("🔥 Current Booked:", currentBooked);
      console.log("🔥 Total Capacity:", totalPlayersCapacity);

      // Check if game has enough spots for all players
      if (currentBooked + numberOfPlayers > totalPlayersCapacity) {
        console.error("🔥 NOT ENOUGH SPOTS AVAILABLE");
        throw new Error(
          `Not enough spots available. ${
            totalPlayersCapacity - currentBooked
          } spots remaining.`
        );
      }

      // Update the game's booked count by the number of players
      console.log("🔥 UPDATING GAME BOOKED COUNT");
      transaction.update(gameRef, {
        "booked-count": currentBooked + numberOfPlayers,
        "last-updated": Timestamp.now(),
      });

      // Create booking records for each player
      console.log("🔥 CREATING BOOKING RECORDS");
      const bookingsRef = collection(db, "Bookings");

      playerNames.forEach((playerName, index) => {
        const bookingData = {
          gameId: gameId,
          parkName: parkName,
          playerName: playerName || `Player ${index + 1}`,
          customerName: customerName || "Anonymous",
          customerEmail: customerEmail || "",
          customerPhone: customerPhone || "",
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          amountPerPlayer: Math.round(paymentIntent.amount / numberOfPlayers),
          currency: paymentIntent.currency,
          status: "confirmed",
          bookedAt: Timestamp.now(),
          gameDate: gameData["game-time-start"],
          gameStartTime: gameData["game-time-start"],
          gameEndTime: gameData["game-time-end"],
          numberOfPlayersInGroup: numberOfPlayers,
          playerIndex: index + 1,
        };

        console.log(`🔥 CREATING BOOKING ${index + 1}:`, bookingData);
        transaction.set(doc(bookingsRef), bookingData);
      });
    });
    console.log("🔥 TRANSACTION COMPLETED SUCCESSFULLY");

    console.log(
      `🔥 Successfully processed booking for ${numberOfPlayers} player(s) in game ${gameId}, payment ${paymentIntent.id}`
    );
  } catch (error) {
    console.error("🔥 ERROR PROCESSING SUCCESSFUL PAYMENT:", error);
    console.error("🔥 ERROR STACK:", error.stack);
    // In a production app, you might want to send this to a monitoring service
  }
}
