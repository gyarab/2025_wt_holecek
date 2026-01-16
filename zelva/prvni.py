from turtle import exitonclick, forward, left, right
from math import sqrt
from random import randint
def domecek(a):
    c = sqrt(2*a**2)
    forward(a)
    left(90)
    forward(a)
    left(90)
    forward(a)
    left(90)
    forward(a)
    left(90)
    forward(a)

for i in range(10):
    domecek(randint(10,20))
    right(36)

exitonclick()