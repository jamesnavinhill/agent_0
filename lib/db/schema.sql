-- Agent Zero Database Schema
-- Run this in Neon SQL Editor to initialize the database

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memories table for agent memory system
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer VARCHAR(20) NOT NULL CHECK (layer IN ('shortTerm', 'longTerm', 'episodic', 'semantic')),
  content TEXT NOT NULL,
  source VARCHAR(255),
  relevance REAL DEFAULT 0.5,
  tags TEXT[], -- PostgreSQL array for tags
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table for agent activity stream
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'complete' CHECK (status IN ('pending', 'running', 'complete', 'error')),
  level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('debug', 'info', 'action', 'thought', 'error')),
  source VARCHAR(255),
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery items table for generated content
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'code', 'text', 'audio', 'video')),
  blob_url TEXT NOT NULL,
  title VARCHAR(255),
  prompt TEXT,
  category VARCHAR(50) DEFAULT 'art',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table for scheduler
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule VARCHAR(100) NOT NULL, -- Cron expression
  enabled BOOLEAN DEFAULT true,
  category VARCHAR(50),
  prompt TEXT,
  parameters JSONB,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  last_status VARCHAR(20) CHECK (last_status IN ('pending', 'running', 'complete', 'error')),
  last_result TEXT,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table for high-level objectives
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  subtasks JSONB DEFAULT '[]'::jsonb, -- Array of strings/objects
  deadline TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Bank for research and sources
CREATE TABLE IF NOT EXISTS knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  url VARCHAR(2048),
  summary TEXT,
  content TEXT, -- Full content if scraped
  embedding VECTOR(768), -- For semantic search (optional if using pgvector)
  tags TEXT[],
  source VARCHAR(50) DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories(layer);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_level ON activities(level);
CREATE INDEX IF NOT EXISTS idx_gallery_items_category ON gallery_items(category);
CREATE INDEX IF NOT EXISTS idx_gallery_items_type ON gallery_items(type);
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at ON gallery_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);

-- Full-text search index for memory content
CREATE INDEX IF NOT EXISTS idx_memories_content_search ON memories USING gin(to_tsvector('english', content));
