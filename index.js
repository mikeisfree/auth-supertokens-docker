import "dotenv/config";
import express from "express";
import cors from "cors";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import ThirdParty from "supertokens-node/recipe/thirdparty/index.js";
import { middleware, errorHandler } from "supertokens-node/framework/express/index.js";
import { verifySession } from "supertokens-node/recipe/session/framework/express/index.js";

// ─── Validate Required Env Vars ─────────────────────────────────────
const required = [
    "SUPERTOKENS_CONNECTION_URI",
    "API_DOMAIN",
    "WEBSITE_DOMAIN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((k) => console.error(`   - ${k}`));
    console.error("\nSet them in Coolify env vars or in a .env file.");
    process.exit(1);
}

// ─── SuperTokens Init ───────────────────────────────────────────────
supertokens.init({
    framework: "express",
    supertokens: {
        connectionURI: process.env.SUPERTOKENS_CONNECTION_URI,
        apiKey: process.env.SUPERTOKENS_API_KEY || undefined,
    },
    appInfo: {
        appName: "NTPOF",
        apiDomain: process.env.API_DOMAIN,
        websiteDomain: process.env.WEBSITE_DOMAIN,
        apiBasePath: "/auth",
        websiteBasePath: "/auth",
    },
    recipeList: [
        ThirdParty.init({
            signInAndUpFeature: {
                providers: [
                    {
                        config: {
                            thirdPartyId: "google",
                            clients: [
                                {
                                    clientId: process.env.GOOGLE_CLIENT_ID,
                                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                                },
                            ],
                        },
                    },
                ],
            },
        }),
        Session.init(),
    ],
});

// ─── Express App ────────────────────────────────────────────────────
const app = express();

// CORS — allow frontend to talk to this backend
app.use(
    cors({
        origin: process.env.WEBSITE_DOMAIN,
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

// SuperTokens middleware handles all /auth/* routes automatically
app.use(middleware());

// ─── Custom Routes ──────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Example: protected route — returns user info if logged in
app.get("/me", verifySession(), (req, res) => {
    const session = req.session;
    res.json({
        userId: session.getUserId(),
        sessionHandle: session.getHandle(),
    });
});

// SuperTokens error handler
app.use(errorHandler());

// ─── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Auth backend running on port ${PORT}`);
    console.log(`  API domain:     ${process.env.API_DOMAIN}`);
    console.log(`  Website domain: ${process.env.WEBSITE_DOMAIN}`);
    console.log(`  ST Core:        ${process.env.SUPERTOKENS_CONNECTION_URI}`);
});
