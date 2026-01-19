export type ActionItem = {
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string; // User ID
  assignedToName?: string; // User name for display
};

export type CausalAnalysisItem = {
  interceptionLayer: 'define' | 'design' | 'build' | 'test' | 'release' | 'deploy' | 'operate' | 'response';
  cause: string;
  subCause: string;
  description: string;
  actionItems?: ActionItem[];
};

export type Postmortem = {
  id: string;
  incidentId: string;
  status: string;
  
  // Business Impact
  businessImpactApplication?: string;
  businessImpactStart?: string;
  businessImpactEnd?: string;
  businessImpactDuration?: number;
  businessImpactDescription?: string;
  businessImpactAffectedCountries?: string[];
  businessImpactRegulatoryReporting?: boolean;
  businessImpactRegulatoryEntity?: string;
  
  // Mitigation
  mitigationDescription?: string;
  
  // Causal Analysis
  causalAnalysis?: CausalAnalysisItem[];
  
  // Action Items
  actionItems?: Array<{ description: string; priority: string }>;
  
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type GenerationStage = 'business_impact' | 'mitigation' | 'causal_analysis' | 'action_items' | null;

export const SWISS_CHEESE_LAYERS = [
  'define',
  'design',
  'build',
  'test',
  'release',
  'deploy',
  'operate',
  'response'
] as const;

export const FIELD_TOOLTIPS = {
  businessImpact: 'Which specific functionalities were not available for end customers/consumers and for how long?',
  mitigation: 'Description of all actions, resilience patterns or decisions that were taken to mitigate the incident.',
  swissCheese: 'The Swiss cheese model helps identify failures across different layers: define, design, build, test, release, deploy, operate, and response.',
  causalAnalysis: 'Systemic causal analysis to understand the root causes and sub-causes at each interception layer.',
};

export const GENERATION_STAGES = [
  { key: 'business_impact' as const, label: 'Business Impact' },
  { key: 'mitigation' as const, label: 'Mitigation' },
  { key: 'causal_analysis' as const, label: 'Causal Analysis' },
  { key: 'action_items' as const, label: 'Action Items' },
];
