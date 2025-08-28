"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpRoutes = void 0;
const express_1 = require("express");
class McpRoutes {
    serverInstance; // Reference to BrainBridgeServer instance
    constructor(serverInstance) {
        this.serverInstance = serverInstance;
    }
    getRouter() {
        const router = (0, express_1.Router)();
        // Main MCP endpoint - delegate to server instance
        router.post('/mcp', async (req, res) => {
            try {
                const request = req.body;
                let response;
                switch (request.method) {
                    case 'tools/list':
                        response = this.serverInstance.getToolsList();
                        break;
                    case 'tools/call':
                        response = await this.serverInstance.handleToolCall(request.params.name, request.params.arguments);
                        break;
                    case 'resources/list':
                        response = this.serverInstance.getResourcesList();
                        break;
                    case 'resources/read':
                        response = this.serverInstance.readResource(request.params.uri);
                        break;
                    default:
                        return res.status(400).json({ error: `Unknown method: ${request.method}` });
                }
                res.json(response);
            }
            catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
        return router;
    }
}
exports.McpRoutes = McpRoutes;
