-- Runs automatically on first container start (docker-entrypoint-initdb.d)

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tasks (title, description, status) VALUES
    ('Set up CI pipeline', 'Add GitHub Actions workflow to build and test on push', 'in_progress'),
    ('Containerize services', 'Write Dockerfiles for frontend and backend', 'done'),
    ('Deploy to Kubernetes', 'Apply manifests in k8s/ to a local cluster (kind/minikube)', 'pending');
