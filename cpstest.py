from dtbox.button.shortcuts import button_x, button_o
from dtbox.display.shortcuts import display
from dtbox.led.shortcuts import led_green, led_red, led_amber
from dtbox.buzzer.shortcuts import buzzer
import utime

# ── Nastavení a Konstanty ──────────────────────────
TEST_DURATION = 10  # délka testu v sekundách
RESULT_DEADZONE_MS = 1000  # Ochranný čas proti prokliknutí v milisekundách

STATE_IDLE = 0
STATE_COUNTDOWN = 1
STATE_RUNNING = 2
STATE_RESULT = 3

# ── Globální proměnné ──────────────────────────────
state = STATE_IDLE
clicks = 0
best_cps = 0.0
start_time = 0
result_view = 0
result_start_time = 0 

# ── Obsluha tlačítek ───────────────────────────────
@button_o.on_press
def handle_o():
    global state
    if state == STATE_IDLE:
        state = STATE_COUNTDOWN
    elif state == STATE_RESULT:
        # O nyní ukončuje prohlížení a vrací do IDLE stavu
        state = STATE_IDLE
        setup_idle_screen()

@button_x.on_press
def handle_x():
    global clicks, state, result_view
    if state == STATE_RUNNING:
        clicks += 1
        led_green.toggle()
    elif state == STATE_RESULT:
        # X nyní cykluje výsledky (chráněno deadzonou proti setrvačnosti)
        if utime.ticks_diff(utime.ticks_ms(), result_start_time) > RESULT_DEADZONE_MS:
            result_view = (result_view + 1) % 3
            buzzer.beep(freq=1000, length=50)

# ── Pomocné funkce ─────────────────────────────────
def setup_idle_screen():
    display.show('PLAY', scroll=False)
    led_red.value(0)
    led_amber.value(1)
    led_green.value(0)

def show_result_view():
    if result_view == 0:
        display.show(round(clicks / TEST_DURATION, 1))
        led_red.value(1)
        led_amber.value(0)
        led_green.value(0)
    elif result_view == 1:
        display.show(clicks)
        led_red.value(0)
        led_amber.value(1)
        led_green.value(0)
    elif result_view == 2:
        display.show(best_cps)
        led_red.value(0)
        led_amber.value(0)
        led_green.value(1)

# ── Inicializace ───────────────────────────────────
setup_idle_screen()

# ── Hlavní smyčka ──────────────────────────────────
while True:
    if state == STATE_COUNTDOWN:
        led_amber.value(1)
        for i in [3, 2, 1]:
            display.show(f'   {i}')
            buzzer.beep(freq=800, length=100)
            utime.sleep(1)

        display.show(' GO ')
        buzzer.beep(freq=1200, length=300)
        led_amber.value(0)
        led_green.value(1)

        clicks = 0
        start_time = utime.ticks_ms()
        state = STATE_RUNNING

    elif state == STATE_RUNNING:
        elapsed_ms = utime.ticks_diff(utime.ticks_ms(), start_time)
        remaining = TEST_DURATION - elapsed_ms / 1000

        if remaining <= 0:
            # ── Ukončení testu ──
            state = STATE_RESULT
            led_green.value(0)
            led_red.value(1)
            buzzer.beep(freq=400, length=500)

            current_cps = round(clicks / TEST_DURATION, 1)
            if current_cps > best_cps:
                best_cps = current_cps

            display.show('End ')
            utime.sleep(1.5)
            
            result_view = 0
            result_start_time = utime.ticks_ms() 

        else:
            display.show(round(remaining, 1))

    elif state == STATE_RESULT:
        show_result_view()

    utime.sleep_ms(50)
