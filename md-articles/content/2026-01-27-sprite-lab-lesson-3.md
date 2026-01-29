---
id: "bbeed3a9-873b-41c1-a3c1-411356ed6b6c"
title: "Code.org - Sprite Lab Lesson 3"
subtitle: "The Bug Catcher"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-01-22"
category: "Tutorial"
tags:
  - functions
  - show / hide
  - code.org
  - background libarary
  - sprite library
  - import
  - sprite lab
  - variables
  - counters
  - location block
  - reuse logic
  - coding
  - tutorial

feature_image: "/images/sprite-lab-lesson-3.png"
feature_image_alt: "The Bug Catcher"
feature_image_caption: "Re-using Functions"
excerpt: "Clean up your logic from Lesson 2 by adding functions to make your code easier to re-use. You will learn how to use IF statements to help your program make smart decisions, display messages to your players with print statements, and use variables to increase or decrease values like scores or health. We will also cover how to swap images to change how characters look, keep track of clicks using counters, and add exciting new assets to build your very own interactive story."
status: published
prev: sprite-lab-lesson-2
next:
---

# The Bug Catcher

## 📌 Lesson Objectives

- `Functions`: Re-usable custom blocks
- More practice with the `Location Block`
- Import backgrounds from the `Background Library`
- Learn how to `show / hide` a sprite
- Multiple Event `Listener` blocks
- Continue using the `Print` block for Testing
- Keep track of a variable's `count`
- More practice with `IF Blocks`

## 🚀 Tutorial

We're going to speed up the text description since most of this has been covered.

1. Let's start this off by creating a New `Sprite Lab` project named:

> L3 - The Bug Catcher

### Import Backgrounds

2. Now, above the the `Stage/Canvas` find and click the `Backgrounds` button/tab.

3. Click on the `New Background +` button.

4. In the pop-up search `Village`. Five images should appear. Select each one. then click `Done`.

5. Click the `Code` button to go back to your `Stage/Canvas`

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/M-bns8NrWjw" frameborder="0" allowfullscreen></iframe>
</figure>

### Import Costumes

6. Set the first scene by snapping a `Blocks > World > set to background` block under the `when run` block.

7. Change the background to one of the Village backgrounds with imported.

8. Click on the `Costumes` button above the `Stage/Canvas` and select: `New Costume +` and search for `Pig`. Find and select the `Pig with Axe`.

9. Again, Click on the `Costumes` button and select: `New Costume +` and search for `bugs`. Add 5 bugs, click `Done`, then click back on the `Code` button to back to your `Stage/Canvas`.

10. Once more let's a new costume. Type: `Start` and select the black `start` button. Click `Done` and then click the `Code` button to go back to the `Canvas/Stage`

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/aHpiz2Z0nWY" frameborder="0" allowfullscreen></iframe>
</figure>

### Set the stage

11. Let's add two sprites.

12. First, add the `Start` button place it in around the center of the canvas.

13. Second, add the `Pig with Axe` sprite down towards the bottom of the dirt path.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/q-tkXkcFgyE" frameborder="0" allowfullscreen></iframe>
</figure>

### On-Click Hide Sprite - Event Block

14. Add a new `when [sprite] clicked` event block. Change it to the `Start` button block.

15. Then snap a `Blocks > Sprites > remove [sprite]` block under the `when [sprite] clicked` event block and change it to the `Start` button block.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/1FqhuMhw4u4" frameborder="0" allowfullscreen></iframe>
</figure>

### Functions

> functions are basically containers that run a set of action or blocks and can be re-used over and over.

16. To get a feel for functions let's create one for backgrounds using `IF Blocks` like we did lesson 2.

17. Grab the block: `Blocks > Variables > set [counter] to` and snap it under the `pig sprite`

18. Then snap a `Blocks > Math > [0]` block to the `set [counter] to` block.

19. Add a print block with double quotes and the counter variable so it says the following on the `Stage/Canvas`. [print]["counter"][counter]

> counter = 0

20. Now click on the `Blocks > Functions > Create a Function` and name it `scene_1`

21. Inside this new block add a `Blocks > Logic > if [counter] = [ ]` block inside this function.

22. Snap a `Blocks > Math > [0]` block after the equal sign in the empty space.

23. Inside the `if block` add a `set background to` block and change the image to the first village background.

24. Then click the `Close` button to back to the workspace.

25. Drag and snap the `Blocks > Functions > scene_1` block under the `remove sprite` block.

26. Duplicate the print line blocks and add it under `scene_1` block. Click the `Run` button and press the `Start` block. This should set the counter value to `0` and change the background.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/10Ez5kCWdMA" frameborder="0" allowfullscreen></iframe>
</figure>

27. Let's continue practicing with functions by first clicking on the `edit` button on the function `scene_1` in the `Workspace`.

28. Now add a `Lady bug` sprite under the background and also include a `set [Lady Bug] size to [50]` under the sprite block. This block is found in `Blocks > Sprites`

29. Now position the `Lady bug` sprite. You won't be able to see it but put it on the fence towards the bottom-left. - Click the `Close` button to go back to the `Workspace`.

30. From the `Blocks > Events` add a `When [sprite] clicked` block to the `Workspace` and change the sprite to the `Lady Bug`.

31. From the `Blocks > Sprites` snap under the event block the `remove [sprite]` block and set it to the `Lady Bug`.

```txt
Test it out by clicking the Run button.
Then click the Start
Then click the Lady Bug. It should disappear.
```

32. From the `Blocks > Variables` snap a `change counter by` block under the `remove [Lady Bug]` block and then from the `Blocks > Math` toolbar add a `[0]` block to it and chang the number to 1.

33. Below this block add a copy of the `[print]["counter = "][counter]` blocks. This will display the updated value on the `Stage/Canvas`

34. Let's create a new Function called: `scene_2`

35. In the `scene_2` function add an `if counter = [ ]` block. Then from the `Blocks > Math` put the `[0]` block in the empty space and change the number to `[1]`.

36. Now inside the `if block` add a `set background to` block and change the background to the `second village` image. Click the `Close` button and test it out.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/nuqPLqN22qw" frameborder="0" allowfullscreen></iframe>
</figure>

37. Repeat the process for each bug you add. Take a look at the videos below.

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/UAoFNTxCOgc" frameborder="0" allowfullscreen></iframe>
</figure>

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/LXaHVjaZpho" frameborder="0" allowfullscreen></iframe>
</figure>

38. This ends the lesson.

## 🧩 Challenge

### Move the Piggy

> Video: 09 - Challenge Complete

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/W8GK6VCuqKc" frameborder="0" allowfullscreen></iframe>
</figure>

1. At the top of the Lesson 2 Sprite Lab project click the `Remix` button and rename it `L3C1 - Move the Piggy`
2. Now that all the functions exist, your next task is to make the pig sprite move to different locations on the ground for each new background change.

> Hint: to move the pig sprite try using the `[sprite] jump to [random location]` but replace the random location with actual coordiates.

> Video: 10 location x,y block

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/zdzbkQDapzo" frameborder="0" allowfullscreen></iframe>
</figure>

### Remove Print Blocks

> Video: 11 Piggy Hints

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/9F30XueFGR4" frameborder="0" allowfullscreen></iframe>
</figure>

1. Once you complete challenge 1: Move the Piggy.
2. Remove all the: print blocks so that the number value for the counter doesn't display on the stage.
3. Now for each scene have the pig save something like: "Can you find the Lady Bug"... do this for every bug.
4. Finally, add an event block for the last bug when you click it. Have the pig say... "Yay, you caught all the bugs!"
