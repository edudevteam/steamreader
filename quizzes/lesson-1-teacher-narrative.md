# Lesson 1: Chatting with Sprites — Teacher Narrative

## Project: L1 Chatting with Sprites

---

## Before You Begin

This is the students' very first coding lesson. Many of them have never opened a code editor before. Keep the energy positive and remind them that making mistakes is part of learning. The goal is to get them comfortable with the environment and introduce a handful of foundational ideas they will build on in every lesson after this.

---

## Key Concepts to Explain During Class

### 1. The Stage / Canvas

> "The Stage is like a TV screen for your project. Everything you build — your backgrounds, your characters — shows up here. When we hit Run, the Stage is where the magic happens."

- Point out the Stage area in the Sprite Lab interface.
- Let students know this is where they will see the results of their code.

### 2. Backgrounds

> "A background is like the scenery in a movie. Before actors walk on stage, someone has to set up what the audience sees behind them."

- Show students how to drag the `set background to` block from the World category.
- Emphasize that the background block goes under the `when run` block — this means it happens as soon as the program starts.
- This is a good time to introduce the idea of **sequence**: code runs from top to bottom, one step at a time.

### 3. Sprites

> "A sprite is any character or object you put on the screen. It could be a dog, a spaceship, or even a button. If it shows up on the Stage, it's a sprite."

- Show how to add a sprite using the Sprites category.
- Demonstrate changing which sprite appears (e.g., switching the bunny to a dog).
- Show how to reposition the sprite by clicking the location pin.

### 4. Variables

> "A variable is like a labeled box. You give it a name — like `player_name` — and you can put information inside it. Later, you can open that box and use whatever is inside."

- This is often the trickiest concept for beginners. Use a physical analogy if possible (hold up a sticky note with a name on it, put it in an envelope labeled `player_name`).
- Walk through creating a variable and renaming it from the default `???` to `player_name`.
- Stress that the variable **stores** whatever the user types in — it remembers it for later.

### 5. User Input (Prompts)

> "A prompt is when your program asks the user a question and waits for them to answer. Whatever they type gets saved inside the variable."

- Show the `prompt user for variable` block.
- Type the question `What is your name?` inside the prompt.
- Run the program and show that the sprite asks the question, but nothing happens yet when you type — that comes next with events.

### 6. Events

> "An event is something that triggers your code to run. Think of it like a doorbell — when someone presses it, the bell rings. In coding, when a certain thing happens, the code connected to that event runs."

- Explain that the `when run` block is itself an event — it fires when the program starts.
- Introduce the `when [variable] answered` event block. This one fires after the user types their answer and presses enter.
- Make sure students understand that without this event, the program has no way to know when the user is done typing.

### 7. Displaying Text (Sprite Say Block)

> "Once we have the player's name saved in a variable, we can make the sprite talk back to them."

- Show the `[sprite] say [text] for [seconds]` block.
- Change the sprite to the dog and increase the seconds so students have time to read it.

### 8. Concatenation (Joining Text)

> "Concatenation is a big word that means joining things together. If I want the dog to say 'Hi Ryan' instead of just 'Hi', I need to join the word 'Hi ' with whatever is stored in the `player_name` variable."

- Show the double-quotes joining block from the Text category.
- Snap `"Hi "` on the left and the `player_name` variable on the right.
- Emphasize the space after "Hi " — without it the output would read "HiRyan."
- Run the program and let students see their name appear on screen. This is usually the moment they get excited.

---

## Sequence Reminder

Before moving to the challenge, recap the order of what they built:

1. Set a background (World block)
2. Add a sprite (Sprites block)
3. Ask the user a question and store the answer in a variable (prompt block)
4. Wait for the answer (event block)
5. Display a response using the variable (say block with concatenation)

> "Notice how every step depends on the one before it. That order matters — it's called **sequence**, and it is one of the most important ideas in all of coding."

---

## Challenge Guidance

The challenge asks students to create a scene where two sprites look like they are chatting. Remind them they need:

- A background
- Two sprites placed in different positions
- A user prompt that stores input in a variable
- At least one sprite displaying output using that variable

Encourage creativity — they can pick any sprites, any background, and ask any question they like.
