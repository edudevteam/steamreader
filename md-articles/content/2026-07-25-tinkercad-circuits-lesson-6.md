---
id: "e78dc961-f383-46e6-bc56-c2a4b129f9e8"
title: "TinkerCAD Circuits Lesson 6"
subtitle: "Mastering Light with Potentiometers"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-07-15"
category: "Tutorial"
tags:
  - education
  - electronics
  - circuits
  - electricity
  - energy
  - ohms law
  - restance
  - rgb led
  - breadboard
  - ohms law
  - potentiometer

feature_image: "/images/Tinkercad-Circuits-Lesson-6.png"
feature_image_alt: "TinkerCAD Circuits Lesson 6"
feature_image_caption: "TinkerCAD Circuits Lesson 6"
excerpt: "Let's learn how to use a knob called a potentiometer to make your light slowly get brighter and dimmer, just like a faucet controls water. Then you'll use three knobs at once to mix your very own rainbow colors!"
status: published
prev: tinkercad-circuits-lesson-5
next: tinkercad-circuits-lesson-7
---

# TinkerCAD Circuits Lesson 6

## 📌 Lesson Objectives

By the end of this lesson, the student will be able to:

1. Wire a potentiometer into a circuit to adjust the brightness of an LED, and measure the change in current with a multimeter.
2. Explain why a fixed resistor is still required as a "safety brake" even when a potentiometer is present.
3. Connect multiple ground wires to a shared ground rail to complete several paths in one circuit.
4. Build a three-potentiometer circuit to mix custom colors on an RGB LED.
5. Compare series and parallel circuits and explain why resistance in parallel branches does not add together.

## 🎓 Did You Know?

**What is a "Potentiometer"?**
Think of a Potentiometer (or "Pot") like a water faucet. A switch can only turn the water "on" or "off." A faucet lets you turn the handle to decide exactly how much water comes out. A Potentiometer lets you turn a knob to decide exactly how much electricity flows through your circuit—making your light dimmer or brighter!

**Pro Tip for TinkerCAD:** When you click on your Potentiometer, you might see a setting for Resistance. Don't worry about this—just set it to **10kΩ** (the most common size) and leave it there!

<img src="/images/TinkerCAD-Circuits-L06-Potentiometer.png" alt="potentiometer 2d graphic" />

**New Concept: The Shared Ground Highway**
In this lesson, you will use more than one ground wire! It might look different, but it’s still simple:

- Think of the **black Ground rail (-)** like a big **Bus Stop**.
- Electricity leaves the battery, takes different paths (like through the Potentiometer or the LED), but all paths end at the same Bus Stop.
- As long as every ground wire touches the **black line**, every path successfully leads back to the battery to keep your circuit closed!

## 🚀 Tutorial

### Activity 1: The "Dimmer Switch"

- **Components Needed**:
  - 9V Battery
  - Breadboard
  - Standard LED (1)
  - Potentiometer (1)
  - Resistor (1)
  - Multimeter (1)
  - Jumper Wires
- **Objective**: Build a circuit where you can control the brightness of a single LED using a knob, and use a Multimeter to see how much current is flowing.
- **Wiring Setup**:
  1. Connect **Terminal 1** of your Potentiometer to the **Ground (-) rail (the black line)**.
  2. Connect **Terminal 2** of your Potentiometer to the **Power (+) rail (the red line)**.
  3. Connect the **Wiper (middle pin)** to your **Resistor**.
  4. To measure current, place your **Multimeter** in the path: connect the other side of the resistor to the **positive lead (red)** of the Multimeter, then connect the **negative lead (black)** of the Multimeter to the **positive leg** (longer leg) of your LED.
  5. Connect the **negative leg** (shorter leg) of your LED to the **Ground (-) rail (the black line)**.
  6. **Simulation Challenge**: Start the simulation, turn the knob, and watch both the LED brightness change and the Current (Amps) change on the Multimeter!
- **Note for Students**: You might notice the Potentiometer cannot adjust the circuit to exactly 20mA or the specific voltage your LED needs. That is perfectly okay! We are using the Multimeter just to see the change happening as we turn the knob.
- **Documentation**: As you turn the knob, what happens to the number on the Multimeter? Does it go up or down?

