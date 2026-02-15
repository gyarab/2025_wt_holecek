import httpx
URL = "https://www.cnb.cz/en/financial_markets/foreign_exchange_market/exchange_rate_fixing/daily.txt"
def get_eur_rate():
    response = httpx.get(URL)
    response.raise_for_status()
    lines = response.text.splitlines()
    for line in lines:
        if line.startswith("EMU"):
            parts = line.split("|")
            rate = parts[4].replace(",", ".")
            return float(rate)
    return None
def read_amount():
    while True:
        value = input("Zadej částku")
        try:
            amount = float(value)
            if amount > 0:
                return amount
            print("Částka musí být kladná")
        except ValueError:
            print("Neplatné číslo")
def read_direction():
    while True:
        direction = input("Zadej směr (1 = EUR->CZK, 2 = CZK->EUR):")
        if direction in ("1", "2"):
            return direction
        print("Neplatná volba")


def main():
    print("Stahuji kurzovní lístek ČNB")
    eur_rate = get_eur_rate()

    if eur_rate is None:
        print("Kurz EUR nebyl nalezen")
        return

    print(f"Aktuální kurz EUR: {eur_rate} CZK")

    direction = read_direction()
    amount = read_amount()

    if direction == "1":
        result = amount * eur_rate
        print(f"{amount} EUR = {result:.2f} CZK")
    else:
        result = amount / eur_rate
        print(f"{amount} CZK = {result:.2f} EUR")


main()
