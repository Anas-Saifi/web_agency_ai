-- Initialize client_information table for Web Agency AI
CREATE TABLE IF NOT EXISTS public.client_information (
    id SERIAL PRIMARY KEY,
    name TEXT,
    company TEXT,
    budget INTEGER,
    type_of_website TEXT,
    company_about TEXT,
    website_target TEXT,
    integration TEXT,
    features_and_functionalities TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for lookup by company or name
CREATE INDEX IF NOT EXISTS idx_client_information_company ON public.client_information(company);
CREATE INDEX IF NOT EXISTS idx_client_information_name ON public.client_information(name);
