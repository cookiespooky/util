<?php
/**
 * Приём заявки с сайта.
 *
 * Порядок намеренно такой: сначала запись на диск, потом отправка почты.
 * Если SMTP отвалится, заявка всё равно останется в журнале — иначе обращение
 * исчезает бесследно, и об этом никто не узнаёт.
 *
 * Автоответ клиенту не отправляется: единственная обратная связь — сообщение
 * на странице, и обязательная оговорка о том, что заявка не подтверждает
 * возможность приёма отхода, живёт там же, рядом с формой.
 */

declare(strict_types=1);

require __DIR__ . '/lib/Support.php';
require __DIR__ . '/lib/Smtp.php';

$config = load_config();
$siteData = load_site_data();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$allowedOrigin = (string) ($config['allowed_origin'] ?? '');
if ($allowedOrigin !== '' && !empty($_SERVER['HTTP_ORIGIN'])
    && $_SERVER['HTTP_ORIGIN'] !== $allowedOrigin) {
    json_response(['ok' => false, 'error' => 'bad_origin'], 403);
}

/* Данные приходят и формой, и JSON — второе удобнее для fetch. */
$input = $_POST;
if (!$input) {
    $raw = file_get_contents('php://input');
    $decoded = json_decode((string) $raw, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}

$field = static fn(string $name): string => isset($input[$name]) && is_scalar($input[$name])
    ? (string) $input[$name]
    : '';

/* --- Отсев роботов до всякой работы -------------------------------------- */

// Honeypot: поле скрыто от человека, заполнить его может только автомат.
if (clean_line($field('website')) !== '') {
    // Отвечаем успехом: робот не должен понять, что его отсеяли.
    json_response(['ok' => true]);
}

$startedAt = (int) $field('form_ts');
$minFill = (int) ($config['min_fill_sec'] ?? 3);
if ($startedAt > 0 && (time() - $startedAt) < $minFill) {
    json_response(['ok' => true]);
}

$ip = client_ip($config);
if (!rate_limit_allow($config, $ip)) {
    json_response(['ok' => false, 'error' => 'rate_limited'], 429);
}

/* --- Проверка полей ------------------------------------------------------ */

$errors = [];

$cityKey = clean_line($field('city'), 40);
if ($cityKey === '' || !in_array($cityKey, city_keys($siteData), true)) {
    $errors['city'] = 'Выберите город из списка';
}

$serviceKey = clean_line($field('service'), 40);
// Пустое значение допустимо: в форме есть вариант «Не знаю — подберите».
if ($serviceKey !== '' && find_service($siteData, $serviceKey) === null) {
    $errors['service'] = 'Неизвестная услуга';
}

$phone = clean_line($field('phone'), 40);
if (preg_match_all('/\d/u', $phone) < 7) {
    $errors['phone'] = 'Укажите телефон для связи';
}

$email = clean_line($field('email'), 120);
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Проверьте адрес почты';
}

$company = clean_line($field('company'), 200);
$comment = clean_text($field('comment'), 4000);

$consent = $field('privacy-consent');
if ($consent === '' || $consent === '0' || $consent === 'false') {
    $errors['privacy-consent'] = 'Нужно согласие на обработку персональных данных';
}

if ($errors) {
    json_response(['ok' => false, 'error' => 'validation', 'fields' => $errors], 422);
}

/* --- Дополнительные поля по услуге --------------------------------------- */

/* Форма подставляет свои поля для каждой услуги (v2.js, dynamicFields).
   Перечислять их здесь значило бы завести седьмую копию справочника,
   поэтому берём всё неизвестное как есть, ограничивая длину и количество. */
$known = [
    'city', 'service', 'phone', 'email', 'company', 'comment',
    'privacy-consent', 'website', 'form_ts',
];
$extra = [];
foreach ($input as $name => $value) {
    if (in_array($name, $known, true) || !is_scalar($value)) {
        continue;
    }
    if (count($extra) >= 20) {
        break;
    }
    $extra[clean_line((string) $name, 60)] = clean_line((string) $value, 500);
}

/* --- Запись в журнал ----------------------------------------------------- */

$city = find_city($siteData, $cityKey);
$service = find_service($siteData, $serviceKey);

