import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  x402Facilitator,
  createX402Facilitator,
  createEd25519Signer
} from "ai2wallet-sdk/facilitator";

dotenv.config();

// Configuration
const PORT = process.env.PORT || "4022";

if (!process.env.STELLAR_PRIVATE_KEY) {
  console.error("❌ STELLAR_PRIVATE_KEY environment variable is required");
  process.exit(1);
}

// Initialize the Stellar account from private key
 const stellarAccount = createEd25519Signer(process.env.STELLAR_PRIVATE_KEY);
 console.info(`STELLAR Facilitator account: ${stellarAccount.address}`);

 const facilitatorSigners = { stellarAccount };

// Initialize Express app
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: '*',
    allowedHeaders: ["*"],
    exposedHeaders: ['*']
  })
);

/**
 * POST /verify
 * Verify a payment against requirements
 *
 * Note: Payment tracking and bazaar discovery are handled by lifecycle hooks
 */
app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: "Missing paymentPayload or paymentRequirements",
      });
    }
 
    let facilitator: x402Facilitator = createX402Facilitator([paymentRequirements.network], facilitatorSigners);
    // Hooks will automatically:
    // - Track verified payment (onAfterVerify)
    // - Extract and catalog discovery info (onAfterVerify)
    const response: VerifyResponse = await facilitator.verify(
      paymentPayload,
      paymentRequirements,
    );

    res.json(response);
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /settle
 * Settle a payment on-chain
 *
 * Note: Verification validation and cleanup are handled by lifecycle hooks
 */
app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: "Missing paymentPayload or paymentRequirements",
      });
    }
    let facilitator: x402Facilitator = createX402Facilitator([paymentRequirements.network], facilitatorSigners);
    // Hooks will automatically:
    // - Validate payment was verified (onBeforeSettle - will abort if not)
    // - Check verification timeout (onBeforeSettle)
    // - Clean up tracking (onAfterSettle / onSettleFailure)
    const response: SettleResponse = await facilitator.settle(
      paymentPayload as PaymentPayload,
      paymentRequirements as PaymentRequirements,
    );

    res.json(response);
  } catch (error) {
    console.error("Settle error:", error);

    // Check if this was an abort from hook
    if (
      error instanceof Error &&
      error.message.includes("Settlement aborted:")
    ) {
      // Return a proper SettleResponse instead of 500 error
      return res.json({
        success: false,
        errorReason: error.message.replace("Settlement aborted: ", ""),
        network: req.body?.paymentPayload?.network || "unknown",
      } as SettleResponse);
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /supported
 * Get supported payment kinds and extensions
 */
app.get("/supported", async (req, res) => {
  try {
    let facilitator: x402Facilitator = createX402Facilitator([
      "stellar:testnet"
    ], facilitatorSigners);
    const response = facilitator.getSupported();
    res.json(response);
  } catch (error) {
    console.error("Supported error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start the server
app.listen(parseInt(PORT), () => {
  console.log(` 🚀 Facilitator listening at http://localhost:${PORT}`);
});
