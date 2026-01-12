---
title: 'Python Virtual Environments'
subtitle: 'Why it is absolutely necessary to work in a virtual environment'
author: 'Ryan Jones'
author_slug: 'ryan-jones'
date: '2025-06-20'
category: 'Technology'
tags:
  - education
  - tutorial
  - coding
  - python
  - venv
  - virtual environment
feature_image: '/images/python-virtual-environments-banner.png'
feature_image_alt: 'python virtual environments'
feature_image_caption: 'Python (venv) virtual environments'
excerpt: 'What to keep your Python projects clean, organized, and bug-free? Learn how to create a "magic coding button" aka. (virtual environment) that keeps your tools seperate and your code happy.'
status: published
next: python-virtual-environments
validated_tutorial: true
---

## What’s a Virtual Environment?

Imagine you’re building with LEGOs. You have one project that needs all <span style="color:red;">red bricks</span>, and another that needs <span style="color:blue;">blue ones</span>. What if the bricks got mixed up?

That would be a mess, right? 🤪

That’s why **Python gives you a magic bubble** — called a **virtual environment** — where you can keep all your special bricks (code tools and libraries) safe for just one project.

### Why make a Virtual Environment (Python Bubble)?

Here’s why it’s super smart:

- 🧩 Each Project Gets its Own Tools
  You can build different things with different blocks — no more mixing red and blue!
- 🧼 Keep Your Coding Desk Clean
  Don’t let every toy out at once. Only open what you need.
- 🔁 Share Your Projects Easily
  When you share your code with a friend, you can also give them the list of tools you used — so it works the same way on their computer.

## Let’s Make Your First Virtual Environment (Python Bubble)!

1. Open the Coding Door (a.k.a. Terminal)

> On your computer, open the Terminal (on Mac) or Command Prompt (on Windows). It looks like a black screen with text.

2. Check if python is installed

```bash
# Windows Users
python --version

# Mac and Linux Users
python --version
# or
python3 --version
```

You should see something like `python 3.11.5` in your output. The number/version might be different. But you want at least `version 3`

If python doesn’t appear to be installed, you can get a free copy from their website: [python.org](https://www.python.org/downloads/)

3. Before we make our magic bubble (virtual environment) we need to create a new project folder. In your terminal or command prompt type: (we recommend you be in your documents directory)

```bash
mkdir magic_bubble
```

> mkdir: this mean make directory

4. Create your magic bubble 🫧

```bash
python -m venv venv
# or
python3 -m venv venv
```

This makes a new folder called `venv` where all your project’s magic tools will live.

5. Jump inside the Bubble and activate 🪄

To use your bubble (virtual environment), you have to “activate” it.

🍎 Mac + 🐧 Linux:

```bash
source bubble/bin/activate
```

🪟 On Windows:

```bash
.\bubble\Scripts\activate
```

You’ll know it worked when your terminal shows something like this:

```bash
(venv) # or whatever you named the virtual environment
```

Cool! You’re inside your virtual environment (bubble)!

### 🎉 You Did It!

You just made your first Python virtual environment (bubble)! You’re now ready to create clean, organized, new Python applications.

## Testing

Now that we have the virtual environment running. Let’s start by testing out a custom package. For this test we will use the library: `pyjokes`

1. In your project directory with your virtual enviornment activated install `pyjokes` by typing:

```bash
# (venv) $ = is the activated virtual environment. Do not type that.
(venv) $ pip install pyjokes
```

2. Once it is installed let’s create a new simple python app. You can use either the command line or an Integrated Development Environment (IDE). - I will be using the free tool [VSCode](https://code.visualstudio.com/)

3. In VSCode you might have to open the `terminal` again re-activate your virtual environment.

4. In your project directory create a file called: `app.py`

5. Then in your `app.py` file type the following:

```bash
import pyjokes

print(pyjokes.get_joke())
```

6. Back in your terminal type: `python app.py`

This should output a random joke in your terminal. You can run this over and over to get a new joke each time.

7. Let’s `deactivate` the virtual environment. In your terminal type:

```bash
deactivate
```

This should remove the text `(venv)` in your terminal.

8. Now try running your app again. It should fail because the `pyjokes` library is not installed in your global environment. It was only installed in your virtual environment.

> It is recommended that you always create a new virtual environment for each new project/application.

The final process is to create `requirements.txt` file that contains all the libraries needed for the project to run.
