---
id: "ad97e8e5-5b46-4e73-a803-d675a2243d95"
title: "Code.org - Sprite Lab Lesson 4"
subtitle: "Behaviors, Conditions, and Interaction"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-01-30"
category: "Tutorial"
tags:
  - tutorial
  - code.org
  - sprite lab
  - functions
  - logical operators
  - conditional operators
  - if blocks
  - event blocks
  - grid mapping
  - behaviors
  - game development
  - costume graphics

feature_image: "/images/sprite-lab-lesson-4.png"
feature_image_alt: "Lesson 4 Maze Maker"
feature_image_caption: "Maze Maker"
excerpt: "In this tutorial, you’ll learn how to build a maze-style game while exploring some powerful programming ideas along the way. You’ll practice using behaviors and review how event blocks work, then learn how to make the most of the grid to design your game world. As you build, you’ll add conditional logic that lets sprites react when they interact with each other, display information on the screen, and play sounds at the right moments. You’ll also learn how logical operators help your game make smarter decisions, bringing everything together into a fun and interactive experience."
status: published
prev: sprite-lab-lesson-3
next: sprite-lab-lesson-5
---

# Sprite Lab Lesson 4

## 📌 Lesson Objectives

- `Logical Operators`: True, False, Equal, Not Equal, Greater Than, Less Than, etc.
- `Behaviors`: Move a sprite around the Stage/Canvas with arrow keys
- `Grids`: Make custom mazes
- `Events`: Trigger actions when sprites interact with other sprites
- `Custom Graphics`: Import Sprites and Modify Existing Ones.
- `Review`: Functions, Variables, Events, and IF Blocks

## 🚀 Tutorial - Maze Level 1

### Maze Maker Game

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/JFwrgNe4naU" frameborder="0" allowfullscreen></iframe>
</figure>

1. Create a new Sprite Lab project called: `Maze Maker`

2. Snap a `set background to` block `Blocks > World` under `when run` and choose the `grid` background.

3. Click on the `Costumes` button/tab above the `Stage/Canvas`.

4. In the popup select `Video Games` and scroll-down towards the bottom until you see the start button. Find two fully filled blocks that could be used as a background. They should contrast well. Easy to see the see the difference between the two.

### Using the Grid

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/Gb8m65Wgs8o" frameborder="0" allowfullscreen></iframe>
</figure>

5. From the `Blocks > Sprites` add the block: `make sprite using grid`

6. Change the sprite to the basic `gray block` sprite we imported.

7. To the right of the word `grid` is a grid block. Click this and click all of the boxes one-by-one.

### Making the the maze

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/FDC47JuPxds" frameborder="0" allowfullscreen></iframe>
</figure>

8. Used the other costume we imported add another `make sprite using grid` block and create a simple maze.

9. This will place this block over the top of the first grid.

10. Create a simple path like video below or make your own path.

### Create Player Sprite Function

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/RHY2O7x60zk" frameborder="0" allowfullscreen></iframe>
</figure>

11. Let's create a reusable sprite function called `player`, don't add anything yet. Instead snap the new function block under the `make sprites using grid` with the brown clusters.

12. Now under Costumes add a new Character. I am using the `Elven Paladin` found in the `Fantasy Characters` collection.

13. Now below my function `Player` in the `Workspace` add the `make new sprite at` and the `set sprite size to` blocks. Change the sprite for both of these blocks to the character you selected: `Elven Paladin`.

14. Change the size of the sprite to `[30]`

15. Click on the `location` block `pin` and move the sprite to the top-left to define the starting position.

16. Let's move these two blocks into the `player` function.

17. Right-click on the `make new sprite at` block and select `copy`. Then click on the `Edit` button the `player` function in the `Workspace`. Right-click in `Function Workspace` and select `paste`. Move the block into the function.

18. Close the `Function Workspace` and repeat step 17 for `set sprite size to` block.

