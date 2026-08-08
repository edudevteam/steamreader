---
id: "f564a273-7bba-48c7-9872-cf9eebdd1214"
title: "TinkerCAD Circuits Lesson 5"
subtitle: "Controlling Light with RGB LEDs and Push Buttons"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-07-14"
category: "Tutorial"
tags:
  - education
  - electronics
  - circuits
  - electricity
  - energy
  - ohms law
  - restance
  - led
  - breadboard
  - ohms law

feature_image: "https://cdn.steamreader.com/static/Tinkercad-Circuits-Lesson-5.png"
feature_image_alt: "Tinkercad Circuits Lesson 5"
feature_image_caption: "Tinkercad Circuits Lesson 5"
excerpt: "Let's learn how to find the `just right` resistor so an RGB LED glows bright and happy in red, green, and blue. Then you'll add a push button that turns your color on only while you hold it down!"
status: published
prev: tinkercad-circuits-lesson-4
next: tinkercad-circuits-lesson-6
---

# TinkerCAD Circuits Lesson 5

## 📌 Lesson Objectives

By the end of this lesson, the student will be able to:

1. Test a range of resistors to find the "Goldilocks" value that lights an LED brightly without damaging it.
2. Measure voltage across a resistor and an LED with a multimeter to verify a circuit is running safely.
3. Explain why the red, green, and blue pins of an RGB LED require different resistor values.
4. Wire a push button into a circuit to act as a momentary gate that controls the flow of current.
5. Describe how a momentary switch differs from an on/off switch and why the LED turns off the instant the button is released.

## 🚀 Tutorial

<img style="width: 500px;" src="https://cdn.steamreader.com/static/TinkerCAD-Circuits-L05-Activity-Components.png" alt="Breadboard, 9 volt battery, push button, LED RGB, resistor" />

**What is a "Momentary Switch"?**
Think of a **Momentary Switch** like a doorbell. It is only "on" while you are pressing it down. As soon as you let go, it pops back up and turns the circuit "off". It is called "momentary" because it only does its job for the _moment_ that you are touching it!

### Activity 1: The "Goldilocks" Resistor Hunt

- **Objective**: Use your multimeter and different resistors to find the "just right" amount of power for your LED.
- **Concept**: Math gives us a starting point, but testing tells us the truth! Sometimes our parts have different needs than the general rules.
- **Activity**:
  1. Connect your 9V battery and RGB LED (Red pin only) to the breadboard.
  2. Try different resistors. If the light pops, the resistor is too small (too much current). If the light is too dim, the resistor is too big (not enough current).
  3. Use your multimeter to check the voltage across the resistor and the LED.
  4. **Documentation**: Write down the specific resistor value that makes your LED look "bright and happy" without getting too hot. This is your "Goldilocks" resistor!

<iframe
  src="https://www.youtube.com/embed/yBnvg74puZU"
  title="L05 Activity 1 Test Red LED"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

---

### Activity 2: Building the Color Circuit

- **Objective**: Use your "Goldilocks" resistor value to build a safe circuit for each color.
- **Activity**:
  1. Repeat the "Goldilocks" test for the Green and Blue pins of the RGB LED.
  2. Document the perfect resistor for each color in your Engineer's Notebook.
  3. **Challenge**: Why do you think the Red pin needed a different resistor value than the Green or Blue pins?

<iframe
  src="https://www.youtube.com/embed/OTQxmwpN29E"
  title="L05 Activity 2 Test Each LED"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

---

### Activity 3: The "Momentary" Color Switch

- **Objective**: Use a **Push Button** to act as a gate for your color circuit.
- **Activity**:
  1. Keep your RGB LED and your "Goldilocks" resistors on the breadboard.
  2. Add a **Push Button** to your circuit.
  3. Connect your battery through the **Push Button**, then through your chosen resistor, and finally to the RGB pin.
  4. **Simulation Challenge**:
     - Start the simulation.
     - Click the button to see your color light up!
     - **Pro Tip**: Hold the **Shift-key** while clicking the button to "lock" it in the pressed position to test your circuit.
  5. **Documentation**: Describe what happens to the LED when you release the button. Why does it turn off immediately?

<iframe
  src="https://www.youtube.com/embed/GKJ-Y79Eky0"
  title="L05 Activity 3 RGB LED PushButtons"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>
