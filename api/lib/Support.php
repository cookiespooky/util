<?php
/**
 * Общее для обоих эндпоинтов: конфиг, справочники, ответы, IP, лимит запросов.
 */

declare(strict_types=1);

/** Загружает config.php. Если его нет — работаем в «сухом» режиме на образце. */
function load_config(): array
{
    $real = __DIR__ . '/../config.php';
    $sample = __DIR__ . '/../config.sample.php';

    if (is_file($real)) {
        $config = require $real;
        $config['_configured'] = true;
        return $config;
    }

    $config = require $sample;
    $config['_configured'] = false;
    return $config;
}

/**
 * Справочники городов и услуг, собранные из frontmatter при сборке сайта.
 * Собственной копии этих списков в PHP нет намеренно — см. export-backend-data.py.
 */
function load_site_data(): array
{
    $path = __DIR__ . '/../site-data.generated.json';
    if (!is_file($path)) {
        return ['cities' => [], 'services' => []];
    }

    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return ['cities' => [], 'services' => []];
    }

    return $data + ['cities' => [], 'services' => []];
}

function city_keys(array $siteData): array
{
    return array_column($siteData['cities'], 'key');
}

function find_city(array $siteData, string $key): ?array
{
    foreach ($siteData['cities'] as $city) {
        if ($city['key'] === $key) {
            return $city;
        }
    }
    return null;
}

function find_service(array $siteData, string $key): ?array
{
    foreach ($siteData['services'] as $service) {
        if ($service['key'] === $key) {
            return $service;
        }
    }
    return null;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * IP клиента. X-Forwarded-For учитывается только если это явно разрешено
 * в конфиге: иначе любой желающий подделает адрес и обойдёт лимит запросов.
 */
function client_ip(array $config): string
{
    $trust = $config['geo']['trust_forwarded_for'] ?? false;

    if ($trust && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
        $candidate = trim($parts[0]);
        if (filter_var($candidate, FILTER_VALIDATE_IP) !== false) {
            return $candidate;
        }
    }

    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return filter_var($remote, FILTER_VALIDATE_IP) !== false ? $remote : '0.0.0.0';
}

function storage_dir(array $config): string
{
    $dir = (string) ($config['storage_dir'] ?? __DIR__ . '/../../storage');
    if (!is_dir($dir)) {
        @mkdir($dir, 0770, true);
    }
    return $dir;
}

/**
 * Простой лимит по IP на файлах: базы на площадке может не быть.
 * Возвращает true, если запрос разрешён.
 */
function rate_limit_allow(array $config, string $ip): bool
{
    $max = (int) ($config['rate_limit']['max_requests'] ?? 5);
    $window = (int) ($config['rate_limit']['window_sec'] ?? 3600);
    if ($max <= 0) {
        return true;
    }

    $dir = storage_dir($config) . '/rate';
    if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
        // Не смогли завести каталог — не блокируем приём заявок из-за этого.
        return true;
    }

    $file = $dir . '/' . sha1($ip) . '.json';
    $now = time();

    $hits = [];
    if (is_file($file)) {
        $decoded = json_decode((string) file_get_contents($file), true);
        if (is_array($decoded)) {
            $hits = $decoded;
        }
    }

    $hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - $window));

    if (count($hits) >= $max) {
        return false;
    }

    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return true;
}

/** Убирает управляющие символы и переносы — всё, что опасно в заголовках письма. */
/**
 * Отправка через локальный MTA хостинга (функция mail()).
 *
 * Второй способ доставки помимо SMTP. Нужен там, где нет почтового ящика с
 * паролем: письмо уходит с самого сервера, а SPF домена уже разрешает его
 * адрес — на виртуальном хостинге reg.ru запись включает ip4 сервера.
 *
 * Конверт помечается тем же адресом, что и заголовок From: иначе проверка
 * SPF идёт по служебному адресу хостинга и не совпадает с доменом письма.
 */
function send_via_local_mta(array $to, array $cc, string $subject, string $body, string $replyTo, array $config): void
{
    $from = (string) ($config['mail']['from'] ?? '');
    if ($from === '') {
        throw new RuntimeException('не задан mail.from');
    }
    $fromName = (string) ($config['mail']['from_name'] ?? 'Сайт');

    $encode = static fn(string $v): string => '=?UTF-8?B?' . base64_encode($v) . '?=';

    $headers = [
        'From: ' . $encode($fromName) . ' <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    if ($cc) {
        $headers[] = 'Cc: ' . implode(', ', $cc);
    }
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    $ok = @mail(
        implode(', ', $to),
        $encode($subject),
        $body,
        implode("\r\n", $headers),
        '-f' . $from
    );

    if (!$ok) {
        throw new RuntimeException('mail() вернула false');
    }
}

function clean_line(string $value, int $max = 300): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    return mb_substr($value, 0, $max);
}

/** Многострочный текст: переносы сохраняются, управляющие символы убираются. */
function clean_text(string $value, int $max = 4000): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return mb_substr(trim($value), 0, $max);
}