19. Back in the `Main Workspace` remove the original blocks `make new sprite at` and `set sprite size to`. The function `player` should be positioned correctly.

### Create Exit Sprite Function

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/dmQ8DBu9eDY" frameborder="0" allowfullscreen></iframe>
</figure>

20. Create a `custom costume sprite` by clicking on the `Costumes` button above the `Stage/Canvas`. Select the `Video Games` collection and scroll to the bottom.

21. Select the `Dark Wood` box and click `Done`.

22. In the Costume's Editor with our new costume selected, click on the tool `Filled Rectangle Tool`.

23. Then in the bottom-right of the sprite, click and drag-up about 2/3-rds towards the top-left making a black-hole in the sprite.

24. Change the color of the `foreground` to a similar `brown`. Using the the `Filled Rectangle Tool` again build three rectangles that look like steps.

25. Switch back to the `Code` Workspace and create a new function called: `exit`

26. Let's repeat the process for positioning our new costume `stairs` sprite with a set size of `[50]` to the end of the path.

27. Now move the blocks for this into the `exit` function

> Hint: If the function is snapped, you can actually switch to the `Function Workspace` and just add the blocks there first. Then within the function click on the location block and it lets you move the sprite around.

### Add Player Movement with Behaviors

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/yL1g77epR6Y" frameborder="0" allowfullscreen></iframe>
</figure>

28. From the `Events` blocks add a `when up pressed` block to the `Workspace`

29. From the `Behaviors` blocks add and snap in a `sprite begins` block under the `when up pressed` event block. - Change the sprite to our chosen character: `Eleven Paladin`.

30. From the `Behaviors` blocks add and snap the `moving with arrow keys` after the `begins` keyword.

31. Test it out. Click the `Run` button. Then click the `up` arrow once to activate the `event` block. Now move the sprite around with the arrow keys.

### Create Health Points and Visually Track

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/rV0tKbpWp44" frameborder="0" allowfullscreen></iframe>
</figure>

32. Now that our sprite can move around. We want it to stay on the path. So let's add a negative effect if the player goes off the path.

33. In the `Blocks > Variables` create a new variable called `health`

34. Add the block `set mySprite to` under the `exit` function block and change it to `health`.

35. In the `Blocks > Math` snap the `[0]` block to the `set health to` block and change the number to `3`.

36. We need a way to see our health points. We could use the `print block` but there is better solution for this. Under `Blocks > Variables` find the `show variable counter at [(200,200)]` block and snap it under the `set health to [3]` block and change the `counter` to `health`

37. Click the `pin` on the `location` block and move the `health: 3` display block to the bottom right. So it is not hiding the path.

### Subtract Health Points

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/nkodoUNizMw" frameborder="0" allowfullscreen></iframe>
</figure>

30. Let's add negative points for going off the path.

31. From `Blocks > Events` add the block `when sprite touches sprite` to the `Workspace`.

32. Change the first sprite to your `player's sprite` costume and change the second sprite to the `brown block with green rocks` costume.

33. Under this block snap in a `Blocks > Variables > change counter by 1` block.

34. Change `counter` to `health` and from the `Blocks > Math` snap in `[0]` block over the `[1]` and change the value to `[-1]`

35. Run the code, press space bar, move the player with the arrow keys, try moving over the gray blocks with rocks, and watch the health decrease.

### Can you Exit the Maze ?

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/7PBaXrXzU4k" frameborder="0" allowfullscreen></iframe>
</figure>

36. For the player to exit their health needs to be above 0. So let's set a condition where the player must have at least a health point of 1 or greater.

37. From `Blocks > Events` add another `when sprite touches sprite` block to the `Workspace`

38. Set the first sprite to your `player's` costume and the second the sprite to the `target` costume.

39. Below this block, from the `Blocks > Logic` add the block `if [] = [] do`.

40. Change the `=` sign to the `>` which means greater than.

41. In the first empty block on the left, from the `Blocks > Variables` snap in the `health` block.

