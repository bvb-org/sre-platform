const express = require('express');
const router = express.Router({ mergeParams: true });
const { getKnowledgeGraphService } = require('../services/knowledgeGraphService');

/**
 * GET /api/incidents/:id/recommendations
 * Get AI-powered recommendations based on similar past incidents
 */
router.get('/', async (req, res) => {
  try {
    const incidentId = req.params.id;
    const forceRefresh = req.query.refresh === 'true';

    console.log('[Knowledge Graph API] Getting recommendations for incident:', incidentId, 'forceRefresh:', forceRefresh);

    const knowledgeGraphService = getKnowledgeGraphService();
    
    if (!knowledgeGraphService.isAvailable()) {
      return res.json({
        available: false,
        message: 'Knowledge graph service is not available. Please configure GCP credentials.',
        recommendations: [],
      });
    }

    const result = await knowledgeGraphService.getIncidentRecommendations(incidentId, forceRefresh);

    res.json(result);
  } catch (error) {
    console.error('[Knowledge Graph API] Error getting recommendations:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      details: error.message,
      available: true,
      recommendations: [],
    });
  }
});

/**
 * POST /api/incidents/:id/recommendations/refresh
 * Force refresh recommendations for an incident
 */
router.post('/refresh', async (req, res) => {
  try {
    const incidentId = req.params.id;

    console.log('[Knowledge Graph API] Force refreshing recommendations for incident:', incidentId);

    const knowledgeGraphService = getKnowledgeGraphService();
    
    if (!knowledgeGraphService.isAvailable()) {
      return res.json({
        available: false,
        message: 'Knowledge graph service is not available.',
        recommendations: [],
      });
    }

    const result = await knowledgeGraphService.getIncidentRecommendations(incidentId, true);

    res.json({
      ...result,
      refreshed: true,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Knowledge Graph API] Error refreshing recommendations:', error);
    res.status(500).json({
      error: 'Failed to refresh recommendations',
      details: error.message,
    });
  }
});

/**
 * GET /api/knowledge-graph/status
 * Check if knowledge graph service is available
 */
router.get('/status', async (req, res) => {
  try {
    const knowledgeGraphService = getKnowledgeGraphService();
    const available = knowledgeGraphService.isAvailable();

    res.json({
      available,
      service: 'Vertex AI Knowledge Graph',
      features: {
        embeddings: available,
        vectorSearch: available,
        recommendations: available,
      },
    });
  } catch (error) {
    console.error('[Knowledge Graph API] Error checking status:', error);
    res.status(500).json({
      error: 'Failed to check service status',
      details: error.message,
    });
  }
});

module.exports = router;
