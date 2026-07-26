"""Regenerate cities.json from a GeoNames dump.

Source files (https://download.geonames.org/export/dump/, CC BY 4.0):
    cities15000.zip        -> cities15000.txt
    admin1CodesASCII.txt

Filter: every city with population >= 100,000, plus the most populous city of
any IANA timezone not otherwise represented, so every zone in the dump stays
reachable through city search. Output rows, population-descending:

    [asciiName, countryCode, admin1Name, ianaTimezone, lat, lon]

Run:
    python build_cities.py cities15000.txt admin1CodesASCII.txt > cities.json

This is a data-preparation tool, run offline by a maintainer. The app never
executes it and never fetches GeoNames at runtime.
"""
import json
import sys

MIN_POPULATION = 100_000


def main(cities_path, admin1_path):
    admin1 = {}
    with open(admin1_path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3:
                admin1[parts[0]] = parts[2]  # code "US.NY" -> ascii name

    rows = []
    with open(cities_path, encoding="utf-8") as f:
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) < 18:
                continue
            ascii_name, country = p[2], p[8]
            lat, lon = float(p[4]), float(p[5])
            admin1_name = admin1.get(f"{country}.{p[10]}", "")
            population = int(p[14] or 0)
            tz = p[17]
            if not tz or not ascii_name:
                continue
            rows.append((population, ascii_name, country, admin1_name, tz, lat, lon))

    rows.sort(key=lambda r: -r[0])

    keep = [r for r in rows if r[0] >= MIN_POPULATION]
    covered = {r[4] for r in keep}
    for r in rows:  # already population-descending, so first hit per zone wins
        if r[4] not in covered:
            keep.append(r)
            covered.add(r[4])
    keep.sort(key=lambda r: -r[0])

    out = [[r[1], r[2], r[3], r[4], round(r[5], 1), round(r[6], 1)] for r in keep]
    json.dump(out, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    sys.stdout.write("\n")
    print(f"{len(out)} cities, {len(covered)} timezones", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
