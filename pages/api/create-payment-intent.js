import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      amount = 1800,
      numberOfPlayers = 1,
      players = [],
      customerName,
      customerEmail,
      customerPhone,
    } = req.body; // Default $20.00 AUD

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Total amount for all players
      currency: "aud",
      metadata: {
        gameId: gameId,
        parkName: parkName,
        numberOfPlayers: numberOfPlayers.toString(),
        playerNames: players.map((p) => p.name).join(", "),
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: err.message });
  }
}