$record = [
    'id'         => bin2hex(random_bytes(8)),
    'created_at' => date('c'),
    'ip'         => $ip,
    'user_agent' => clean_line((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 300),
    'city'       => $cityKey,
    'city_title' => $city['title'] ?? $cityKey,
    'service'    => $serviceKey,
    'service_title' => $service['title'] ?? '',
    'phone'      => $phone,
    'email'      => $email,
    'company'    => $company,
    'comment'    => $comment,
    'extra'      => $extra,
    // Отметка согласия — единственное подтверждение, что оно было получено.
    'consent'    => true,
    'sent'       => false,
];

$logFile = storage_dir($config) . '/requests.jsonl';
$written = @file_put_contents(
    $logFile,
    json_encode($record, JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

if ($written === false) {
    // Записать не смогли — принимать заявку нельзя: она потеряется молча.
    error_log('utilit: не удалось записать заявку в ' . $logFile);
    json_response(['ok' => false, 'error' => 'storage'], 500);
}

/* --- Отправка письма ----------------------------------------------------- */

if (!($config['_configured'] ?? false)) {
    // config.php ещё не создан: заявка сохранена, почта не настроена.
    error_log('utilit: заявка ' . $record['id'] . ' сохранена, но SMTP не настроен');
    json_response(['ok' => true, 'stored' => true, 'sent' => false]);
}

$recipient = (string) ($config['recipients'][$cityKey] ?? '');
if ($recipient === '') {
    // Явного получателя нет — используем публичный адрес подразделения.
    $recipient = (string) ($city['email'] ?? '');
}

$copy = (string) ($config['recipient_copy'] ?? '');

$to = $recipient !== '' ? [$recipient] : [];
$cc = ($copy !== '' && $copy !== $recipient) ? [$copy] : [];

if (!$to && !$cc) {
    error_log('utilit: для города ' . $cityKey . ' не задан получатель');
    json_response(['ok' => true, 'stored' => true, 'sent' => false]);
}

$lines = [];
$lines[] = 'Заявка с сайта';
$lines[] = '';
$lines[] = 'Город:    ' . $record['city_title'];
$lines[] = 'Телефон:  ' . $phone;
if ($email !== '') {
    $lines[] = 'Email:    ' . $email;
}
if ($company !== '') {
    $lines[] = 'Компания: ' . $company;
}
$lines[] = 'Услуга:   ' . ($record['service_title'] !== '' ? $record['service_title'] : 'не выбрана');
if ($extra) {
    $lines[] = '';
    $lines[] = 'Уточнения по услуге:';
    foreach ($extra as $name => $value) {
        $lines[] = '  ' . $name . ': ' . $value;
    }
}
if ($comment !== '') {
    $lines[] = '';
    $lines[] = 'Комментарий:';
    $lines[] = $comment;
}
$lines[] = '';
$lines[] = '---';
$lines[] = 'Отправлено: ' . date('d.m.Y H:i');
$lines[] = 'Номер заявки: ' . $record['id'];
$lines[] = 'Согласие на обработку персональных данных получено.';

$subject = sprintf('Заявка с сайта — %s, %s', $record['city_title'], $phone);

$sent = false;
$sendError = '';
try {
    $smtp = new Smtp($config['smtp'] ?? []);
    $smtp->send($to, $cc, $subject, implode("\n", $lines), $email);
    $sent = true;
} catch (Throwable $e) {
    $sendError = $e->getMessage();
    error_log('utilit: не удалось отправить заявку ' . $record['id'] . ': ' . $sendError);
}

/* Отметка об отправке дописывается отдельной строкой: перезапись журнала
   на каждой заявке дороже и опаснее при параллельных запросах. */
if ($sent) {
    @file_put_contents(
        $logFile,
        json_encode(['id' => $record['id'], 'sent_at' => date('c')], JSON_UNESCAPED_UNICODE) . "\n",
        FILE_APPEND | LOCK_EX
    );
}

/* Клиенту в любом случае отвечаем успехом: заявка принята и сохранена,
   а проблемы с почтой — наша забота, а не его. */
json_response(['ok' => true, 'stored' => true, 'sent' => $sent]);