42. In the second empty block on the right, from the `Blocks > Math` snap in the `[0]` block and keep it at `[0]`.

43. Inside the if block after `do`:

44. From the `Sprite` blocks add a `remove sprite` and select your sprites costume.

45. From `World` blocks add the `play sound` block and select the second sound to the right in the top row.

46. Run the program, move the player, and if the health is above (greater than) 0, then the sound should play and the player will disappear into the next maze.

## 🧩 Challenge 1

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/lXlyFiPe-c4" frameborder="0" allowfullscreen></iframe>
</figure>

1. Create a new function called `level_1`

2. Move the sprite grids, the function exit, and function player into `level_1` function

3. Put `level_1` under the `set background to` block on the `Workspace` replacing the blocks containing the grids with sprites and functions.

## 🚀 Tutorial - Maze Level 2

### Design Maze Level 2

> We are going to speed up descriptions for topics that have already been covered.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/o424rNVSP3w" frameborder="0" allowfullscreen></iframe>
</figure>

1. Let's create a second maze level

2. Create a new function called `level_2` and close this.

3. Now on the `Workspace` below the `level_1` block, from the `Blocks > Sprites` add two: `make sprites using grid` blocks.

4. Fill the first background by highlighting all the grid blocks and change the sprite to a different sprite block like water.

5. For the second block change the sprite to something else like `wood` which you can get from the `Custom` library.

6. Create a new maze field. There needs to be a start and endpoint.

### Add Logic to Level 2 Function

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/O4EvKIo14mQ" frameborder="0" allowfullscreen></iframe>
</figure>

7. Once you have your new maze designed. Add the `exit` and `player` function blocks below the sprite grids. Put one in starting postion and the other in the ending postion.

8. Place the `level_2` function after the `level_1` function in the `Workspace`

9. Now move all these new sprites and functions into the `level_2` function and remove all the sprites.

> You can easily copy or cut a sprite by right-clicking on it and select cut or copy from the pop-up for faster development.

### Fixing Broken Sprite Positions

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/ZoT-UfFeEBs" frameborder="0" allowfullscreen></iframe>
</figure>

11. We moved the sprite positions for the player and exit inside `level_2` and it looks okay. But... if we unsnap the `level_2` function it shows that it moved the sprites for `level_1` function also and this doesn't work!

12. To resolve this we need a way to keep track of which level is active. So, let's create a new variable called `level_count`

13. Add the block `set counter to` the `Workspace` under the `set background to` block under `when run`.

14. Then add a `[0]` Math block and set it's value to `1`.

15. Make sure you change `counter` to `level_count`

16. On our `Workspace` un-snap the `level_2` function and let it float around.

17. Now reset the Sprite location for the `player` and `exit` functions.

18. Let's add some conditional logic to both the `player` and `exit` functions to test if the `level_count` is on `map 1` or `map 2`

19. `Edit` the `player` function.

20. In the `player` function add the block `if counter = []`. Change `counter` to `level_count` and place a `Math` number block `[0]` to the right of the `=` equal sign in the empty block spot.

21. Change the number from `[0]` to `[1]`

22. Move the `make new sprite at` and `set sprite size to [30]` blocks inside the `if level_select = [1]` block.

23. Duplicate the entire `if level_select = [1]` block with the code inside it and place it below. Then change the `[1]` to `[2]`

24. Close the function editor. Back on the `Main Workspace` change the block `set level_count to [2]` and make sure the `level_2` function is snapped under `level_1`.

25. `Edit` the `player` function again.

26. Click on the `pin location` on the `make new sprite at` block in the second `if` block and reposition the sprite like in the video.

27. Apply the same configuration for the `exit` function. You will need change the `set level_count to` block between `[1]` and `[2]` to correctly position.

### Create Levels Swapping Function

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/gw7hghxtBJE" frameborder="0" allowfullscreen></iframe>
</figure>

