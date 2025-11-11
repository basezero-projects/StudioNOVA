-- StudioNOVA v0.01 migration: add password hashing column to users

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';


