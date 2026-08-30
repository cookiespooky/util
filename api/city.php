<?php
/**
 * Определение подразделения по IP.
 *
 * Отдаёт только ключ города — страницы остаются статикой и кешируются как
 * раньше, подстановку делает main.js. Если определить не удалось, возвращается
 * city: null, и сайт остаётся на городе по умолчанию.
 *
 * Правило намеренно региональное, а не городское. Тюменская область и ХМАО —
 * разные субъекты, они различаются надёжно. А вот Сургут и Нягань лежат в
 * одном округе: провайдеры регистрируют блоки адресов на региональный узел,
 * мобильные операторы выпускают абонентов через общие шлюзы, и различить эти
 * два города по IP нельзя. Поэтому для всего ХМАО подставляется головная
 * площадка, а не догадка.
 */

declare(strict_types=1);

require __DIR__ . '/lib/Support.php';

$config = load_config();
$siteData = load_site_data();

header('Content-Type: application/json; charset=utf-8');

/* HEAD принимаем наравне с GET: по стандарту это тот же запрос без тела,
   и сервер, отвечающий на GET, обязан отвечать на HEAD. Отказ ломал внешний
   мониторинг — сервисы проверки доступности по умолчанию шлют именно HEAD и
   получали 405, то есть «сайт лежит» на совершенно живом эндпоинте. */
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
    json_response(['city' => null, 'error' => 'method_not_allowed'], 405);
}

if (!($config['geo']['enabled'] ?? false)) {
    json_response(['city' => null, 'source' => 'disabled']);
}

$known = city_keys($siteData);
$geo = $config['geo'];

/**
 * Приводит ответ источника к ключу подразделения.
 * Точное совпадение по городу важнее правила по региону.
 */
$resolve = static function (?string $city, ?string $region) use ($geo, $known): ?array {
    if ($city !== null && $city !== '') {
        foreach ($geo['cities'] ?? [] as $name => $key) {
            if (mb_strtolower((string) $name) === mb_strtolower($city) && in_array($key, $known, true)) {
                return ['city' => $key, 'match' => 'city'];
            }
        }
    }

    if ($region !== null && $region !== '') {
        $region = strtoupper(preg_replace('/^RU-/i', '', $region) ?? '');
        $key = $geo['regions'][$region] ?? null;
        if ($key !== null && in_array($key, $known, true)) {
            return ['city' => $key, 'match' => 'region'];
        }
    }

    return null;
};

/* --- Источник 1: переменные от веб-сервера ------------------------------- */

/* Модуль GeoIP в nginx или Apache кладёт готовые значения в окружение.
   Это самый дешёвый путь: базу обновляет сервер, приложению читать нечего. */
$serverCity = $_SERVER['GEOIP_CITY'] ?? $_SERVER['HTTP_X_GEOIP_CITY'] ?? null;
$serverRegion = $_SERVER['GEOIP_REGION'] ?? $_SERVER['GEOIP_REGION_CODE']
    ?? $_SERVER['HTTP_X_GEOIP_REGION'] ?? null;

$match = $resolve(
    is_string($serverCity) ? $serverCity : null,
    is_string($serverRegion) ? $serverRegion : null
);

if ($match !== null) {
    json_response(['city' => $match['city'], 'source' => 'server', 'match' => $match['match']]);
}

/* --- Источник 2: база MaxMind рядом со скриптом -------------------------- */

/* Читатель .mmdb ставится composer'ом (geoip2/geoip2). На площадке его может
   не быть, поэтому наличие проверяется, а не предполагается: без него
   эндпоинт просто не определяет город и ничего не ломает. */
$mmdb = (string) ($geo['mmdb_path'] ?? '');

if ($mmdb !== '' && is_file($mmdb) && class_exists('GeoIp2\Database\Reader')) {
    try {
        $reader = new GeoIp2\Database\Reader($mmdb);
        $record = $reader->city(client_ip($config));

        $match = $resolve(
            $record->city->name ?? null,
            $record->mostSpecificSubdivision->isoCode ?? null
        );

        if ($match !== null) {
            json_response(['city' => $match['city'], 'source' => 'mmdb', 'match' => $match['match']]);
        }
    } catch (Throwable $e) {
        // Адрес не найден в базе или база повреждена — это не ошибка запроса.
        error_log('utilit: geoip: ' . $e->getMessage());
    }
}

/* --- Источник 3: локальная база SypexGeo --------------------------------- */

/* Фактически город определяет именно этот источник: модуля GeoIP у веб-сервера
   на этой площадке нет, композера для geoip2 — тоже, так что источники 1 и 2
   не срабатывают никогда.

   Читатель — один файл без composer и расширений (lib/SxGeo.php, лицензия
   BSD), база .dat лежит в storage рядом с журналом заявок: 37 МБ, в репозиторий
   не кладётся и по HTTP не отдаётся. Нет файла — источник просто молчит.

   Отдаём в $resolve русское название города и ISO-код региона: база возвращает
   их в том же виде, что ждут справочники geo.cities и geo.regions
   («Сургут», «RU-KHM»). */
$sxgeo = (string) ($geo['sxgeo_path'] ?? '');

if ($sxgeo !== '' && is_file($sxgeo) && is_file(__DIR__ . '/lib/SxGeo.php')) {
    require_once __DIR__ . '/lib/SxGeo.php';
    try {
        $reader = new SxGeo($sxgeo);
        $found = $reader->getCityFull(client_ip($config));

        if (is_array($found)) {
            $match = $resolve(
                $found['city']['name_ru'] ?? null,
                $found['region']['iso'] ?? null
            );

            if ($match !== null) {
                json_response(['city' => $match['city'], 'source' => 'sxgeo', 'match' => $match['match']]);
            }
        }
    } catch (Throwable $e) {
        // Битая база или адрес вне её — не повод ронять запрос.
        error_log('utilit: sxgeo: ' . $e->getMessage());
    }
}

json_response(['city' => null, 'source' => 'unknown']);
