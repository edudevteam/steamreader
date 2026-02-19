# Lesson 2: Picture Swap — Teacher Narrative

## Project: L2 Pict Swap

---

## Before You Begin

Students already know how to add backgrounds, sprites, variables, events, and concatenation from Lesson 1. This lesson layers on several new ideas: importing custom assets, assigning number values to variables, incrementing and decrementing, using print for debugging, and — most importantly — their first look at conditional logic with IF blocks. Take your time with IF blocks. This is the concept students will use in every lesson going forward.

---

## Key Concepts to Explain During Class

### 1. Importing Custom Sprites (Costumes)

> "So far we have used sprites that were already available. But what if you need something that isn't there — like arrow buttons? That's where the Costume Library comes in. You can search for and import new sprites into your project."

- Walk students through the Costumes tab above the Stage/Canvas.
- Show them how to click `New Costume +`, search for "arrow," and select the left and right arrows.
- Remind them to click back to the Code tab when they are done.

### 2. Variable Assignment (Setting a Starting Value)

> "In Lesson 1 we stored text in a variable. This time we are storing a number. When you set a variable to a starting value — like setting `page_number` to 0 — that is called **initializing** the variable. It is like resetting a scoreboard to zero before a game starts."

- Create the variable `page_number`.
- Use the `set page_number to` block with a Math `0` block.
- Emphasize that the variable now holds the number 0 and will stay at 0 until something in the code changes it.

### 3. The Print Block (Debugging)

> "How do you know what value is inside your variable right now? You can't just look at the variable — you need a way to peek inside. The `print` block displays text at the top of the Stage so you can check what's going on. Real programmers call this **debugging** — it's like being a detective looking for clues in your own code."

- Build the print line: `[print]["Page number: "][page_number]`
- Run the program and show that "Page number: 0" appears at the top.
- Let students know that print is a tool for *them*, not for the final user. They will remove print blocks later once everything works.

### 4. Multiple Events

> "In Lesson 1 we used one event. Now we need two — one for clicking the left arrow and one for clicking the right arrow. Each event listens for something different, and each one runs its own set of code."

- Add a `when sprite clicked` event for the left arrow.
- Add a separate `when sprite clicked` event for the right arrow.
- Ask students: *"If we want two buttons to do two different things, how many event blocks do we need?"* (Answer: 2.)

### 5. Changing a Variable Value (Increment and Decrement)

> "Right now `page_number` is stuck at 0. We want the right arrow to make it go up and the left arrow to make it go down. The `change variable by` block adds or subtracts from whatever is currently stored."

- Under the left-arrow event: `change page_number by -1` (decrement).
- Under the right-arrow event: `change page_number by 1` (increment).
- Run the program and click each arrow. Point out the print output changing at the top.
- Use a number line on the board if students are unsure about negative numbers. Show that 0 minus 1 equals -1.

### 6. Concatenation Review

> "Remember concatenation from Lesson 1? We used it to join 'Hi ' with a name. This time we are joining the label 'Page number: ' with the actual number stored in the variable. Same idea, different data."

- Quick review — no need to re-teach, just point out that it works with numbers too.

### 7. IF Blocks (Conditional Logic)

> "This is the big one. An IF block is how your program makes decisions. It checks a condition — is this true or false? — and only runs the code inside if the answer is **true**."

- Start with a real-world analogy:
  > "If it is raining, bring an umbrella. If it is NOT raining, you skip that step. Your brain checks a condition and decides what to do. An IF block works exactly the same way."

- Build the first IF block under the right-arrow event:
  - `if page_number = 1` then `set background to rainbow`
- Add a second IF block: `if page_number = 2` then set a different background.
- Add a third: `if page_number = 3` with yet another background.

- Run the program and click the right arrow. Ask students to predict which background will appear at each click.

**Common misunderstanding to address:**

> "Only ONE of these IF blocks will match at a time. If `page_number` is 2, only the IF block checking for 2 will run. The others just get skipped."

### 8. Duplicating IF Blocks for the Left Arrow

> "Right now the left arrow changes the number but doesn't swap the picture. We need the same IF blocks under the left-arrow event too. Instead of rebuilding them from scratch, we can duplicate them."

- Copy the three IF blocks and place them under the left-arrow event's print block.
- Run and test — students should now be able to navigate forward and backward through images.

---

## Lesson Recap

Before moving to the challenges, review what was new:

| Concept | One-Sentence Summary |
|---|---|
| Importing Costumes | You can add new sprites to your project from the Costume Library. |
| Variable Assignment | Setting a variable to a starting value is called initializing. |
| Print / Debugging | The print block lets you peek at a variable's value while testing. |
| Multiple Events | Each button or action needs its own event block. |
| Increment / Decrement | `change by 1` increases a value; `change by -1` decreases it. |
| IF Blocks | A conditional that checks a condition and only runs code when it is true. |

---

## Challenge Guidance

**Challenge 1 — Swapping Backgrounds:** Students import village backgrounds and recreate the picture-swap behavior using new images. Encourage them to set up the IF blocks themselves rather than copying from the tutorial.

**Challenge 2 — Add Sprites with Text:** Students extend Challenge 1 by making a sprite jump to a specific position on each background change using the `jump to [location]` block with coordinates. Two of the backgrounds should also have the sprite say something about the scene. This previews the location/coordinate work they will do more of in Lesson 3.
