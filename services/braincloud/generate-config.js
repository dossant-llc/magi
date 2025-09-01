#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Get configuration values from environment or defaults
const domain = process.env.BRAINCLOUD_DOMAIN || 'your-domain.com';
const protocol = process.env.BRAINCLOUD_PROTOCOL || 'https';
const logoPath = process.env.LOGO_PATH || '/logo.png';
const faviconPath = process.env.FAVICON_PATH || '/favicon.ico';
const legalPath = process.env.LEGAL_PATH || '/legal';
const privacyPath = process.env.PRIVACY_PATH || '/privacy';
const bpHttpPath = process.env.BRAIN_PROXY_HTTP_PATH || '/bp';

// Template for magi config
const magiConfigTemplate = {
  "schema_version": "v1",
  "name_for_model": "agiforme_brain",
  "name_for_human": "AGIfor.me Brain",
  "description_for_model": "Access user's personal AI memory bank through AGIfor.me Brain Proxy. Store and retrieve personal memories, insights, and knowledge. Requires user's unique brain key for authentication.",
  "description_for_human": "Your personal AI memory bank - store and access your memories, insights, and knowledge through AGIfor.me.",
  "auth": {
    "type": "custom_auth",
    "custom_auth_type": "api_key",
    "authorization_type": "custom",
    "verification_tokens": {
      "openai": "abc123def456"
    },
    "custom_headers": {
      "X-Brain-Key": "your-unique-brain-key-here"
    }
  },
  "api": {
    "type": "openapi",
    "url": `${protocol}://${domain}${bpHttpPath}/openapi.json`,
    "has_user_authentication": true
  },
  "logo_url": `${protocol}://${domain}${logoPath}`,
  "contact_email": "support@agiforme.ai",
  "legal_info_url": `${protocol}://${domain}${legalPath}`,
  "servers": {
    "default": `${protocol}://${domain}${bpHttpPath}/rpc/igor`
  }
};

// Template for fixed config (same structure)
const magiConfigFixedTemplate = {
  "schema_version": "v1",
  "name_for_model": "agiforme_brain_v2",
  "name_for_human": "AGIfor.me Brain v2",
  "description_for_model": "FIXED VERSION - Access user's personal AI memory bank through AGIfor.me Brain Proxy. Store and retrieve personal memories, insights, and knowledge using proper Custom GPT authentication headers.",
  "description_for_human": "Your personal AI memory bank v2 - store and access your memories, insights, and knowledge through AGIfor.me (Fixed Authentication).",
  "auth": {
    "type": "custom_auth",
    "custom_auth_type": "api_key",
    "authorization_type": "custom",
    "verification_tokens": {
      "openai": "abc123def456ghi789"
    }
  },
  "api": {
    "type": "openapi",
    "url": `${protocol}://${domain}${bpHttpPath}/openapi.json`,
    "has_user_authentication": true
  },
  "logo_url": `${protocol}://${domain}${faviconPath}`,
  "contact_email": "support@agiforme.ai",
  "legal_info_url": `${protocol}://${domain}${legalPath}`,
  "privacy_policy_url": `${protocol}://${domain}${privacyPath}`
};

// Write configuration files
try {
  // Write main config
  fs.writeFileSync(
    path.join(__dirname, 'magi-custom-gpt-config.json'),
    JSON.stringify(magiConfigTemplate, null, 2)
  );
  
  // Write fixed config
  fs.writeFileSync(
    path.join(__dirname, 'magi-custom-gpt-config-fixed.json'),
    JSON.stringify(magiConfigFixedTemplate, null, 2)
  );
  
  // Write static config (for web serving)
  fs.writeFileSync(
    path.join(__dirname, 'static', 'magi-config.json'),
    JSON.stringify(magiConfigTemplate, null, 2)
  );
  
  console.log('✅ Configuration files generated successfully');
  console.log(`   Domain: ${domain}`);
  console.log(`   Protocol: ${protocol}`);
  console.log(`   Brain Proxy: ${protocol}://${domain}${bpHttpPath}`);
  
} catch (error) {
  console.error('❌ Error generating configuration files:', error.message);
  process.exit(1);
}