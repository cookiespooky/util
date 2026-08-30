<?php
/**
 * Минимальный SMTP-клиент с авторизацией.
 *
 * Написан вручную, а не взят из PHPMailer, по одной причине: площадка пока
 * не выбрана, и на дешёвом shared-хостинге может не быть composer. Здесь нет
 * внешних зависимостей — только сокеты и openssl, который есть везде.
 *
 * Поддерживает SSL сразу (порт 465) и STARTTLS (порт 587), AUTH LOGIN,
 * заголовки и тело в UTF-8.
 *
 * Функция mail() не используется намеренно: она отправляет письмо от имени
 * сервера, у которого нет отношения к домену отправителя, и такое письмо
 * почти всегда попадает в спам.
 */

declare(strict_types=1);

final class SmtpException extends RuntimeException
{
}

final class Smtp
{
    /** @var resource|null */
    private $socket = null;

    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config + [
            'host'       => '',
            'port'       => 465,
            'encryption' => 'ssl',
            'username'   => '',
            'password'   => '',
            'from'       => '',
            'from_name'  => '',
            'timeout'    => 15,
        ];
    }

    /**
     * @param string[] $to  Основные получатели
     * @param string[] $cc  Копия
     */
    public function send(array $to, array $cc, string $subject, string $body, string $replyTo = ''): void
    {
        if ($this->config['host'] === '' || $this->config['from'] === '') {
            throw new SmtpException('SMTP не настроен: заполните config.php');
        }

        $recipients = array_values(array_unique(array_merge($to, $cc)));
        if (!$recipients) {
            throw new SmtpException('Не указан ни один получатель');
        }

        $this->connect();

        try {
            $this->command('MAIL FROM:<' . $this->config['from'] . '>', 250);
            foreach ($recipients as $address) {
                $this->command('RCPT TO:<' . $address . '>', 250);
            }
            $this->command('DATA', 354);
            $this->write($this->buildMessage($to, $cc, $subject, $body, $replyTo) . "\r\n.\r\n");
            $this->expect(250);
            $this->command('QUIT', 221);
        } finally {
            $this->close();
        }
    }

    private function connect(): void
    {
        $host = $this->config['host'];
        $transport = $this->config['encryption'] === 'ssl' ? 'ssl://' . $host : $host;

        $errno = 0;
        $error = '';
        $socket = @stream_socket_client(
            $transport . ':' . $this->config['port'],
            $errno,
            $error,
            (float) $this->config['timeout']
        );

        if ($socket === false) {
            throw new SmtpException(sprintf('Не удалось подключиться к %s: %s', $host, $error ?: 'нет ответа'));
        }

        $this->socket = $socket;
        stream_set_timeout($this->socket, (int) $this->config['timeout']);

        $this->expect(220);
        $this->command('EHLO ' . $this->heloName(), 250);

        if ($this->config['encryption'] === 'tls') {
            $this->command('STARTTLS', 220);
            $ok = @stream_socket_enable_crypto(
                $this->socket,
                true,
                STREAM_CRYPTO_METHOD_TLS_CLIENT
            );
            if ($ok !== true) {
                throw new SmtpException('Не удалось включить TLS');
            }
            // После STARTTLS приветствие повторяется по протоколу.
            $this->command('EHLO ' . $this->heloName(), 250);
        }

        /* Авторизация только по защищённому каналу. Способ доставки задаётся
           строкой в config.php, и любое значение кроме 'ssl' и 'tls' даёт
           открытое соединение — в которое AUTH LOGIN отправил бы логин и
           пароль ящика простым base64. Опечатка в конфиге не должна тихо
           превращаться в утечку пароля, поэтому лучше не отправить письмо. */
        if ($this->config['username'] !== ''
            && !in_array($this->config['encryption'], ['ssl', 'tls'], true)) {
            throw new SmtpException(
                'Отказ авторизоваться по незашифрованному каналу: '
                . "encryption должно быть 'ssl' или 'tls', сейчас "
                . var_export($this->config['encryption'], true)
            );
        }

        if ($this->config['username'] !== '') {
            $this->command('AUTH LOGIN', 334);
            $this->command(base64_encode($this->config['username']), 334);
            $this->command(base64_encode($this->config['password']), 235);
        }
    }

    private function heloName(): string
    {
        $host = $_SERVER['SERVER_NAME'] ?? 'localhost';
        // В HELO допустим только домен; пустое или странное значение почтовые
        // серверы отвергают.
        return preg_match('/^[A-Za-z0-9.\-]+$/', $host) === 1 ? $host : 'localhost';
    }

    private function buildMessage(array $to, array $cc, string $subject, string $body, string $replyTo): string
    {
        $headers = [];
        $headers[] = 'Date: ' . date('r');
        $headers[] = 'From: ' . $this->encodeAddress($this->config['from_name'], $this->config['from']);
        $headers[] = 'To: ' . implode(', ', $to);
        if ($cc) {
            $headers[] = 'Cc: ' . implode(', ', $cc);
        }
        if ($replyTo !== '') {
            $headers[] = 'Reply-To: ' . $replyTo;
        }
        $headers[] = 'Subject: ' . $this->encodeHeader($subject);
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: base64';
        $headers[] = 'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $this->heloName() . '>';

        // base64 с переносами: длинные строки в письме недопустимы.
        $encoded = rtrim(chunk_split(base64_encode($body), 76, "\r\n"));

        return implode("\r\n", $headers) . "\r\n\r\n" . $encoded;
    }

    private function encodeAddress(string $name, string $address): string
    {
        if ($name === '') {
            return $address;
        }
        return $this->encodeHeader($name) . ' <' . $address . '>';
    }

    /** Кодирует non-ASCII по RFC 2047, иначе кириллица в теме едет. */
    private function encodeHeader(string $value): string
    {
        $value = str_replace(["\r", "\n"], '', $value);
        if (preg_match('/[^\x20-\x7E]/', $value) !== 1) {
            return $value;
        }
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private function command(string $line, int $expected): void
    {
        $this->write($line . "\r\n");
        $this->expect($expected);
    }

    private function write(string $data): void
    {
        // Точка в начале строки экранируется, иначе она обрывает передачу тела.
        $data = str_replace("\r\n.", "\r\n..", $data);
        // Финальный терминатор не должен пострадать от экранирования выше.
        $data = preg_replace('/\r\n\.\.\r\n$/', "\r\n.\r\n", $data);

        if (@fwrite($this->socket, $data) === false) {
            throw new SmtpException('Обрыв соединения при отправке');
        }
    }

    private function expect(int $code): string
    {
        $response = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $response .= $line;
            // Многострочный ответ: продолжение помечено дефисом после кода.
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        if ($response === '') {
            throw new SmtpException('Сервер не ответил');
        }

        $actual = (int) substr($response, 0, 3);
        if ($actual !== $code) {
            throw new SmtpException(sprintf('Ожидался код %d, получен ответ: %s', $code, trim($response)));
        }

        return $response;
    }

    private function close(): void
    {
        if (is_resource($this->socket)) {
            @fclose($this->socket);
        }
        $this->socket = null;
    }
}
