#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query, hidden = false) {
  return new Promise(resolve => {
    if (hidden) {
      // Hide password input
      const stdin = process.stdin;
      stdin.setRawMode(true);
      readline.emitKeypressEvents(stdin);
      
      let password = '';
      console.log(query);
      
      stdin.on('keypress', function listener(char, key) {
        if (key && key.name === 'return') {
          stdin.setRawMode(false);
          stdin.removeListener('keypress', listener);
          process.stdout.write('\n');
          resolve(password);
        } else if (key && key.name === 'backspace') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (char) {
          password += char;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(query, resolve);
    }
  });
}


function decrypt(encryptedText, password) {
  try {
    // Format: enc:iv:encrypted
    const parts = encryptedText.split(':');
    if (parts.length !== 3 || parts[0] !== 'enc') {
      return encryptedText; // Not encrypted, return as is
    }
    
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed. Please check your password.`);
  }
}

async function setup() {
  console.log('\n🚀 SRE Platform Setup\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if .env already exists
  if (fs.existsSync('.env')) {
    console.log('ℹ️  .env file already exists.');
    const overwrite = await question('   Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Keeping existing .env file\n');
      rl.close();
      return;
    }
  }

  // Read .env.example
  const envExample = fs.readFileSync('.env.example', 'utf8');

  // Check if there are encrypted values
  const hasEncrypted = envExample.includes('enc:');
  let decryptPassword = null;
  
  if (hasEncrypted) {
    console.log('🔐 Decryption Password\n');
    console.log('   Enter password to decrypt ServiceNow instance credentials:\n');
    decryptPassword = await question('   Password: ', true);
    console.log('');
  }

  // Ask for Calendar API key
  console.log('\n📅 Calendar Feature — API Key\n');
  console.log('   This key secures the Calendar write endpoints and the Azure DevOps');
  console.log('   freeze-check integration. A random key will be generated if you skip.\n');
  const calendarApiKeyInput = await question('   Calendar API key (press Enter to auto-generate): ');
  const calendarApiKey = calendarApiKeyInput.trim()
    ? calendarApiKeyInput.trim()
    : crypto.randomBytes(32).toString('hex');

  // Ask for Anthropic API key
  console.log('\n📝 AI Configuration\n');
  const apiKey = await question('   Anthropic API key (press Enter to skip): ');

  // Process the env content
  let envContent = envExample;
  
  // Decrypt encrypted values if password provided
  if (hasEncrypted && decryptPassword) {
    try {
      const lines = envContent.split('\n');
      const decryptedLines = lines.map(line => {
        // Match lines like KEY=enc:iv:encrypted
        const match = line.match(/^([^=]+)=(enc:[^#]+)/);
        if (match) {
          const key = match[1];
          const encryptedValue = match[2].trim();
          try {
            const decryptedValue = decrypt(encryptedValue, decryptPassword);
            return `${key}=${decryptedValue}`;
          } catch (error) {
            // Silent fail - keep encrypted value
            return line;
          }
        }
        return line;
      });
      envContent = decryptedLines.join('\n');
      console.log('   ✅ ServiceNow credentials decrypted\n');
    } catch (error) {
      console.log(`   ⚠️  Decryption failed\n`);
    }
  }
  
  // Replace Calendar API key placeholders in both backend and frontend vars
  envContent = envContent.replace(
    /^CALENDAR_API_KEY=.*/m,
    `CALENDAR_API_KEY=${calendarApiKey}`
  );
  envContent = envContent.replace(
    /^NEXT_PUBLIC_CALENDAR_API_KEY=.*/m,
    `NEXT_PUBLIC_CALENDAR_API_KEY=${calendarApiKey}`
  );
  if (calendarApiKeyInput.trim()) {
    console.log('   ✅ Calendar API key configured\n');
  } else {
    console.log(`   ✅ Calendar API key auto-generated\n`);
    console.log('   ┌─────────────────────────────────────────────────────────────┐');
    console.log(`   │  CALENDAR_API_KEY = ${calendarApiKey.substring(0, 40)}...`);
    console.log('   │');
    console.log('   │  Copy this value into your Azure DevOps pipeline variable:');
    console.log('   │    WATCHTOWER_API_KEY = <above value>  (mark as secret)');
    console.log('   └─────────────────────────────────────────────────────────────┘\n');
  }

  // Replace the placeholder with the actual key or comment it out
  if (apiKey && apiKey.trim()) {
    envContent = envContent.replace(
      'ANTHROPIC_API_KEY=your_anthropic_api_key_here',
      `ANTHROPIC_API_KEY=${apiKey.trim()}`
    );
    envContent = envContent.replace(
      '#ANTHROPIC_API_KEY=your_anthropic_api_key_here',
      `ANTHROPIC_API_KEY=${apiKey.trim()}`
    );
    console.log('   ✅ Anthropic API key configured\n');
  } else {
    // Comment out the placeholder to prevent it from being used
    envContent = envContent.replace(
      'ANTHROPIC_API_KEY=your_anthropic_api_key_here',
      '#ANTHROPIC_API_KEY=your_anthropic_api_key_here'
    );
    console.log('   ⏭️  Skipped\n');
  }

  // Ask for Google service account JSON
  console.log('🔑 Google Cloud Service Account\n');
  
  const useServiceAccount = await question('   Configure Google service account? (y/N): ');
  
  if (useServiceAccount.toLowerCase() === 'y') {
    const serviceAccountPath = 'google-service-account-key.json';
    const backendServiceAccountPath = 'backend/google-service-account-key.json';
    
    // Step 1: Clean up any existing files/directories
    if (fs.existsSync(serviceAccountPath)) {
      const stats = fs.statSync(serviceAccountPath);
      if (stats.isDirectory()) {
        fs.rmdirSync(serviceAccountPath, { recursive: true });
      } else {
        fs.unlinkSync(serviceAccountPath);
      }
    }
    
    if (fs.existsSync(backendServiceAccountPath)) {
      const stats = fs.statSync(backendServiceAccountPath);
      if (stats.isDirectory()) {
        fs.rmdirSync(backendServiceAccountPath, { recursive: true });
      } else {
        fs.unlinkSync(backendServiceAccountPath);
      }
    }
    
    // Step 2: Create empty file
    fs.writeFileSync(serviceAccountPath, '');
    console.log('\n   📁 File created: google-service-account-key.json');
    console.log('   📋 Open the file, paste your Google service account JSON, and save it');
    console.log('   ⏸️  Press Enter when ready...\n');
    
    // Step 3: Wait for user to paste content
    await question('');
    
    // Step 4: Validate the file
    try {
      const content = fs.readFileSync(serviceAccountPath, 'utf8');
      
      if (!content || content.trim() === '') {
        throw new Error('File is empty');
      }
      
      const parsed = JSON.parse(content);
      
      if (!parsed.type || !parsed.project_id || !parsed.private_key) {
        throw new Error('Missing required fields');
      }
      
      // Reformat the JSON nicely
      fs.writeFileSync(serviceAccountPath, JSON.stringify(parsed, null, 2));
      
      console.log(`   ✅ Google service account configured (${parsed.project_id})\n`);
      
      // Comment out ANTHROPIC_API_KEY in .env if it exists
      if (fs.existsSync('.env')) {
        let envFileContent = fs.readFileSync('.env', 'utf8');
        const originalContent = envFileContent;
        
        // Comment out any uncommented ANTHROPIC_API_KEY lines
        envFileContent = envFileContent.replace(
          /^ANTHROPIC_API_KEY=/gm,
          '#ANTHROPIC_API_KEY='
        );
        
        if (envFileContent !== originalContent) {
          fs.writeFileSync('.env', envFileContent);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Invalid JSON: ${error.message}`);
      console.log('   ⚠️  Fix google-service-account-key.json before starting Docker\n');
    }
  } else {
    console.log('   ⏭️  Skipped\n');
    
    // Clean up any existing directories that might block Docker
    const serviceAccountPath = 'google-service-account-key.json';
    const backendServiceAccountPath = 'backend/google-service-account-key.json';
    
    if (fs.existsSync(serviceAccountPath)) {
      const stats = fs.statSync(serviceAccountPath);
      if (stats.isDirectory()) {
        fs.rmdirSync(serviceAccountPath, { recursive: true });
      }
    }
    
    if (fs.existsSync(backendServiceAccountPath)) {
      const stats = fs.statSync(backendServiceAccountPath);
      if (stats.isDirectory()) {
        fs.rmdirSync(backendServiceAccountPath, { recursive: true });
      }
    }
  }

  // Write root .env file
  fs.writeFileSync('.env', envContent);

  // Write CALENDAR_API_KEY into backend/.env so the Express server picks it up
  // when running locally (outside Docker). Docker gets it via docker-compose environment block.
  const backendEnvPath = 'backend/.env';
  let backendEnvContent = '';
  if (fs.existsSync(backendEnvPath)) {
    backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
  } else if (fs.existsSync('backend/.env.example')) {
    backendEnvContent = fs.readFileSync('backend/.env.example', 'utf8');
  }

  if (backendEnvContent.match(/^CALENDAR_API_KEY=/m)) {
    // Replace existing value
    backendEnvContent = backendEnvContent.replace(
      /^CALENDAR_API_KEY=.*/m,
      `CALENDAR_API_KEY=${calendarApiKey}`
    );
  } else {
    // Append it
    backendEnvContent += `\nCALENDAR_API_KEY=${calendarApiKey}\n`;
  }
  fs.writeFileSync(backendEnvPath, backendEnvContent);

  console.log('✅ Setup complete!\n');
  
  rl.close();
}

setup().catch(error => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