<iframe
  src="https://www.youtube.com/embed/Q2CnDkCmuK8"
  title="L06 Activity 1 Potentiometer 2 GND Wires"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

---

### Activity 2: The "Single-Color Mixer"

- **Components Needed**:
  - 9V Battery
  - Breadboard
  - RGB LED (1)
  - Potentiometer (1)
  - Resistor (1)
  - Jumper Wires
- **Objective**: Use one Potentiometer to control the brightness of a single color on the RGB LED to understand how the "Safety Brake" works.
- **The Golden Rule of LEDs**: Always include a fixed resistor in your circuit to act as a permanent safety brake.
- **The Big Question**: Why do I need to use a fixed Resistor if I already have a Potentiometer?
- **The Safety Brake Explanation**: Think of the Potentiometer as a volume knob. If you turn the knob all the way down, the Potentiometer's resistance disappears! The fixed Resistor acts as a "permanent safety brake" to make sure the electricity never gets too high and burns out your LED.
- **Activity**:
  1. **Calculate & Prep**: Look back at your notes from Lesson 5 to find the safe resistance value for one of the color pins on your RGB LED, or use the Ohm’s Law equation to calculate it again.
  2. **Layout**: Connect the 9V battery to the breadboard rails, place your RGB LED on the board, and connect its **Common Cathode** pin to the Ground (-) rail.
  3. **Position**: Place one resistor so it connects to one of the color pins (e.g., Red) and leave room to connect to the potentiometer.
  4. **Power Up**: Attach your potentiometer to the breadboard. Connect its outer terminals (Terminal 1 and Terminal 2) to the Power (+) and Ground (-) rails.
  5. **Bridge the Connection**: Connect the **Wiper (middle pin)** of the potentiometer to the color pin you chose, ensuring the wire connects _before_ it hits the resistor.
  6. **Test**: Start the simulation and turn the knob to see the color brighten and dim safely!

<iframe
  src="https://www.youtube.com/embed/0wQESCN5Zdk"
  title="L06 Activity 2 RGB LED Potentiometer"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

---

### Activity 3: The "Rainbow Mixer"

- **Objective**: Expand your circuit to control all three colors (Red, Green, and Blue) to create custom colors.

- **Activity**:
  1. **Expand**: Add the remaining two potentiometers and two resistors to your breadboard.
  2. **Wire**: Repeat the wiring steps from Activity 2 for the remaining two color pins on your RGB LED.
  3. **Explore**: Now that you have all three colors under your control, move the knobs to different positions.
  4. **The Challenge**: Can you create the color purple? How about yellow or teal? Turn the knobs to find these colors and discover the full spectrum!
  5. **Discovery**: What happens when all three knobs are turned to their maximum brightness? Does the light look white?

<iframe
  src="https://www.youtube.com/embed/CFH6EMjJflk"
  title="L06 Activity 03 Parallel Circuit Potentiometer"
  width="100%"
  style="max-width: 900px; aspect-ratio: 16 / 9; height: auto; border-radius: 8px;"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

---

### Why Don't Three Resistors Add Up to 1.2kΩ?

<img src="/images/TinkerCAD-Circuits-L06-Series-vs-Parallel-Circuit.png" alt="series circuit versus parallel circuit" />

A clever question you might ask when looking at this circuit is: _"If we have three 400Ω resistors, does that add them all together to make 1.2kΩ?"_

The answer is **no**, because of how the electricity flows and whether the circuit is wired in series or in parallel!

- **Series vs. Parallel Circuits**:
  - In a **series circuit**, components are connected along a single path, one after another, so the current must flow through every component sequentially.
  - In a **parallel circuit**, the electricity leaves the battery and splits into multiple independent branches or paths, allowing the current to flow through each component separately before merging back together.
- **The Water Pipe Analogy (Series)**: If you put three narrow pipe sections _in a row_ in a single path (like a series circuit), the water has to squeeze through three tight spots back-to-back, causing the resistance to add up.
- **The Splitting River (Parallel)**: In this parallel circuit, electricity leaves the battery and splits into **three separate, independent paths** (one for Red, one for Green, and one for Blue).
- **No Pile-Up**: The electricity flowing down the Red path only goes through the Red resistor. It never squeezes through the Green or Blue resistors. Because these paths run side-by-side instead of back-to-back, each individual color handles its own safety limit independently without multiplying the resistance together!
