-- Infra-Desk — PostgreSQL schema
-- Run against a fresh database to recreate all tables, indexes, and constraints.
-- Compatible with PostgreSQL 14+.

CREATE TABLE public.clients (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    city       TEXT,
    contact    TEXT,
    notes      TEXT,
    document_type TEXT,
    document   TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.equipment (
    id                       SERIAL PRIMARY KEY,
    client_id                INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type                     TEXT NOT NULL,
    brand                    TEXT,
    model                    TEXT,
    serial                   TEXT,
    ip_address               TEXT,
    mac_address              TEXT,
    user_account             TEXT,
    responsible              TEXT,
    status                   TEXT DEFAULT 'ativo',
    location                 TEXT,
    remote_access            TEXT,
    remote_access_password   TEXT,  -- stored AES-256-GCM encrypted (iv:authTag:ciphertext hex)
    notes                    TEXT,
    monitoring_token         TEXT UNIQUE,
    maintenance_interval_days INTEGER,
    last_maintenance_date    DATE,
    created_at               TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.equipment_configs (
    id           SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    config_type  TEXT NOT NULL,
    config_key   TEXT NOT NULL,
    config_value TEXT,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (equipment_id, config_type, config_key)
);

CREATE TABLE public.equipment_drivers (
    id             SERIAL PRIMARY KEY,
    equipment_id   INTEGER NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    driver_name    TEXT NOT NULL,
    driver_version TEXT,
    driver_url     TEXT,
    notes          TEXT,
    installed_date TIMESTAMP WITHOUT TIME ZONE,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.machine_metrics (
    id               SERIAL PRIMARY KEY,
    equipment_id     INTEGER NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    reported_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_online        BOOLEAN DEFAULT TRUE,
    disk_usage_json  TEXT,
    ram_total_gb     NUMERIC,
    ram_used_gb      NUMERIC,
    cpu_percent      NUMERIC,
    uptime_hours     NUMERIC,
    os_version       TEXT,
    hostname         TEXT,
    ip_local         TEXT,
    ip_public        TEXT,
    gateway          TEXT,
    wifi_ssid        TEXT,
    battery_percent  NUMERIC,
    battery_plugged  BOOLEAN,
    pending_reboot   BOOLEAN,
    last_user        TEXT,
    event_log_errors INTEGER,
    antivirus_name   TEXT,
    antivirus_enabled BOOLEAN,
    smart_status     TEXT
);

CREATE TABLE public.tickets (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER REFERENCES public.clients(id),
    equipment_id INTEGER REFERENCES public.equipment(id),
    date         TEXT NOT NULL,
    problem      TEXT NOT NULL,
    solution     TEXT,
    status       TEXT NOT NULL DEFAULT 'aberto',
    time_spent   TEXT,
    technician   TEXT,
    tags         TEXT,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.audit_log (
    id          SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id   INTEGER NOT NULL,
    action      TEXT NOT NULL,
    changed_by  TEXT NOT NULL DEFAULT 'Sistema',
    changes     JSONB,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.ticket_comments (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'tecnico', -- 'admin' | 'tecnico'
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_equipment_client    ON public.equipment        USING btree (client_id);
CREATE INDEX idx_equipment_status    ON public.equipment        USING btree (status);
CREATE INDEX idx_equipment_type      ON public.equipment        USING btree (type);
CREATE INDEX idx_equipment_configs   ON public.equipment_configs USING btree (equipment_id);
CREATE INDEX idx_equipment_drivers   ON public.equipment_drivers USING btree (equipment_id);
CREATE INDEX idx_machine_metrics_equipment ON public.machine_metrics USING btree (equipment_id);
CREATE INDEX idx_machine_metrics_reported  ON public.machine_metrics USING btree (reported_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments USING btree (ticket_id);
CREATE INDEX idx_tickets_client      ON public.tickets          USING btree (client_id);
CREATE INDEX idx_tickets_status      ON public.tickets          USING btree (status);
CREATE INDEX idx_tickets_date        ON public.tickets          USING btree (date);