> Now that we have the sprites correctly positioned based on the `sprite_count` we need to make sure the correct maze level shows.

28. Create a new function called `levels` and then click close.

29. Remove the function blocks: `level_1`, `level_2`, `player`, and `exit`.

30. Add the function block: `levels` and click on the `Edit` button.

31. Back in the `levels` Workspace click add two `if counter = []` blocks and change to the variable `level_count`.

32. Add a `Math` number block `[0]` to both.

33. Change the first `Math` number block to `[1]` and the second number block to `[2]`

34. In the first `if` block add the function `level_1` and in the second `if` block add the fuction `level_2` and close.

35. Now, back on the `Main Workspace` switch number on the block `set level_count to` from 1 to 2. You should see the maps swap.

### Change Maps on Exit

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/6wAA2ikLevc" frameborder="0" allowfullscreen></iframe>
</figure>

36. In the `if` block under the `event` block `when sprite (character) touches sprite (exit)` from `Variables` add the block `change counter by [1]`.

37. Change `counter` to `level_count`

38. Add a `Math` number block and set it to `[1]`

39. Below this block snap a copy of the `levels` function block.

### Map 2 Bug - All Movement is bad 😱

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/Vk9wgXUHD7U" frameborder="0" allowfullscreen></iframe>
</figure>

> You might notice that even though the maps switches, the player and exit sprites show up in the correct location, but when you move the player on Map 2, your health goes down. Why...?

> The reason is that we never removed the Map 1 field, it's just below Map 2 on the Stage/Canvas.

30. Create a new function called `remove_level_1` and then inside of it place two `remove sprite` blocks.

31. Set first block to the `green rock` sprite and the second to the `gray path` sprite.

32. Now in the `levels` function inside the `if level_count = 2` block, just above `level_2` put the `remove_level_1` function block.

> It must go above the level_2. So it clears out the sprites first.

33. Now test the game again. it should work this time. Except Map 2 lets you travel anywhere with an issue.

### Map 2 Bug - Negative Water Everywhere

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/NbCQlHWsfAE" frameborder="0" allowfullscreen></iframe>
</figure>

34. Add a new `Event` block: `when sprite touch sprite` and include the block `change health by [-1]`.

35. Change the first sprite to your `character` and the second to the `water`.

> Depending on how you setup the map it might work or it might have an issue like this example where you lose health even on the `Wood` sprites.

36. Go back into your `level_2` sprites and modify your path so the wood is first and set to the full background.

37. Then change the water so that is goes on the outside forming the path we had before.

> I'd recommend watching the video for good example.

## 🧩 Challenge 2

### Add Health Points

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/KtmSGEyoLeA" frameborder="0" allowfullscreen></iframe>
</figure>

1. Add a `Gold Coin` sprite onto Map Level 2 and place it to the bottom right of the map on the wood.

2. When the player sprite touches the `Gold Coin` sprite it should disappear, add 2 points to health, and make a positive sound (your choice).

### Map Level 3

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/f6wieWFb6XU" frameborder="0" allowfullscreen></iframe>
</figure>

3. Use all the knowledge you've gained so far to create another map. So when the player reaches the exit on Level 2, Map Level 3 shows, Map Level 2 is removed, the sprites are moved to different locations and for this Map make it harder and include two bonus coins that each give plus two points of health.

### Bonus Challenge

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/UNpIC2yc7sU" frameborder="0" allowfullscreen></iframe>
</figure>

4. Add a `Fire Spirit Sprite`to the Map Level 3 that uses the Behviors to automatically move around. If the `Fire Spirit` sprite touches the Player, the player loses 1 health point.

5. Set the `level_count` to `0`, add a Title, and a start button sprite. When I click the `Start` button, remove the title, remove the start button, the player can move, and map level 1 shows.

6. If the `health` is equal to or less than zero, change the stairs costume to a box blocking off the route and do something to let the player know they failed, like turning them into a wandering ghost.
