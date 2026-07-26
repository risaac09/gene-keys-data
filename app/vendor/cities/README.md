# cities.json

A city-to-IANA-timezone lookup for the app's birth input. 6,319 cities, 356
timezones, about 370 KB.

Each row: `[asciiName, countryCode, admin1Name, ianaTimezone, lat, lon]`,
sorted by population descending. Latitude and longitude are rounded to one
decimal and exist only to disambiguate same-named cities in the picker. The
app uses the timezone field for one thing: converting the entered local birth
time to UTC. No coordinate takes part in any computation.

## Provenance

- Source: GeoNames `cities15000.zip` and `admin1CodesASCII.txt`
  (https://download.geonames.org/export/dump/), fetched 2026-07-25.
- Filter: population >= 100,000, plus the most populous city of any timezone
  not otherwise represented.
- License: CC BY 4.0, see LICENSE.md in this directory.

## Regenerate

```
python build_cities.py cities15000.txt admin1CodesASCII.txt > cities.json
```

Run by a maintainer, offline. The app never fetches GeoNames at runtime.
