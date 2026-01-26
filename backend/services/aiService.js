const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

/**
 * AI Service abstraction layer
 * Supports both Anthropic Claude and Google Gemini
 *
 * Priority:
 * 1. If ANTHROPIC_API_KEY is set and not commented out -> use Anthropic
 * 2. If google-service-account-key.json file exists in project root -> use Google Gemini
 * 3. If GOOGLE_SERVICE_ACCOUNT_KEY env var is set -> use Google Gemini with service account
 * 4. Otherwise -> throw error
 */
class AIService {
  constructor() {
    this.provider = null;
    this.client = null;
    this.model = null;
    this.auth = null;
    this.serviceAccountKey = null;
    this.initPromise = null;
    this.initialize();
  }

  initialize() {
    // Check for Anthropic API key first
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '') {
      console.log('[AI Service] Initializing with Anthropic Claude');
      this.provider = 'anthropic';
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.model = 'claude-sonnet-4-5';
      this.initPromise = Promise.resolve();
      return;
    }

    // Check for Google service account JSON file in project root
    // In Docker: /app/google-service-account-key.json
    // In local dev: ../../google-service-account-key.json (from backend/services/)
    const serviceAccountPaths = [
      path.join(__dirname, '../../google-service-account-key.json'), // Local dev
      '/app/google-service-account-key.json' // Docker container
    ];
    
    const serviceAccountPath = serviceAccountPaths.find(p => fs.existsSync(p));
    if (serviceAccountPath) {
      console.log('[AI Service] Initializing with Google Gemini (Service Account File)');
      this.provider = 'google';
      this.model = 'gemini-2.5-flash'; // Latest Gemini model
      this.initPromise = this.initializeGoogleClientFromFile(serviceAccountPath);
      return;
    }

    // Check for Google service account in environment variable (fallback)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim() !== '') {
      console.log('[AI Service] Initializing with Google Gemini (Service Account from ENV)');
      this.provider = 'google';
      this.model = 'gemini-2.5-flash'; // Latest Gemini model
      this.initPromise = this.initializeGoogleClientFromEnv();
      return;
    }

    throw new Error(
      'No AI provider configured. Please set ANTHROPIC_API_KEY or place google-service-account-key.json in project root'
    );
  }

  async ensureInitialized() {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  async initializeGoogleClientFromFile(filePath) {
    try {
      // Read and parse the service account key from file
      const serviceAccountKey = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log('[AI Service] Service account loaded:', {
        project_id: serviceAccountKey.project_id,
        client_email: serviceAccountKey.client_email
      });

      this.serviceAccountKey = serviceAccountKey;
      
      // Initialize Vertex AI client with service account
      await this.initializeVertexAI(serviceAccountKey, filePath);
    } catch (error) {
      console.error('[AI Service] Failed to initialize Google client from file:', error);
      throw new Error(`Invalid google-service-account-key.json file: ${error.message}`);
    }
  }

  async initializeGoogleClientFromEnv() {
    try {
      // Parse the service account key from environment variable
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      console.log('[AI Service] Service account loaded from ENV:', {
        project_id: serviceAccountKey.project_id,
        client_email: serviceAccountKey.client_email
      });

      this.serviceAccountKey = serviceAccountKey;
      
      // Initialize Vertex AI client with service account
      await this.initializeVertexAI(serviceAccountKey);
    } catch (error) {
      console.error('[AI Service] Failed to initialize Google client from ENV:', error);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
    }
  }

  async initializeVertexAI(serviceAccountKey, keyFilePath = null) {
    try {
      // Set environment variable for Google Application Credentials if key file path is provided
      if (keyFilePath) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
      }

      // Initialize Vertex AI with project and location
      const projectId = serviceAccountKey.project_id;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'; // Default to us-central1
      
      this.client = new VertexAI({
        project: projectId,
        location: location,
      });
      
      console.log('[AI Service] Successfully initialized Vertex AI:', {
        project: projectId,
        location: location
      });
    } catch (error) {
      console.error('[AI Service] Failed to initialize Vertex AI:', error);
      throw new Error(`Vertex AI initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate a completion from the AI model
   * @param {string} prompt - The prompt to send to the AI
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<{text: string, usage: object}>}
   */
  async generateCompletion(prompt, maxTokens = 8192) {
    // Ensure initialization is complete (important for Google auth)
    await this.ensureInitialized();
    
    if (this.provider === 'anthropic') {
      return this.generateAnthropicCompletion(prompt, maxTokens);
    } else if (this.provider === 'google') {
      return this.generateGoogleCompletion(prompt, maxTokens);
    }
    throw new Error('AI provider not initialized');
  }

  async generateAnthropicCompletion(prompt, maxTokens) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      text,
      usage: {
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
      },
    };
  }

  async generateGoogleCompletion(prompt, maxTokens) {
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    });

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates[0].content.parts[0].text;

    return {
      text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }

  /**
   * Get the current provider name
   * @returns {string} 'anthropic' or 'google'
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Get the current model name
   * @returns {string}
   */
  getModel() {
    return this.model;
  }
}

// Export a singleton instance
let aiServiceInstance = null;

function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

// Reset the instance (useful for testing or when env changes)
function resetAIService() {
  aiServiceInstance = null;
}

module.exports = {
  getAIService,
  resetAIService,
  AIService,
};
