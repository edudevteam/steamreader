---
id: "165af792-a141-427f-a001-3b738f2361b4"
title: "Code.org - Sprite Lab Lesson 2"
subtitle: "Picture Swap"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-01-21"
category: "Tutorial"
tags:
  - code.org
  - sprite lab
  - eduation
  - tutorial
  - blocks
  - coding
  - events
  - counter
  - swapping images

feature_image: "/images/sprite-lab-lesson-2.png"
feature_image_alt: "Picture Swapping"
feature_image_caption: "Picture Swapping"
excerpt: "Learn how to use IF statements to make decisions, display messages with print statements, increase or decrease values using variables, swap images, keep track of counters, and add new assets."
status: published
prev: sprite-lab-lesson-1
next:
---

# Picture Swap (Tutorial)

## Tutorial

Let's learn how to work more with Event Blocks, Add Custom Sprites, Change the value of variable, Print out our changes, work with IF Conditional logic.

### New Project and Set Background

1. In Code.org click `New project +` and select `Sprite Lab`. Then rename the project `L2 Pict Swap`

2. From the `Blocks` toolbar select `World` and drag a `set background to` block under the `when run` block and change it to the `rainbow` background.

> Video

### Import New Costumes

3. Over in the Stage/Canvas you should see the three tabs/buttons: Code, Costumes, Backgrounds.

4. Select: `Costumes`

5. In the `Costumes` menu click the `New Costume` button with giant plus + sign. This will open a pop-up with a bunch of extra sprites you can add.

6. For this lesson in the search field type: arrow.

7. In the results, click on the yellow right and left arrows. Clicking on one will put a checkbox over it. Once you selected both, click the `purple done` button in the bottom right of the popup.

8. You should now see the right and left arrows available in the `Costumes`.

9. Click back onto the Code`button to the left of `Costumes`.

> Video

### Add Left and Right Arrow Sprites

10. From the `Blocks` toolbar select `Sprites` and add under the background the block `make new sprite at`. Change the sprite to the left arrow. Then click on the `yellow block` and position the `arrow sprite` towards the bottom left.

11. Repeat the process for step 10 but choose the right arrow. Position this sprite in the bottom right.

> Video

### New Variable and Assignment

12. In the `Blocks` toolbar select `Variables`. Click the `Create Variable` button. Name the variable `page_number`.

13. Then back in `Blocks > Variables` drag the `set page_number to` block onto the `Workspace` and snap it under the right arrow.

14. In the `Blocks > Math` toolbar find the `0` block and snap it to the end of the `set page_number to` block.

> Video

### Display Variable Value

15. In the `Blocks > Text` toolbar drag the `print` block and snap it under the `set page_number to` block

16. Back in the `Blocks > Text` toolbar grab the double-quotes block with puzzle connector on both sides and snap it to the `print` block. In this block type `Page number: `. Make sure there is a space after the colon.

17. In the `Blocks > Variable` drag a copy of the `page_number` block with only a single side onto the `Workspace` and snap it against the right-side of the double-quotes block.

18. Click the `Run` button to see the text display at the top with the variables value, currently set to `0`.

> Video

### Event: Click Left Button to Decrement

19. From the `Blocks > Events` drag a `when sprite clicked` block onto the `Workspace`. Change the sprite to the `left-arrow`.

20. Then from the `Blocks > Variables` drag and snap in a `change page_number by` block under the event block.

21. In the `Blocks > Math` toolbar drag and snap in the `0` block to the end of the `change page_number by` block. Change the numeber form `0` to `-1` (negative one)

22. Now just like with the last row for the `when run` blocks. Copy that and past it under the `change page_number by` block.

> [print] [Page number: ] [page_number]

23. Click the `Run` button and click on the `left-arrow`. You should see the Page number at the top start decreasing.

> Video

### Event: Click Right Button to Increment

24. Now let's repeat the steps for the `left-arrow`.

25. What you will change is: Set sprite to the `right arrow`

26. Change `change page_number by` number `-1` to just `1` remove the minus sign.

27. Click the `Run` button and click each arrow to see the number increase when you click the right arrow and decrease when you click the left arrow.

> Video

### Background Swap / IF Blocks

Now let's learn about conditional logic also commonly referred to as `if` blocks.

28. From the `Blocks > Logic` toolbar select `if counter = [ ]` empty block. Drag this block under the print block for the `Right Arrow` event.

29. Click on the word `counter` in the `if` block and select `page_number`.

30. From the `Blocks > Math` toolbar snap a `0` block inside the empty block space in the `if` block and change the number to `1`.

31. From the `Blocks > World` toolbar drag and snap a `set background to` block inside the `if` block. Change the background to the `rainbow`.

32. If you click the `Run` button nothing will happen yet.

> Video

### Repeat IF Blocks for Left Arrow

33. Under the `if` block add another `if` block where with variable = `page_number` and number set to `2`. Then change the background to something else than the rainbow.

34. Repeat this step once more with the `if` block. Set the variable to `page_number`. Set the number to `3`. Change the background to something you are currently not using.

35. Click the `Run` button. When clicking the `left-arrow` nothing happens. But when clicking the `right-arrow` you will see the pictures change when the `page_number` value is equal to the number set in the `if` block.

> Video

36. Duplicate exactly the three `if` blocks and place them under the `left-arrow` event `print` block.

37. Now when you click the `Run` button you can navigate back and forth through the images by clicking either arrow.

> Video

## Challenge

The challenge for this project is...
