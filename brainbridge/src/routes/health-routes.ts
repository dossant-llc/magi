import { Router } from 'express';

export class HealthRoutes {
  getRouter(): Router {
    const router = Router();

    // Health check endpoint
    router.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'BrainBridge MCP Server' });
    });

    return router;
  }
}