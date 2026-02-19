# Lesson 3: The Bug Catcher — Teacher Narrative

## Project: L3 - The Bug Catcher

---

## Before You Begin

Students now know variables, events, IF blocks, print/debugging, and concatenation. This lesson introduces **functions** — the idea that you can bundle a set of instructions together, give the bundle a name, and call it whenever you need it. Functions are a major step up in thinking. Spend extra time here making sure students understand *why* functions exist, not just *how* to create one. The lesson also reinforces counters, IF blocks, show/hide, positioning, and importing assets.

---

## Key Concepts to Explain During Class

### 1. Importing from the Background and Costume Libraries

> "Just like we imported arrow costumes in Lesson 2, today we are going to import backgrounds AND costumes. We need five village backgrounds, a pig character, five bug sprites, and a start button."

- Walk through importing from the Backgrounds tab (search "Village," select all five).
- Walk through importing from the Costumes tab (Pig with Axe, five bugs, Start button).
- Remind students to click back to the Code tab each time.
- Reinforce that importing assets is separate from placing them — importing just makes them available for use.

### 2. Show and Hide (Removing Sprites)

> "Sometimes you want something to appear at first and then disappear. The Start button is a good example — you see it at the beginning, you click it, and it goes away. The `remove sprite` block makes a sprite invisible on the Stage."

- Set up the `when Start clicked` event with a `remove Start` block inside.
- Run the program and demonstrate: click the Start button and it vanishes.
- Connect this to game design: games use show/hide constantly — enemies disappear when defeated, power-ups vanish when collected.

### 3. Counter Variables

> "We used `page_number` in Lesson 2 to track which page we were on. Today we are using a variable called `counter` to keep track of how many bugs the player has caught. Every time they click a bug, the counter goes up by 1."

- Create the `counter` variable and initialize it to 0.
- Add the print line so students can watch the value change: `[print]["counter = "][counter]`
- After each bug click: `change counter by 1`, then print again.
- Ask the class: *"If I click three bugs, what number will the counter show?"* (Answer: 3.)

### 4. Functions — What They Are

> "Imagine you had to write the same set of instructions over and over — set the background, add a bug, position it, set its size. That gets messy and repetitive. A **function** lets you put all those steps inside one container, give it a name like `scene_1`, and then just use that name whenever you need those steps to run."

- Use a real-world analogy:
  > "Think of a recipe. Instead of listing every step for making a peanut butter sandwich every time someone asks, you write the recipe once and just say 'follow the PB&J recipe.' A function is like that recipe — write it once, use it whenever you want."

- Create the function `scene_1` and show the Function Workspace.
- Add an IF block inside: `if counter = 0` then `set background to` the first village.
- Close the function, then snap the `scene_1` block into the main Workspace.

### 5. Functions — Why They Matter

> "Right now we only have one scene. But by the end of this lesson we will have five scenes — one for each bug. Without functions, our Workspace would be an enormous mess of blocks. With functions, each scene is neatly packaged and easy to find."

- After building `scene_1`, build `scene_2` with `if counter = 1`.
- Point out how clean the main Workspace stays — just a list of function calls instead of a wall of blocks.
- Emphasize **reusability**: the `scene_1` function can be called from anywhere, as many times as needed.

### 6. Multiple Event Listeners

> "Each bug needs its own event block. When the lady bug is clicked, remove the lady bug and add 1 to the counter. When the next bug is clicked, remove that bug and add 1 to the counter. Same pattern, different sprite."

- Build the first bug click event:
  1. `when Lady Bug clicked`
  2. `remove Lady Bug`
  3. `change counter by 1`
  4. Print the counter
  5. Call the next scene function

- Ask students: *"If we have five bugs, how many 'when sprite clicked' event blocks will we need for the bugs?"* (Answer: 5.)

### 7. Positioning Sprites with Coordinates

> "Remember how we moved sprites by clicking the location pin? Those pins actually use **coordinates** — an x value for left-right and a y value for up-down. Coordinates let you place sprites at exact spots on the Stage, which is much more precise than just dragging."

- Show how the location block contains coordinate values.
- When positioning bugs inside functions, point out the x,y numbers.
- Let students know they will use coordinates even more in the next lessons.

### 8. IF Blocks with Counter Values (Pattern Recognition)

> "Notice the pattern: `scene_1` checks if counter = 0, `scene_2` checks if counter = 1, `scene_3` checks if counter = 2, and so on. Each function says 'only change the scene when the right number of bugs have been caught.' This is the same IF block logic from Lesson 2 — we are just using it inside functions now."

- Walk through the full chain:
  - Counter starts at 0 → scene_1 shows background 1
  - Click bug → counter becomes 1 → scene_2 shows background 2
  - Click bug → counter becomes 2 → scene_3 shows background 3
  - And so on...

### 9. Print Blocks for Debugging (Reinforcement)

> "We have been using print blocks all lesson to watch the counter value change. This is still debugging — checking that the code is doing what we expect. Once everything works, we can remove the print blocks so the player does not see our testing notes."

- Remind students: print is for the developer, not the end user.

---

## Lesson Recap

| Concept | One-Sentence Summary |
|---|---|
| Importing Assets | Search for and add new backgrounds and costumes from the libraries. |
| Show / Hide | The `remove sprite` block makes a sprite disappear from the Stage. |
| Counter Variable | A variable used to count events, like how many bugs were clicked. |
| Functions | A named, reusable container of instructions that you can call by name. |
| Why Functions | They keep your code organized and prevent repeating the same blocks. |
| Multiple Event Listeners | Each clickable sprite needs its own event block. |
| Coordinates | x,y values that place a sprite at an exact position on the Stage. |
| IF Inside Functions | Functions can contain IF blocks that check variable values before acting. |

---

## Challenge Guidance

**Challenge 1 — Move the Piggy:** Students remix their project and make the pig sprite jump to a new position on the ground each time the background changes. This reinforces coordinates and the `jump to [location]` block.

**Challenge 2 — Remove Print Blocks:** Students clean up by removing all print blocks (debugging is done), then make the pig say a clue for each scene (e.g., "Can you find the Lady Bug?"). The last bug click should trigger a victory message. This teaches students the difference between developer-facing output (print) and user-facing output (sprite say).
