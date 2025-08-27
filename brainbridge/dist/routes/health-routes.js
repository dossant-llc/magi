"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthRoutes = void 0;
const express_1 = require("express");
class HealthRoutes {
    getRouter() {
        const router = (0, express_1.Router)();
        // Health check endpoint
        router.get('/health', (req, res) => {
            res.json({ status: 'ok', server: 'BrainBridge MCP Server' });
        });
        return router;
    }
}
exports.HealthRoutes = HealthRoutes;
