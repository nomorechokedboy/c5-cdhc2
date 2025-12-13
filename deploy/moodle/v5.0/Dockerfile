# Start from Bitnami's official Moodle image
FROM bitnamilegacy/moodle:5.0

# Switch to root to install system dependencies
USER root

# Install required build tools and dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    php-pear \
    php-dev \
    wget \
    curl \
    unzip \
    git \
    libcurl4-openssl-dev \
    libpcre3-dev \
    pkg-config \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install OpenTelemetry PHP extension via PECL
RUN pecl install opentelemetry && \
    echo "extension=opentelemetry.so" >> /opt/bitnami/php/etc/conf.d/opentelemetry.ini

# Verify extension is loaded
RUN php -m | grep opentelemetry

# Install Composer (if not already available)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install OpenTelemetry zero-code instrumentation packages
WORKDIR /opt/opentelemetry

RUN composer require \
    open-telemetry/sdk \
    open-telemetry/exporter-otlp \
    open-telemetry/opentelemetry-auto-slim \
    open-telemetry/opentelemetry-auto-psr18 \
    open-telemetry/opentelemetry-auto-pdo \
    open-telemetry/opentelemetry-auto-curl \
    guzzlehttp/guzzle \
    guzzlehttp/psr7 \
    php-http/guzzle7-adapter \
    nyholm/psr7 \
    --optimize-autoloader

# Set up auto-instrumentation via auto_prepend_file
RUN echo "auto_prepend_file=/opt/opentelemetry/vendor/autoload.php" >> /opt/bitnami/php/etc/conf.d/opentelemetry.ini

# Set OpenTelemetry environment variables
ENV OTEL_PHP_AUTOLOAD_ENABLED=true
ENV OTEL_SERVICE_NAME=moodle
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV OTEL_PROPAGATORS=baggage,tracecontext
ENV OTEL_LOGS_EXPORTER=otlp
ENV OTEL_METRICS_EXPORTER=none
ENV OTEL_RESOURCE_ATTRIBUTES=service.namespace=moodle,deployment.environment=prod
ENV OTEL_LOG_LEVEL=debug
ENV PHP_DEFAULT_MAX_INPUT_VARS=5000

# Switch back to non-root user
WORKDIR /opt/bitnami/moodle

# Run Moodle as usual
ENTRYPOINT ["/opt/bitnami/scripts/moodle/entrypoint.sh"]
CMD ["/opt/bitnami/scripts/moodle/run.sh"]

