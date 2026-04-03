CREATE TABLE IF NOT EXISTS sms_audit_logs (
    id           VARCHAR(36)                           NOT NULL,
    timestamp    DATETIME(3)                           NOT NULL,
    event_type   VARCHAR(64)                           NOT NULL,
    actor_id     BIGINT                                NOT NULL DEFAULT 0,
    actor_role   VARCHAR(32)                           NOT NULL DEFAULT '',
    outcome      ENUM('success', 'failure', 'denied')  NOT NULL,
    service      VARCHAR(64)                           NOT NULL DEFAULT '',
    endpoint     VARCHAR(255)                          NOT NULL DEFAULT '',
    ip_address   VARCHAR(45)                           DEFAULT NULL,
    details      JSON                                  DEFAULT NULL,
    -- Generated column extracted from JSON for FULLTEXT indexing.
    -- MySQL computes and stores this automatically on every INSERT/UPDATE.
    details_text VARCHAR(1000) GENERATED ALWAYS AS (
        CAST(details AS CHAR(1000))
    ) STORED,
    error_msg    TEXT                                  DEFAULT NULL,

    PRIMARY KEY (id),

    -- Single-column indexes for individual filter queries
    INDEX idx_timestamp  (timestamp),
    INDEX idx_actor_id   (actor_id),
    INDEX idx_event_type (event_type),
    INDEX idx_outcome    (outcome),

    -- Composite indexes for multi-column filter combinations
    INDEX idx_actor_event      (actor_id, event_type),
    INDEX idx_actor_outcome    (actor_id, outcome),
    INDEX idx_actor_time       (actor_id, timestamp),
    INDEX idx_event_outcome    (event_type, outcome),
    INDEX idx_event_time       (event_type, timestamp),
    INDEX idx_outcome_time     (outcome, timestamp),
    INDEX idx_actor_event_time (actor_id, event_type, timestamp),

    -- Full-text index covering both error messages and JSON details
    FULLTEXT idx_ft_search (error_msg, details_text)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=COMPRESSED;
