import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { privateKeyToAccount } from "viem/accounts";
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  x402Facilitator,
  createX402Facilitator
} from "ai2wallet-sdk/facilitator";

dotenv.config();

// Configuration
const PORT = process.env.PORT || "4022";

//Validate required environment variables
if (!process.env.EVM_PRIVATE_KEY) {
  console.error("❌ EVM_PRIVATE_KEY environment variable is required");
  process.exit(1);
}

if (!process.env.SVM_PRIVATE_KEY) {
  console.error("❌ SVM_PRIVATE_KEY environment variable is required");
  process.exit(1);
}

// Initialize the EVM account from private key
const evmAccount = privateKeyToAccount(
  process.env.EVM_PRIVATE_KEY as `0x${string}`,
) as any;
console.info(`EVM Facilitator account: ${evmAccount.address}`);

// Initialize the SVM account from private key
// const svmAccount = await createKeyPairSignerFromBytes(
//   base58.decode(process.env.SVM_PRIVATE_KEY as string),
// );
// console.info(`SVM Facilitator account: ${svmAccount.address}`);


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
    let facilitator: x402Facilitator = createX402Facilitator([paymentRequirements.network], evmAccount);
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
    let facilitator: x402Facilitator = createX402Facilitator([paymentRequirements.network], evmAccount);
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
    let facilitator: x402Facilitator = createX402Facilitator(["eip155:84532", "eip155:1328", "eip155:80002"], evmAccount);
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
