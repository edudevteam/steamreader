---
id: "85dd43b6-21bb-408a-beb7-0c4d22ef5169"
title: "TinkerCAD Circuits Lesson 2"
subtitle: "LED's and Resistance"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-07-11"
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

feature_image: "/images/Tinkercad-Circuits-Lesson-2.png"
feature_image_alt: "TinkerCAD Circuits Lesson 2"
feature_image_caption: "TinkerCAD Circuits Lesson 2"
excerpt: "Let's learn the basics of resistors and how they affect the flow of electricity in a (series) circuit."
status: published
prev: tinkercad-circuits-lesson-1
next: tinkercad-circuits-lesson-3
---

# TinkerCAD Circuits Lesson 2

## 📌 Lesson Objectives

By the end of this lesson, the student will be able to:

1.  Identify an LED (Light Emitting Diode) and understand that it is sensitive to high voltage.
2.  Predict what happens when an LED is connected directly to a 9V battery.
3.  Use a resistor to protect the LED and observe how it changes the brightness.

## 🚀 Tutorial

In this lesson we are going to meet a new part called a **resistor**. A resistor slows down how much electric energy moves through a circuit. Slowing the energy down keeps the other parts safe — especially a tiny light called an **LED**.

### The Closed-Loop Tube Analogy

Before we build, let's imagine something. Picture a clear plastic tube that bends all the way around into a circle, like a donut. The tube is packed full of tiny beads, from one end to the other, with no empty spaces.

The battery is the **pusher**. It pushes on the beads so every bead moves around and around the loop together. Those moving beads are the **current** — the electricity flowing through your circuit.

Now let's swap out one small piece of the tube for a piece that is stuffed with bumps and narrow gaps. That bumpy piece is the **resistor**. The beads have to bump, squeeze, and wiggle their way through it. Squeezing through slows down _every_ bead in the whole loop, so fewer beads go past you each second. That is exactly what resistance does to electric current!

- **A Resistor is the Bumpy Part:** It does not push or pull. It just makes the beads work harder to get through, which sets a safe, steady speed for the entire loop.
- **A Few Bumps (Low Resistance):** The beads slide through easily and lots of energy reaches the LED.
- **Lots of Bumps (High Resistance):** The beads have a hard time squeezing through, so the whole loop slows down and less energy reaches the LED.
- **No Bumps at All (No Resistor):** The beads race around so fast that the LED cannot handle it — and it pops!

![A closed LED circuit without Resistor](/images/TinkerCAD-Circuits-L02-Circuit-without-Resistor.png)

![A closed LED circuit with Resistor](/images/TinkerCAD-Circuits-L02-Circuit-with-Resistor.png)

### Activity 1: The "Pop" (The Danger of Too Much Power)

- **Concept**: LEDs are very sensitive components and cannot handle the full push (Voltage) of a 9V battery. They need a "safety guard."
- **Activity**:
  1.  Place a 9V battery and a Red LED in Tinkercad Circuits.
  2.  Connect the Red (Positive) wire directly to the LED's Anode (bent leg).
  3.  Connect the Black (Negative) wire directly to the LED's Cathode (straight leg).
  4.  Click "Start Simulation."
- **Observation**: An explosion icon appears above the LED, indicating it has "popped" and broken.

<iframe
  src="https://www.youtube.com/embed/bUB8k9qlh5I"
  title="L02 01 Overview and Step 1 The Pop"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

### Activity 2: Introducing the Resistor (The Gatekeeper)

- **Concept**: A resistor is the bumpy part of the loop. The beads (Current) have to squeeze through it, which slows the flow down for the whole circuit. It acts as a gatekeeper for the sensitive LED.
- **Activity**:
  1. Click "Stop Simulation."
  2. Add a Resistor to your workspace.
  3. Connect it in-line between the battery's positive terminal and the LED's Anode.
  4. Click "Start Simulation" again.
- **Observation**: The LED now turns on safely and stays lit!

<iframe
  src="https://www.youtube.com/embed/Mx7-T_AnFsM"
  title="L02 02 Step 2 Add A Resistor"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

### Activity 3: Tinkering with Brightness

- **Concept**: You can control the brightness of the LED by changing the resistor's value, which is measured in **Ohms (Ω)**.
- **Activity**:
  1.  Click on the resistor and change its value to **100 Ω**. Click "Start Simulation." (The LED is very bright).
  2.  Stop the simulation and change the resistor value to **10,000Ω (10k)**. Click "Start Simulation." (The LED is very dim).
- **Conclusion**: The higher the number of Ohms, the more the resistor slows the flow (like adding more bumps for the beads to squeeze through), and the dimmer the LED becomes.

<iframe
  src="https://www.youtube.com/embed/cK-tKitN_hE"
  title="L02 03 Step 3 Changing The Brightness"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

### Activity 4: Decoding the "Shorthand" (The Letter Code)

- **Concept**: Scientists use letters to avoid writing too many zeros. These are like math "shortcuts."
  - **k** = Kilo (Thousands). **1k&Omega;** is **1,000 &Omega;**.
  - **m** = Milli (Thousandths). **1m&Omega;** is **0.001 &Omega;**.
  - **&mu;** = Micro (Millionths). **1&mu;&Omega;** is **0.000001 &Omega;**.
- **Activity**: Look at the dropdown menu in Tinkercad.
  - If you see **M&Omega;** (Mega), that is a **Million**. That part of the tube is so packed with bumps that almost no beads can get through!
- **The Rule**:
  - **Bigger letters (M, G, k)** = More resistance (More bumps and tighter gaps).
  - **Little letters (m, &mu;, n, p)** = Less resistance (Fewer bumps and more open space).

| Prefix   | Name  | Symbol      | Value (&Omega;)        |
| :------- | :---- | :---------- | :--------------------- |
| **G**    | Giga  | G&Omega;    | 1,000,000,000 &Omega;  |
| **M**    | Mega  | M&Omega;    | 1,000,000 &Omega;      |
| **k**    | Kilo  | k&Omega;    | 1,000 &Omega;          |
| -        | Base  | &Omega;     | 1 &Omega;              |
| **m**    | milli | m&Omega;    | 0.001 &Omega;          |
| **&mu;** | micro | &mu;&Omega; | 0.000001 &Omega;       |
| **n**    | nano  | n&Omega;    | 0.000000001 &Omega;    |
| **p**    | pico  | p&Omega;    | 0.000000000001 &Omega; |
