---
id: "606374b8-f8ba-4e0f-9148-5ca337774470"
title: "Code.org - Sprite Lab Lesson 1"
subtitle: "Chatting with Sprites"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-01-20"
category: "Tutorial"
tags:
  - sprite lab
  - education
  - coding
  - blocks
  - variables
  - events
  - chat
  - code.org

feature_image: "/images/sprite-lab-lesson-1.png"
feature_image_alt: "Chatting with Sprites"
feature_image_caption: ""
excerpt: "Learn how to add backgrounds and sprites, ask users for input, save their responses with variables, and make things happen using events."
status: published
prev: sprite-lab-new-project
next: sprite-lab-lesson-2
---

# Chatting with Sprites (Tutorial)

## Tutorial

For this first section you will be learn how to make it look like characters are chatting with you. This is an absolute beginner. You will learn how to add backgrounds, create something called variables and store information in the variable, re-use the variable, get a basic introduction to events, and learn how to use something called prompts.

### Rename

1. In Sprite Lab, click `New project +` and select `Sprite Lab`

2. Rename the project to: `L1 Chatting with Sprites`

> Video

### Change Background

3. From the `Blocks` toolbar click on `World` and drag and snap a `set background to` block to under the the `when run` block.

4. Then change the background to the `rainbow`

> Video

### Add Sprite

5. From the `Blocks` toolbar select `Sprites`. Then drag and snap a `make new sprite at` block with the bunny under the world block.

6. Click the `bunny` sprite and select the `dog`. Then click on the `yellow` block attached at the end of the sprite block to move the sprite onto the first mound in the picture.

> Video

### Prompt and Variables

7. In the `Blocks` toolbar select `World` and find the `prompt user for variable` block. Drag this and snap it under the sprite block.

8. After the words `prompt user` you should see a block with double quotes. Inside this block type: `What is your name?`

9. Then below this after the text `for variable` click on the three `???` question marks and select `Rename this variable`

10. In the pop-up type: `player_name`

11. Now click the `Run` button under the Stage/Canvas. You should see the dog sprite say `What is your name?` but typing does nothing yet.

> Video

### Events and Response

12. In the `Blocks` toolbar click on `Events`. Drag a `when ??? answered` on to the `Workspace`

13. Click the `???` and select `player_name`

14. In the `Blocks` toolbar click `Sprites`. Then drag a `[Sprite] say [Hello, world] for 4 [seconds]` block and snap it under the `when player_name answered` block.

15. Change the sprite to the `dog`. Change the number `4` to the number `10`.

16. In the `Blocks` toolbar click `Text`. Find the double-quotes "" block which looks like it can attach front and back. Drag and drop this block over the `Hello, world` block. Type: `Hi ` and make sure to include a space after "Hi ".

17. In the `Blocks` toolbar click `Variables`. Find the `player_name` variable block and snap it after double-quotes `Hi ` block.

18. Click the `Run` button, type your name and watch the `dog` respond.

> Video

## Challenge

The challenge is...
