<?php

/**
 * Minimal S3 client using AWS Signature Version 4.
 * Compatible with AWS S3 and MinIO (path-style).
 *
 * @package    local_customgradeexport
 * @copyright  2024 CDHC2
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_customgradeexport;

defined('MOODLE_INTERNAL') || die();

class s3_client
{

    private string $endpoint;   // e.g. http://minio-service:9000
    private string $bucket;
    private string $region;
    private string $access_key;
    private string $secret_key;
    private bool   $path_style; // true for MinIO / custom endpoints

    public function __construct()
    {
        $this->endpoint   = rtrim((string) get_config('local_customgradeexport', 's3_endpoint'), '/');
        $this->bucket     = (string) get_config('local_customgradeexport', 's3_bucket');
        $this->region     = (string) get_config('local_customgradeexport', 's3_region') ?: 'us-east-1';
        $this->access_key = (string) get_config('local_customgradeexport', 's3_access_key');
        $this->secret_key = (string) get_config('local_customgradeexport', 's3_secret_key');
        $this->path_style = (bool)   get_config('local_customgradeexport', 's3_path_style');
    }

    // ── public API ─────────────────────────────────────────────────────────

    public function is_configured(): bool
    {
        return $this->endpoint   !== ''
            && $this->bucket     !== ''
            && $this->access_key !== ''
            && $this->secret_key !== '';
    }

    /**
     * Upload an object to S3.
     */
    public function put_object(string $key, string $content, string $mime_type = 'application/octet-stream'): bool
    {
        $url     = $this->object_url($key);
        $headers = $this->sign('PUT', $key, $content, $mime_type);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => $content,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->header_lines($headers),
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $code >= 200 && $code < 300;
    }

    /**
     * Download an object from S3. Returns raw bytes or false on failure.
     */
    public function get_object(string $key): string|false
    {
        $url     = $this->object_url($key);
        $headers = $this->sign('GET', $key, '');

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->header_lines($headers),
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $code === 200 ? $body : false;
    }

    /**
     * Delete an object from S3.
     */
    public function delete_object(string $key): bool
    {
        $url     = $this->object_url($key);
        $headers = $this->sign('DELETE', $key, '');

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->header_lines($headers),
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $code >= 200 && $code < 300;
    }

    // ── private helpers ────────────────────────────────────────────────────

    /**
     * Build the full URL for an object key.
     */
    private function object_url(string $key): string
    {
        if ($this->path_style) {
            return $this->endpoint . '/' . $this->bucket . '/' . ltrim($key, '/');
        }
        $parsed = parse_url($this->endpoint);
        $scheme = $parsed['scheme'] ?? 'https';
        $host   = $parsed['host']   ?? '';
        $port   = isset($parsed['port']) ? ':' . $parsed['port'] : '';
        return $scheme . '://' . $this->bucket . '.' . $host . $port . '/' . ltrim($key, '/');
    }

    /**
     * The Host header value (without scheme).
     */
    private function object_host(): string
    {
        $parsed = parse_url($this->endpoint);
        $host   = $parsed['host'] ?? '';
        $port   = isset($parsed['port']) ? ':' . $parsed['port'] : '';
        if ($this->path_style) {
            return $host . $port;
        }
        return $this->bucket . '.' . $host . $port;
    }

    /**
     * AWS Signature Version 4 signing.
     *
     * Returns an associative array of HTTP headers to include in the request.
     */
    private function sign(
        string $method,
        string $key,
        string $payload,
        string $content_type = ''
    ): array {
        $now          = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $datestamp    = $now->format('Ymd');
        $datetime     = $now->format('Ymd\THis\Z');
        $payload_hash = hash('sha256', $payload);

        // Path component in the URL (lowercase-sorted header keys required below)
        $path = $this->path_style
            ? '/' . $this->bucket . '/' . ltrim($key, '/')
            : '/' . ltrim($key, '/');

        $host = $this->object_host();

        // ── Build signing headers (lowercase, sorted) ─────────────────────
        $sign_hdrs = [
            'host'                 => $host,
            'x-amz-content-sha256' => $payload_hash,
            'x-amz-date'           => $datetime,
        ];
        if ($content_type !== '') {
            $sign_hdrs['content-type'] = $content_type;
        }
        ksort($sign_hdrs);

        $canonical_hdrs  = '';
        $signed_hdr_list = [];
        foreach ($sign_hdrs as $k => $v) {
            $canonical_hdrs    .= $k . ':' . $v . "\n";
            $signed_hdr_list[]  = $k;
        }
        $signed_hdrs = implode(';', $signed_hdr_list);

        // ── Canonical request ─────────────────────────────────────────────
        $canonical_request = implode("\n", [
            $method,
            $path,
            '', // query string
            $canonical_hdrs,
            $signed_hdrs,
            $payload_hash,
        ]);

        // ── String to sign ────────────────────────────────────────────────
        $scope          = $datestamp . '/' . $this->region . '/s3/aws4_request';
        $string_to_sign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $datetime,
            $scope,
            hash('sha256', $canonical_request),
        ]);

        // ── Signature ─────────────────────────────────────────────────────
        $signing_key = $this->derive_signing_key($datestamp);
        $signature   = hash_hmac('sha256', $string_to_sign, $signing_key);

        $authorization = sprintf(
            'AWS4-HMAC-SHA256 Credential=%s/%s,SignedHeaders=%s,Signature=%s',
            $this->access_key,
            $scope,
            $signed_hdrs,
            $signature
        );

        // ── Return proper-case HTTP headers ───────────────────────────────
        $http_hdrs = [
            'Host'                 => $host,
            'X-Amz-Content-Sha256' => $payload_hash,
            'X-Amz-Date'           => $datetime,
            'Authorization'        => $authorization,
        ];
        if ($content_type !== '') {
            $http_hdrs['Content-Type'] = $content_type;
        }

        return $http_hdrs;
    }

    private function derive_signing_key(string $datestamp): string
    {
        $k_date    = hash_hmac('sha256', $datestamp,      'AWS4' . $this->secret_key, true);
        $k_region  = hash_hmac('sha256', $this->region,   $k_date,    true);
        $k_service = hash_hmac('sha256', 's3',            $k_region,  true);
        return       hash_hmac('sha256', 'aws4_request',  $k_service, true);
    }

    /** Convert ['Key' => 'Value', ...] → ['Key: Value', ...] for curl. */
    private function header_lines(array $headers): array
    {
        $lines = [];
        foreach ($headers as $k => $v) {
            $lines[] = $k . ': ' . $v;
        }
        return $lines;
    }
}
