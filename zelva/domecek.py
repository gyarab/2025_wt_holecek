import turtle
import math
import random
t = turtle.Turtle()
t.speed(0) 
t.pensize(2)
def domecek(a):
    uhlopricka = a * math.sqrt(2)
    t.left(90)
    t.forward(a)
    t.right(30)
    t.forward(a)
    t.right(120)
    t.forward(a)
    t.right(75)
    t.forward(uhlopricka)
    t.left(135)
    t.forward(a)
    t.left(135)
    t.forward(uhlopricka)
    t.right(135)
    t.forward(a)
    t.right(90)
    t.forward(a)
    t.left(90)
t.penup()
t.goto(0, 100)
t.pendown()
pocet_domu = 24
uhel_otoceni = 360 / pocet_domu
for i in range(pocet_domu):
    velikost = random.randint(25, 35)
    domecek(velikost)
    t.right(uhel_otoceni)
t.hideturtle()
turtle.exitonclick()