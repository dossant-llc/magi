#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
class BrainBridgeServer {
    server;
    memoriesDir = path.join(__dirname, '..', '..', '..', 'memories');
    logFile = path.join(__dirname, '..', 'logs', 'brainbridge-mcp.log');
    constructor() {
        this.server = new index_js_1.Server({
            name: 'brainbridge',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        this.logToFile('BrainBridge MCP Server initialized');
        this.setupHandlers();
    }
    logToFile(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}\n`;
        try {
            // Ensure logs directory exists
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(this.logFile, logMessage);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            this.logToFile('Received ListToolsRequest');
            return {
                tools: [
                    {
                        name: 'search_memories',
                        description: 'Search through personal memories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Optional category to search within',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'add_memory',
                        description: 'Add new knowledge to personal memories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                title: {
                                    type: 'string',
                                    description: 'Title of the knowledge entry',
                                },
                                content: {
                                    type: 'string',
                                    description: 'Content to add',
                                },
                                category: {
                                    type: 'string',
                                    description: 'Category for the knowledge',
                                },
                            },
                            required: ['title', 'content', 'category'],
                        },
                    },
                ],
            };
        });
        // List available resources
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
            this.logToFile('Received ListResourcesRequest');
            const knowledgeFiles = this.getMemoryFiles();
            return {
                resources: knowledgeFiles.map(file => ({
                    uri: `knowledge://${file}`,
                    name: file,
                    description: `Knowledge file: ${file}`,
                })),
            };
        });
        // Read resource content
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            this.logToFile(`Received ReadResourceRequest for: ${uri}`);
            if (uri.startsWith('knowledge://')) {
                const filename = uri.replace('knowledge://', '');
                const filepath = path.join(this.memoriesDir, filename);
                if (fs.existsSync(filepath)) {
                    const content = fs.readFileSync(filepath, 'utf8');
                    return {
                        contents: [
                            {
                                uri: uri,
                                mimeType: 'text/markdown',
                                text: content,
                            },
                        ],
                    };
                }
            }
            throw new Error(`Resource not found: ${uri}`);
        });
        // Handle tool calls
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            this.logToFile(`Received CallToolRequest: ${name} with args: ${JSON.stringify(args)}`);
            if (!args) {
                throw new Error('Missing arguments');
            }
            switch (name) {
                case 'search_memories':
                    return await this.searchMemories(args.query, args.category);
                case 'add_memory':
                    return await this.addMemory(args.title, args.content, args.category);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    getMemoryFiles() {
        if (!fs.existsSync(this.memoriesDir)) {
            fs.mkdirSync(this.memoriesDir, { recursive: true });
            return [];
        }
        return fs.readdirSync(this.memoriesDir)
            .filter(file => file.endsWith('.md'))
            .sort();
    }
    async searchMemories(query, category) {
        this.logToFile(`Searching memories: query="${query}", category="${category || 'any'}", memoriesDir="${this.memoriesDir}"`);
        const files = this.getMemoryFiles();
        this.logToFile(`Found ${files.length} memory files: ${files.join(', ')}`);
        const results = [];
        for (const file of files) {
            if (category && !file.toLowerCase().includes(category.toLowerCase())) {
                continue;
            }
            const filepath = path.join(this.memoriesDir, file);
            const content = fs.readFileSync(filepath, 'utf8');
            const lines = content.split('\n');
            const matches = lines.filter(line => line.toLowerCase().includes(query.toLowerCase()));
            if (matches.length > 0) {
                results.push({ file, matches });
                this.logToFile(`Found ${matches.length} matches in ${file}`);
            }
        }
        const responseText = results.length > 0
            ? `Found ${results.length} file(s) with matches:\n\n` +
                results.map(r => `**${r.file}:**\n${r.matches.map(m => `- ${m}`).join('\n')}`).join('\n\n')
            : `No matches found for "${query}"`;
        this.logToFile(`Search complete: ${results.length} files with matches`);
        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
        };
    }
    async addMemory(title, content, category) {
        const filename = `${category.toLowerCase().replace(/\s+/g, '-')}.md`;
        const filepath = path.join(this.memoriesDir, filename);
        this.logToFile(`Adding memory: title="${title}", category="${category}", filename="${filename}", filepath="${filepath}"`);
        // Check if memories directory exists
        if (!fs.existsSync(this.memoriesDir)) {
            this.logToFile(`Memories directory doesn't exist, creating: ${this.memoriesDir}`);
            fs.mkdirSync(this.memoriesDir, { recursive: true });
        }
        let fileContent = '';
        let isNewFile = false;
        if (fs.existsSync(filepath)) {
            fileContent = fs.readFileSync(filepath, 'utf8') + '\n\n';
            this.logToFile(`Appending to existing file: ${filename}`);
        }
        else {
            fileContent = `# ${category}\n\n`;
            isNewFile = true;
            this.logToFile(`Creating new file: ${filename}`);
        }
        const timestamp = new Date().toISOString().split('T')[0];
        fileContent += `## ${title}\n${content}\n\n*Added: ${timestamp}*\n`;
        try {
            fs.writeFileSync(filepath, fileContent);
            this.logToFile(`✅ Successfully ${isNewFile ? 'created' : 'updated'} memory file: ${filepath}`);
            this.logToFile(`Memory content preview: "${title}" - ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Added knowledge "${title}" to ${filename}`,
                    },
                ],
            };
        }
        catch (error) {
            this.logToFile(`❌ Failed to write memory file: ${error}`);
            throw new Error(`Failed to save memory: ${error}`);
        }
    }
    async runStdio() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        this.logToFile('BrainBridge MCP Server running on stdio');
        console.error('BrainBridge MCP Server running on stdio');
    }
    async runHTTP(port = 8147) {
        const app = (0, express_1.default)();
        this.logToFile(`Starting BrainBridge MCP Server on HTTP port ${port}`);
        app.use(express_1.default.json());
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
                return;
            }
            next();
        });
        // Create a simplified HTTP handler that mimics MCP protocol
        app.post('/mcp', async (req, res) => {
            try {
                const request = req.body;
                this.logToFile(`HTTP MCP Request: ${JSON.stringify(request)}`);
                let response;
                switch (request.method) {
                    case 'tools/list':
                        response = {
                            tools: [
                                {
                                    name: 'search_memories',
                                    description: 'Search through personal memories',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            query: {
                                                type: 'string',
                                                description: 'Search query',
                                            },
                                            category: {
                                                type: 'string',
                                                description: 'Optional category to search within',
                                            },
                                        },
                                        required: ['query'],
                                    },
                                },
                                {
                                    name: 'add_memory',
                                    description: 'Add new knowledge to personal memories',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            title: {
                                                type: 'string',
                                                description: 'Title of the knowledge entry',
                                            },
                                            content: {
                                                type: 'string',
                                                description: 'Content to add',
                                            },
                                            category: {
                                                type: 'string',
                                                description: 'Category for the knowledge',
                                            },
                                        },
                                        required: ['title', 'content', 'category'],
                                    },
                                },
                            ],
                        };
                        break;
                    case 'tools/call':
                        const { name, arguments: args } = request.params;
                        if (name === 'search_memories') {
                            response = await this.searchMemories(args.query, args.category);
                        }
                        else if (name === 'add_memory') {
                            response = await this.addMemory(args.title, args.content, args.category);
                        }
                        else {
                            return res.status(400).json({ error: `Unknown tool: ${name}` });
                        }
                        break;
                    case 'resources/list':
                        const knowledgeFiles = this.getMemoryFiles();
                        response = {
                            resources: knowledgeFiles.map(file => ({
                                uri: `knowledge://${file}`,
                                name: file,
                                description: `Knowledge file: ${file}`,
                            })),
                        };
                        break;
                    case 'resources/read':
                        const uri = request.params.uri;
                        if (uri.startsWith('knowledge://')) {
                            const filename = uri.replace('knowledge://', '');
                            const filepath = path.join(this.memoriesDir, filename);
                            if (fs.existsSync(filepath)) {
                                const content = fs.readFileSync(filepath, 'utf8');
                                response = {
                                    contents: [
                                        {
                                            uri: uri,
                                            mimeType: 'text/markdown',
                                            text: content,
                                        },
                                    ],
                                };
                            }
                            else {
                                return res.status(404).json({ error: `Resource not found: ${uri}` });
                            }
                        }
                        else {
                            return res.status(400).json({ error: `Invalid resource URI: ${uri}` });
                        }
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
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', server: 'BrainBridge MCP Server' });
        });
        app.listen(port, () => {
            console.error(`BrainBridge MCP Server running on HTTP port ${port}`);
            console.error(`API endpoint: http://localhost:${port}/mcp`);
            console.error(`Health check: http://localhost:${port}/health`);
        });
    }
    async run() {
        const args = process.argv.slice(2);
        const mode = args[0] || 'http';
        const port = parseInt(args[1]) || 8147;
        switch (mode) {
            case 'stdio':
                await this.runStdio();
                break;
            case 'http':
            default:
                await this.runHTTP(port);
                break;
        }
    }
}
const server = new BrainBridgeServer();
server.run().catch(console.error);
