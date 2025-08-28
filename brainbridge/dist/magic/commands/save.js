"use strict";
/**
 * mAGIc Save Command
 * Saves content to knowledge base with AI-powered categorization
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCommand = saveCommand;
const ollama_1 = require("ollama");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function saveCommand(content, options) {
    console.log('🤖 mAGIc Save: Processing your content...');
    try {
        const ollama = new ollama_1.Ollama({ host: 'http://127.0.0.1:11434' });
        // Step 1: Use local LLM to categorize and enhance the content
        const categorizationPrompt = `
You are helping organize personal knowledge. Analyze this content and provide:

1. A descriptive title (max 60 chars)
2. The best category (technical, business, personal, health, travel, etc.)  
3. 2-3 relevant tags
4. A brief summary (1-2 sentences)

Content: "${content}"

Respond in this exact JSON format:
{
  "title": "Generated title here",
  "category": "suggested category", 
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here"
}`;
        console.log('🧠 Analyzing content with local AI...');
        const response = await ollama.chat({
            model: 'llama3.1:8b',
            messages: [{ role: 'user', content: categorizationPrompt }],
            stream: false,
        });
        let aiAnalysis;
        try {
            // Extract JSON from response
            const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiAnalysis = JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('No JSON found in response');
            }
        }
        catch (e) {
            console.log('⚠️  AI categorization failed, using defaults');
            aiAnalysis = {
                title: content.slice(0, 50) + '...',
                category: options.category || 'general',
                tags: ['uncategorized'],
                summary: content.slice(0, 100) + '...'
            };
        }
        // Step 2: Create markdown content with metadata
        const timestamp = new Date().toISOString();
        const filename = `${aiAnalysis.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.md`;
        const markdownContent = `---
title: "${aiAnalysis.title}"
category: "${aiAnalysis.category}"
privacy: "${options.privacy}"
tags: [${aiAnalysis.tags.map((tag) => `"${tag}"`).join(', ')}]
created: "${timestamp}"
source: "magic-cli"
---

# ${aiAnalysis.title}

## Summary
${aiAnalysis.summary}

## Content
${content}

---
*Saved via mAGIc CLI on ${new Date().toLocaleDateString()}*
`;
        // Step 3: Save to appropriate privacy folder
        const memoriesDir = path.join(process.cwd(), 'memories', options.privacy);
        await fs.mkdir(memoriesDir, { recursive: true });
        const filePath = path.join(memoriesDir, filename);
        await fs.writeFile(filePath, markdownContent, 'utf8');
        console.log('✅ Content saved successfully!');
        console.log(`📁 Location: memories/${options.privacy}/${filename}`);
        console.log(`🏷️  Category: ${aiAnalysis.category}`);
        console.log(`🏷️  Tags: ${aiAnalysis.tags.join(', ')}`);
        console.log(`🔒 Privacy: ${options.privacy}`);
    }
    catch (error) {
        console.error('❌ Error saving content:', error);
        process.exit(1);
    }
}
