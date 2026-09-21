CREATE TABLE IF NOT EXISTS sms_conduct (
    category_id BIGINT       NOT NULL,
    student_id  BIGINT       NOT NULL,
    year        INT          NOT NULL,
    semester    INT          NOT NULL,
    score       DECIMAL(3,1) NOT NULL,
    updated_by  BIGINT       NOT NULL,
    updated_at  DATETIME(3)  NOT NULL,
    PRIMARY KEY (category_id, student_id, year, semester),
    INDEX idx_class_period (category_id, year, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
