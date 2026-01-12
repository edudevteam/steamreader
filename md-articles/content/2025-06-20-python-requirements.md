---
title: 'Creating the Python requirements.txt'
subtitle: 'Making code portal and reusable'
author: 'Ryan Jones'
author_slug: 'ryan-jones'
date: '2025-06-24'
category: 'Technology'
tags:
  - education
  - tutorial
  - coding
  - python
  - venv
  - virtual environment
  - pip
feature_image: '/images/python-generating-requirements-file.png'
feature_image_alt: 'python generating requirements TXT file'
feature_image_caption: 'Graphic by FundedYouth'
excerpt: "It's not enough to create a `venv` for a python project. You also need an easy way to download the correct libraries using the `pip` command. That's where the requirements.txt document comes into play."
status: published
prev: python-requirements
validated_tutorial: true
---

The `requirements.txt` has two major benefits.

1. It tells other developers which libraries your application needs.
2. Instead of installing libraries one by one, you can install them all at once with:

```bash
$ pip install -r requirements.txt
```

## Tutorial

1. Create a new project folder

For this tutorial, we’ll call it `python_requirements`, but you can name it anything.

2. Change into the new project directory, install a new virutal environment, and activate it.

```bash
$ cd python_requirements
$ python -m venv venv
# Mac and Linux
$ source venv/bin/activate
# Windows users run a different command
$ .\bubble\Scripts\activate
```

3. Install the following libraries using pip.

```bash
$ pip install pyjokes
$ pip install quoters
$ pip install random_word
```

4. Create a new app called `app.py` and import the three libraries into the app.

> I’m going to use nano for this example but you could easily use an IDE like VS Code.

```bash
$ nano app.py
```

```python
from quoters import Quote
from random_word import RandomWords
import pyjokes

print("hello")
```

### Create "requirments.txt" the standard way

5. In a terminal within the project/app directory run the command:

```bash
pip freeze > requirements.txt
```

This command will add all the libraries to the requirements.txt. From the imported libraries used to the dependencies, etc.

### (alternative) - Only used libraries requirements.txt

5. Install the library `pipreqs`

```bash
$ pip install pipreqs
```

6. The run the command:

```bash
# if you are in the project directory, then just run pipreqs
$ pipreqs /path/to/your/project

# for this project, I was in the project directory so I ran:
$ pipreqs
```

7. Running this command will generate the `requirements.txt` with only the libraries imported / used in the project.

```bash
pyjokes==0.8.3
quoters==0.30
random_word==1.0.13
```

## 🎉 Congrats

You now know how to generate a `requirements.txt` which will help with future personal and team projects.
