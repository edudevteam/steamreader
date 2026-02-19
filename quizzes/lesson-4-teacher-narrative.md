# Lesson 4: Maze Maker — Teacher Narrative

## Project: Maze Maker

---

## Before You Begin

This is the most advanced lesson so far and the one students tend to enjoy the most — they are building an actual game. Everything from Lessons 1-3 comes together here (variables, events, IF blocks, functions, importing assets, positioning, show/hide) and several new concepts are introduced: behaviors, grids, sprite-to-sprite interaction events, logical operators (greater than), custom graphics, and real debugging with bugs that surface during gameplay. Budget extra time. Students will encounter issues that mirror real software development — things that look right but behave wrong — and walking them through the debugging process is one of the most valuable parts of this lesson.

---

## Key Concepts to Explain During Class

### 1. Grids (Designing a Game World)

> "A grid is like graph paper for your game. You fill in squares to create walls and paths. One sprite fills the whole grid as the background, and a second sprite fills only certain squares to create the maze path."

- Show the `make sprite using grid` block.
- First grid: fill every square with a gray block (this becomes the wall/obstacle).
- Second grid: use a different sprite for select squares that form the path.
- Point out that the second grid layers on top of the first — order matters.
- Ask: *"Why do we need two grids instead of one?"* (Answer: one is the obstacle, the other is the safe path. The program needs to tell them apart.)

### 2. Custom Graphics (Modifying Costumes)

> "Sometimes the sprite you need doesn't exist yet. You can take an existing costume and edit it — draw on it, cut parts out, or add shapes. That is what real game developers do: start with a base asset and customize it."

- Demonstrate opening the Costume Editor and using the Filled Rectangle Tool to create the exit/stairs sprite from a Dark Wood block.
- Students do not need to be artists — simple shapes work fine. The point is that they can create what they need.

### 3. Functions for Game Organization (Review + Extension)

> "In Lesson 3 we used functions to organize scenes. Now we are using them to organize game elements. The `player` function handles creating and positioning the player sprite. The `exit` function handles the exit/stairs sprite. The `level_1` function contains the entire first maze. This keeps our main Workspace clean."

- Create the `player` function (make sprite, set size, set position).
- Create the `exit` function (make sprite, set size, set position).
- Later: create `level_1`, `level_2`, and `levels` functions.
- Emphasize that wrapping game pieces in functions makes it easy to swap, move, or reuse them.

### 4. Behaviors (Sprite Movement)

> "A behavior is a built-in action you can attach to a sprite. Instead of coding movement from scratch, you snap in the 'moving with arrow keys' behavior and the sprite can walk around the Stage using the arrow keys."

- Add the `when up pressed` event block.
- Snap in the `sprite begins moving with arrow keys` behavior block.
- Run the program — the player needs to press the up arrow once to activate the behavior, then use all arrow keys to move.
- Ask: *"Why does the program need an event block AND a behavior block?"* (Answer: the event block tells the program *when* to start the behavior; the behavior block tells the sprite *how* to move.)

### 5. Variables for Tracking (Health Points)

> "In previous lessons we used variables to track page numbers and bug counts. Now we are tracking **health**. The player starts with 3 health points. If they go off the path, they lose a point. This is the same concept — a variable that changes based on what happens in the game."

- Create the `health` variable and set it to 3.
- Use the `show variable at [location]` block so the health is visible on screen during gameplay.
- Position the health display somewhere that does not block the maze path.

### 6. Sprite Interaction Events (When Sprite Touches Sprite)

> "This is a brand new type of event. Instead of 'when clicked,' this one says 'when one sprite touches another sprite.' The program is constantly watching — the moment the player walks into a wall sprite, this event fires."

- First interaction: `when player touches wall` → `change health by -1`
- Second interaction: `when player touches exit` → check health and advance level
- Ask: *"What are some other games where something happens when two things touch?"* (Collecting coins, hitting enemies, reaching a finish line — students will recognize this from games they play.)

### 7. Logical Operators (Greater Than)

