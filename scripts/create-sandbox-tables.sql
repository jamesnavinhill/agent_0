-- Sandbox Projects Table
-- Stores agent-created coding projects with full versioning
CREATE TABLE IF NOT EXISTS sandbox_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    framework VARCHAR(100), -- e.g., 'next.js', 'react', 'node', 'python'
    language VARCHAR(50) DEFAULT 'typescript',
    created_by VARCHAR(100) DEFAULT 'orchestrator', -- which agent created it
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sandbox Files Table
-- Individual files within a project (supports full file system)
CREATE TABLE IF NOT EXISTS sandbox_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES sandbox_projects(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL, -- e.g., 'src/components/Button.tsx'
    content TEXT NOT NULL,
    file_type VARCHAR(50), -- e.g., 'typescript', 'css', 'json'
    size_bytes INTEGER,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100) DEFAULT 'agent',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, path, version)
);

-- Sandbox Executions Table
-- Track code execution attempts and results
CREATE TABLE IF NOT EXISTS sandbox_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES sandbox_projects(id) ON DELETE SET NULL,
    file_id UUID REFERENCES sandbox_files(id) ON DELETE SET NULL,
    execution_type VARCHAR(50) NOT NULL, -- 'run', 'test', 'lint', 'build'
    input TEXT,
    output TEXT,
    exit_code INTEGER,
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'timeout')),
    error_message TEXT,
    agent_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sandbox Dependencies Table
-- Track project dependencies
CREATE TABLE IF NOT EXISTS sandbox_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES sandbox_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    dev_dependency BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sandbox_files_project ON sandbox_files(project_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_files_path ON sandbox_files(project_id, path);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_project ON sandbox_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_projects_status ON sandbox_projects(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_projects_created_by ON sandbox_projects(created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sandbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS sandbox_projects_updated_at ON sandbox_projects;
CREATE TRIGGER sandbox_projects_updated_at
    BEFORE UPDATE ON sandbox_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_sandbox_updated_at();

DROP TRIGGER IF EXISTS sandbox_files_updated_at ON sandbox_files;
CREATE TRIGGER sandbox_files_updated_at
    BEFORE UPDATE ON sandbox_files
    FOR EACH ROW
    EXECUTE FUNCTION update_sandbox_updated_at();
