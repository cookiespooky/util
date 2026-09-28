"""Светлая подложка карты для блока «География» на главной (home-v3):
реки, озёра и границы областей из Natural Earth 10m (общественное достояние).

Данные в репозиторий не кладём (~50 МБ), скачиваются один раз:

    mkdir -p /tmp/ne && cd /tmp/ne
    B=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
    curl -LO $B/ne_10m_rivers_lake_centerlines.geojson
    curl -LO $B/ne_10m_lakes.geojson
    curl -LO $B/ne_10m_admin_1_states_provinces.geojson
    python3 scripts/make-geo-map.py /tmp/ne

Пишет theme/assets/img/geo-map.svg и печатает положение городов в процентах
кадра — эти числа стоят в home-v3.html (--x/--y у точек и линия между ними).
Проекция равнопромежуточная с поправкой cos(φ) на среднюю широту: на участке
в семь градусов искажение незаметно."""
import json, math, os, sys

DATA = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'theme', 'assets', 'img', 'geo-map.svg')

LON0, LON1, LAT0, LAT1 = 58.0, 81.0, 56.4, 63.6
W = 1000
K = math.cos(math.radians((LAT0 + LAT1) / 2))
SX = W / ((LON1 - LON0) * K)
H = round((LAT1 - LAT0) * SX)
PAD = 1.5  # градусы запаса за краем, чтобы линии уходили за рамку

def proj(lon, lat):
    return ((lon - LON0) * K * SX, (LAT1 - lat) * SX)

def inside(lon, lat):
    return LON0 - PAD < lon < LON1 + PAD and LAT0 - PAD < lat < LAT1 + PAD

def dp(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / L
        if d > dmax: i, dmax = k, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return dp(pts[:i + 1], tol)[:-1] + dp(pts[i:], tol)

def runs(coords):
    run = []
    for lon, lat in coords:
        if inside(lon, lat): run.append(proj(lon, lat))
        elif run:
            yield run; run = []
    if run: yield run

def d_attr(lines, tol=.7, closed=False):
    out = []
    for coords in lines:
        for r in runs(coords):
            r = dp(r, tol)
            if len(r) < 2: continue
            out.append('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in r) + ('Z' if closed else ''))
    return ''.join(out)

def lines_of(g):
    t = g['type']
    if t == 'LineString': return [g['coordinates']]
    if t == 'MultiLineString': return g['coordinates']
    if t == 'Polygon': return g['coordinates']
    if t == 'MultiPolygon': return [r for p in g['coordinates'] for r in p]
    return []

rivers = json.load(open(os.path.join(DATA, 'ne_10m_rivers_lake_centerlines.geojson')))['features']
lakes = json.load(open(os.path.join(DATA, 'ne_10m_lakes.geojson')))['features']
admin = [f for f in json.load(open(os.path.join(DATA, 'ne_10m_admin_1_states_provinces.geojson')))['features'] if f['properties'].get('adm0_a3') == 'RUS']

# Реки: толщина по значимости (scalerank: меньше — крупнее)
river_paths = []
for f in rivers:
    sr = f['properties'].get('scalerank') or 9
    if sr > 9: continue
    d = d_attr(lines_of(f['geometry']))
    if d: river_paths.append((sr, d))
river_paths.sort(key=lambda t: -t[0])

lake_d = ''.join(d_attr(lines_of(f['geometry']), .5, True) for f in lakes)
border_d = ''.join(d_attr(lines_of(f['geometry']), .8) for f in admin)

def width(sr):
    return {2: 2.6, 3: 2.2, 4: 2, 5: 1.7, 6: 1.4, 7: 1.2}.get(sr, 1)

labels = [  # подпись, долгота, широта
    ('ХМАО — ЮГРА', 69.2, 62.75),
    ('ЯНАО', 77.6, 63.35),
    ('ТЮМЕНСКАЯ', 70.6, 57.75), ('ОБЛАСТЬ', 70.6, 57.45),
    ('СВЕРДЛОВСКАЯ', 60.6, 58.35), ('ОБЛАСТЬ', 60.6, 58.05),
    ('ТОМСКАЯ', 79.2, 59.7), ('ОБЛАСТЬ', 79.2, 59.4),
]

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">',
       '<!-- Реки, озёра и границы — Natural Earth 10m (общественное достояние). Собрано scripts/make-geo-map.py -->',
       f'<rect width="{W}" height="{H}" fill="#f5f7f6"/>',
       f'<path d="{border_d}" fill="none" stroke="#c8d1cd" stroke-width="1" stroke-linejoin="round"/>',
       f'<path d="{lake_d}" fill="#d9e9f2" stroke="#c3dbe8" stroke-width=".8"/>']
for sr, d in river_paths:
    svg.append(f'<path d="{d}" fill="none" stroke="#bcd8e8" stroke-width="{width(sr)}" stroke-linecap="round" stroke-linejoin="round"/>')
for text, lon, lat in labels:
    x, y = proj(lon, lat)
    svg.append(f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Manrope, Segoe UI, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="3.5" fill="#9aa7a1">{text}</text>')
for text, lon, lat in [('Обь', 76.6, 61.32), ('Иртыш', 67.2, 59.0)]:
    x, y = proj(lon, lat)
    svg.append(f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Manrope, Segoe UI, Arial, sans-serif" font-size="12" font-style="italic" fill="#8fb6cc">{text}</text>')
svg.append('</svg>')
open(OUT, 'w').write('\n'.join(svg))

cities = {'surgut': (73.396, 61.254), 'nyagan': (65.393, 62.140), 'tyumen': (65.534, 57.153)}
for k, (lon, lat) in cities.items():
    x, y = proj(lon, lat)
    print(k, f'{x / W * 100:.1f}% {y / H * 100:.1f}%')
print('size', W, H)
