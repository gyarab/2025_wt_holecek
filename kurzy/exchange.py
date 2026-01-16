import httpx
r = httpx.get("https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=15.01.2026")
lines = r.text.split("\n")
print(lines[0])