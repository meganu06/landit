// Auth
export const VALID_EMAIL_DOMAIN = '@bath.ac.uk';
export const MIN_PASSWORD_LENGTH = 6;

// CV upload
export const CV_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const CV_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const CV_MIN_TEXT_LENGTH = 20;
export const CV_MAX_SKILLS = 50;

// Placement skills
export const PLACEMENT_MAX_SKILLS = 25;

// Matching score tuning
export const MATCH_SCORE_CONFIG = {
  REQ_CURVE_POWER: 0.3,
  REQ_WEIGHT: 70,
  PREF_WEIGHT: 30,
  FLOOR_BOOST: 15,
  BASE_BOOST: 10,
  LOW_CAP_MAX: 50,
} as const;

// Skill aliases (bidirectional, all lowercase)
export const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js'],
  typescript: ['ts'],
  python: ['py'],
  'node.js': ['node', 'nodejs'],
  node: ['node.js', 'nodejs'],
  react: ['reactjs', 'react.js'],
  vue: ['vue.js', 'vuejs'],
  'vue.js': ['vue', 'vuejs'],
  angular: ['angularjs', 'angular.js'],
  postgresql: ['postgres', 'psql'],
  sql: ['postgresql', 'mysql', 'sqlite', 'mssql', 'postgres'],
  'c#': ['csharp', 'dotnet', '.net'],
  '.net': ['dotnet', 'c#', 'csharp'],
  'c++': ['cpp'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  kubernetes: ['k8s'],
  aws: ['amazon web services'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure'],
  docker: ['containerisation', 'containerization'],
  nosql: ['mongodb', 'dynamodb', 'cassandra'],
  mongodb: ['nosql'],
  'ruby on rails': ['rails'],
  'next.js': ['nextjs', 'next'],
  express: ['express.js', 'expressjs'],
};

// LLM
export const LLM_MODEL = 'gpt-4o-mini';
export const LLM_CV_TEMPERATURE = 0;
export const LLM_GAP_TEMPERATURE = 0.4;
export const LLM_CV_MAX_CHARS = 12000;
export const LLM_PLACEMENT_MAX_CHARS = 8000;
export const LLM_GAP_ROLE_DESC_MAX_CHARS = 600;

// Storage
export const STORAGE_BUCKET_CVS = 'cvs';
