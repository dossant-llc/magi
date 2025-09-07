/**
 * mAGIc Integration Test
 * Tests the complete flow: MCP → Local LLM → Storage
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as net from 'net';

const execAsync = promisify(exec);

// Service availability checker
async function isServiceAvailable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Check if Ollama is running
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

describe('mAGIc Integration Tests', () => {
  const testMemoryDir = path.join(process.cwd(), 'memories', 'personal');
  const magicCli = 'npx ts-node src/magic/index.ts';
  let ollamaAvailable = false;
  
  beforeAll(async () => {
    // Check service availability
    ollamaAvailable = await isOllamaAvailable();
    console.log(`🔧 Ollama availability: ${ollamaAvailable ? '✅ Running' : '❌ Not available'}`);
    
    // Ensure test directory exists
    await fs.mkdir(testMemoryDir, { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testMemoryDir);
      for (const file of files) {
        if (file.includes('test-memory')) {
          await fs.unlink(path.join(testMemoryDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  test('Complete workflow: save → query → retrieve', async () => {
    // Skip if Ollama not available
    if (!ollamaAvailable) {
      console.log('⏭️  Skipping test - Ollama not available (start with `ollama serve`)');
      return;
    }
    
    const testContent = 'I learned that debugging network issues should always start with checking DNS settings first, then move to routing tables.';
    
    console.log('🧪 Testing mAGIc Integration Flow...');
    
    // Step 1: Test save command (MCP → LLM → Storage)
    console.log('  1️⃣  Testing save command...');
    try {
      const { stdout: saveOutput } = await execAsync(`${magicCli} save "${testContent}" --privacy personal`);
      console.log('     ✅ Save command executed successfully');
      
      // Verify file was created
      const files = await fs.readdir(testMemoryDir);
      const savedFile = files.find(f => f.includes('debugging') || f.includes('network'));
      
      expect(savedFile).toBeDefined();
      console.log(`     📁 File created: ${savedFile}`);
      
      // Verify content structure
      const filePath = path.join(testMemoryDir, savedFile!);
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      expect(fileContent).toContain('---'); // Has frontmatter
      expect(fileContent).toContain('title:');
      expect(fileContent).toContain('category:');
      expect(fileContent).toContain('tags:');
      expect(fileContent).toContain(testContent);
      console.log('     ✅ File structure verified');
      
    } catch (error) {
      console.error('❌ Save command failed:', error);
      throw error;
    }
    
    // Step 2: Test query command (Storage → LLM → Answer)
    console.log('  2️⃣  Testing query command...');
    try {
      const { stdout: queryOutput } = await execAsync(`${magicCli} query "How should I debug network issues?" --privacy personal`);
      
      expect(queryOutput).toContain('Answer:');
      expect(queryOutput).toContain('DNS'); // Should reference our saved content
      console.log('     ✅ Query command executed successfully');
      console.log('     🧠 AI generated answer from saved knowledge');
      
    } catch (error) {
      console.error('❌ Query command failed:', error);
      throw error;
    }
    
    // Step 3: Test status command
    console.log('  3️⃣  Testing status command...');
    try {
      const { stdout: statusOutput } = await execAsync(`${magicCli} status`);
      
      expect(statusOutput).toContain('mAGIc System Status');
      expect(statusOutput).toContain('Ollama:');
      expect(statusOutput).toContain('Memory Storage:');
      console.log('     ✅ Status command executed successfully');
      
    } catch (error) {
      console.error('❌ Status command failed:', error);
      throw error;
    }
    
    // Step 4: Test index command
    console.log('  4️⃣  Testing index command...');
    try {
      const { stdout: indexOutput } = await execAsync(`${magicCli} index`);
      
      expect(indexOutput).toContain('Index built successfully');
      
      // Verify index files were created
      const indexDir = path.join(process.cwd(), '.index');
      const indexFiles = await fs.readdir(indexDir);
      
      expect(indexFiles).toContain('metadata.json');
      expect(indexFiles).toContain('embeddings.json');
      console.log('     ✅ Index command executed successfully');
      console.log('     📊 Vector index metadata created');
      
    } catch (error) {
      console.error('❌ Index command failed:', error);
      throw error;
    }
    
    console.log('🎉 All integration tests passed!');
    console.log('   MCP → LLM → Storage flow is working correctly');
    
  }, 60000); // 60 second timeout for LLM operations
  
  test('Privacy level enforcement', async () => {
    // Skip if Ollama not available
    if (!ollamaAvailable) {
      console.log('⏭️  Skipping test - Ollama not available (start with `ollama serve`)');
      return;
    }
    
    console.log('🔒 Testing privacy level enforcement...');
    
    // Save content at different privacy levels
    const privateContent = 'This is sensitive business strategy information';
    const publicContent = 'This is public knowledge about best practices';
    
    // Save private content
    await execAsync(`${magicCli} save "${privateContent}" --privacy private`);
    
    // Save public content  
    await execAsync(`${magicCli} save "${publicContent}" --privacy public`);
    
    // Query with personal privacy limit (should not see private content)
    const { stdout: personalQuery } = await execAsync(`${magicCli} query "business strategy" --privacy personal`);
    
    expect(personalQuery).not.toContain('sensitive business strategy');
    console.log('     ✅ Private content properly excluded from personal query');
    
    // Query with private privacy limit (should see private content)
    const { stdout: privateQuery } = await execAsync(`${magicCli} query "business strategy" --privacy private`);
    
    expect(privateQuery).toContain('business strategy');
    console.log('     ✅ Private content included in private query');
    
    console.log('🔒 Privacy enforcement working correctly');
    
  }, 30000);
});

// Manual test runner (since we're not using a full test framework yet)
if (require.main === module) {
  console.log('🧪 Running mAGIc Integration Tests Manually...\n');
  
  async function runTests() {
    try {
      // Simple expect implementation
      (global as any).expect = (actual: any) => ({
        toBeDefined: () => {
          if (actual === undefined || actual === null) {
            throw new Error(`Expected value to be defined, got ${actual}`);
          }
        },
        toContain: (expected: string) => {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`);
          }
        },
        not: {
          toContain: (expected: string) => {
            if (actual.includes(expected)) {
              throw new Error(`Expected "${actual}" not to contain "${expected}"`);
            }
          }
        }
      });
      
      // Simple describe/test implementation
      (global as any).describe = (name: string, fn: () => void) => {
        console.log(`\n📋 ${name}`);
        fn();
      };
      
      (global as any).test = (name: string, fn: () => Promise<void>) => {
        return fn();
      };
      
      (global as any).beforeAll = (fn: () => Promise<void>) => {
        return fn();
      };
      
      (global as any).afterAll = (fn: () => Promise<void>) => {
        return fn();
      };
      
      // Run the tests
      const testModule = require(__filename);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  }
  
  runTests();
}