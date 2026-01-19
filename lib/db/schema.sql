-- Agent Zero Database Schema
-- Run this in Neon SQL Editor to initialize the database

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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories(layer);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_level ON activities(level);
CREATE INDEX IF NOT EXISTS idx_gallery_items_category ON gallery_items(category);
CREATE INDEX IF NOT EXISTS idx_gallery_items_type ON gallery_items(type);
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at ON gallery_items(created_at DESC);

-- Full-text search index for memory content
CREATE INDEX IF NOT EXISTS idx_memories_content_search ON memories USING gin(to_tsvector('english', content));