> "So far, our IF blocks have only checked if something **equals** something else. Now we need a new comparison: **greater than**. For the player to exit the maze, their health has to be greater than 0. The symbol for greater than is `>` — it looks like an arrow pointing to the bigger number."

- Build the IF block: `if health > 0` then remove the player sprite and play a sound.
- Walk through what happens if health is exactly 0: the condition is false, so the code inside does NOT run. The player is stuck.
- Ask: *"If health is 1, is 1 greater than 0?"* (Yes — the player can exit.) *"If health is 0, is 0 greater than 0?"* (No — the player cannot exit.)
- Briefly mention the other logical operators they might see: less than (`<`), not equal (`!=`). They don't need to memorize them all today.

### 8. Level Switching with Variables and IF Blocks

> "We want the game to have multiple levels. How does the program know which level to show? We use a variable called `level_count`. When `level_count` is 1, show level 1. When it is 2, show level 2. The `levels` function uses IF blocks to check this variable and load the right maze."

- Create the `level_count` variable and set it to 1.
- Build the `levels` function with IF blocks:
  - `if level_count = 1` → call `level_1`
  - `if level_count = 2` → call `level_2`
- When the player reaches the exit: `change level_count by 1`, then call `levels`.
- This is the same IF-block pattern from Lessons 2 and 3 — just applied to level management.

### 9. Debugging — The Hidden Level 1 Bug

> "Here is where it gets interesting. After switching to Level 2, the player loses health everywhere — even on the path. Why? Because Level 1's sprites are still there, hiding underneath Level 2. The program is still detecting the player touching Level 1's walls."

- This is an intentional teaching moment. Let the bug happen. Let students see it.
- Ask: *"What do you think is causing this?"* Give them time to reason through it.
- Solution: create a `remove_level_1` function that removes the old wall and path sprites before loading Level 2.
- Reinforce the lesson: **debugging means figuring out why something isn't working, not just that it isn't working.** The skill is in asking "why?"

### 10. Debugging — The Layering Order Bug

> "There is another bug. On Level 2, the player loses health even on the path. The problem is the order of the grid sprites. The water (obstacle) was placed first, so the wood (path) is on top — but the program still detects the water underneath."

- Solution: swap the grid order so the path is placed first (full background) and the obstacle goes on top forming the edges.
- Reinforce: **the order your code runs matters.** Sprites placed later appear on top, but earlier sprites still exist underneath.

---

## Lesson Recap

| Concept | One-Sentence Summary |
|---|---|
| Grids | Fill in squares to design walls and paths for a game level. |
| Custom Graphics | Edit existing costumes to create new sprites you need. |
| Functions for Levels | Wrap each game level in its own function for clean organization. |
| Behaviors | Built-in actions (like arrow-key movement) you attach to a sprite. |
| Health Variable | A variable that tracks a changing value during gameplay. |
| Sprite Interaction | "When sprite touches sprite" events fire on contact between two sprites. |
| Greater Than (`>`) | A logical operator that checks if one value is larger than another. |
| Level Switching | Use a `level_count` variable with IF blocks to load the correct level. |
| Debugging | Finding and fixing the root cause of unexpected behavior in your code. |

---

## Challenge Guidance

**Challenge 1 — Organize Level 1:** Students move the grid sprites and player/exit functions into a `level_1` function. This is a refactoring exercise — the game works the same, but the code is cleaner.

**Challenge 2 — Add Health Pickups:** Students add a Gold Coin sprite to Level 2. When the player touches it, the coin disappears, health increases by 2, and a sound plays. This reinforces sprite interaction events with a positive outcome instead of a negative one.

**Challenge 3 — Build Level 3:** Students create an entirely new maze level from scratch, applying everything they have learned. The level should include a new grid layout, repositioned player and exit sprites, removal of Level 2 sprites, and two bonus coins.

**Bonus — Enemy Sprite and Game Over:** Advanced students add a Fire Spirit with an automatic movement behavior that costs health on contact, a title screen with a start button, and a game-over condition when health reaches zero. This is the most open-ended challenge and rewards students who want to push further.
