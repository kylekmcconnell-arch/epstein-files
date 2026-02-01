-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create text search configuration for better full-text search
CREATE TEXT SEARCH CONFIGURATION english_simple (COPY = english);
