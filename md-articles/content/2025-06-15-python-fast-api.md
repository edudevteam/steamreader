---
id: "c9e4a2b1-5f8d-4e3a-9c7b-8d6e5f4a3b2c"
title: "Create a Python FastAPI Server"
subtitle: "Building a local web REST API"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2025-06-15"
category: "Technology"
tags:
  - education
  - tutorial
  - coding
  - python
  - rest api
  - fastapi
  - server
  - insomnia
  - postman
  - venv
feature_image: "/images/fast-api-tutorial-up-and-running-locally.png"
feature_image_alt: "Python Fast API Tutorial"
feature_image_caption: "Python Fast API Tutorial"
excerpt: "A guided step-by-step tutorial shows how Web API's work. You will learn how to use API tools to get data nd even build yoru own web api using python."
status: published
prev: python-venv
validated_tutorial: true
---

## Building a Simple API with Python

A guided step-by-step tutorial that shows how Web API’s work. You’ll learn how to use API Tools to get data and even build your own web api using python.

### What is an API

API stands for Application Programming Interface. Unless specified, the type of API being referenced in conversation usually references a web application API like FastAPI (python) or Express API (javascript / nodejs)

### Tools we need

- A computer with [Python](https://www.python.org/)
- An IDE (Integrated Development Environment) [VS Code](https://code.visualstudio.com/) **Recommended**
  - This is **NOT Visual Studio** - it is `VS Code`
- An API Testing Tool like: [Insomnia](https://insomnia.rest/) or [Postman](https://www.postman.com/)

### Learning by playing

Rather than going into immense detail we’ll instead build a simple web API and then test it out. We’ll start off with 🐍 `Python` utilizing a library called 🛞 `FastAPI`.

> The app is a simple web server that will let you add items and get the items you’ve added.

### Project Start

In your Terminal / Command Prompt. Create a new directory called: **fast_api_items**

```bash
mkdir fast_api_items
```

Open your new folder in your IDE. For this example I will use VSCode

In VSCode open a **New Terminal** and type:

```bash
# mac and/or linux
python3 -m venv venv

# windows
python -m venv venv
```

In your project directory this will create a new folder called `venv`

Once again in the Terminal type the following:

```bash
# Windows
# - cmd / command prompt
.\venv\Scripts\activate
# - PowerShell
.\venv\Scripts\Activate.ps1

# Mac or Linux
source /venv/bin/activate
```

Once you do this… you should see something like `(venv)` show up in the terminal. This means you now have a virtual python environment up and running.

> [Why do I need a virtual environment?](/article/python-venv)

Okay! Imagine you’re building a **LEGO set**.

A Python virtual environment is **like a special LEGO table** where you only keep the pieces you need for one project. That way, if you’re building a spaceship, your table only has spaceship pieces — no pirate ship parts or castle bricks to get in the way!

_Why it’s good:_

- Keeps your project clean and organized
- Makes sure your code always uses the right tools (even if other projects use different ones).
- Helps you not break other projects by accident.

So it’s like your own little safe bubble for coding — and each project gets its own bubble! 🫧👩‍💻🧑‍💻 :::

📺 Back in your terminal type:

```bash
pip install fastapi uvicorn
```

This will install the libraries `fastapi` and `uvicorn` in your (venv) directory. Let it run and install.

### Let’s create the API application

Create a file called `main.py` in the root of your project folder. Then add the following lines and save it.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Pydantic model for the request body
class Item(BaseModel):
    name: str
    description: str = None

# In-memory storage
items = []

# This is home or root of your website api
@app.get("/")
async def read_root():
    return {"message": "Welcome to the API"}

# This will still display on the website ending with: /items
# This will show all the items you created
@app.get("/items")
async def read_items():
    return items

# This requires an api tool to test
@app.post("/items")
async def create_item(item: Item):
    items.append(item.dict())
    return item
```

Now let’s run the application by typing the following command in your terminal.

```bash
uvicorn main:app --reload
```

> What is the uvicorn python library URL: https://www.uvicorn.org/

Imagine you’re putting on a puppet show. You have your puppets (your Python code), but you need a stage and someone to open the curtain and let people watch. Uvicorn is like that helpful person who opens the curtain and invites the audience in. It helps your Python code talk to the internet so people can see and use what you’ve built.

Now, here’s something cool: when you’re practicing your puppet show and decide to change a puppet’s costume or add a new scene, Uvicorn notices the change and restarts the show automatically. This means you don’t have to stop and start everything again—it just updates the show for you! ​

So, if you made a cool game or a website with Python, Uvicorn helps share it with others and keeps everything updated as you make changes!

This will spin up a local web server at: `http://127.0.0.1:8000` or whatever your localhost IP is set to. You can also just type: `http://localhost:8000`

In a web browser (chrome, edge, brave, firefox, etc.) you should see the following text…

```json
{ "message": "Welcome to the API" }
```

After the number `8000`, if you type: `/items` it should show square brackets `[ ]` because we haven’t added any items yet.

So how do we add items. Luckily for us, this app automatically created documentation when it was created. If you go to: `http://localhost:8000/docs` you should see documentation.

| Type | Description           |
| ---- | --------------------- |
| GET  | Read Root             |
| GET  | Read or Display Items |
| POST | Create Item           |

Click on the **POST** drop down. This shows something called the **Request Body** with example data wrapped in curly brackets with quotes around the text. This format if you’ve never seen it is called JSON (JavaScript Object Notation)

This is where the API Testing Tool comes into play. For this example we will be the using [Insomnia](https://insomnia.rest/) application.

In the Insomnia application, I will create a **New Collection**

Add a new Request by providing the URL: `http://localhost:8000/items` and setting the `Request Type` to **POST**

> Think of this like an html web form or web application where you add a new item. But instead of an easy to use form, we are going to send a specialized text format.

![](/images/insomnia-api-tool-add-json.png)

In the `POST Request` select the `Body` tab. You should see a drop-down. Select `JSON`.

**Copy** the following text and paste it into the JSON Body

```json
{
  "name": "Fred",
  "description": "Likes to dance"
}
```

Back in the browser, go to: `http://localhost:8000/items` and you should see the JSON text we just added.

Let’s jump back into our API Tool (Insomnia) and add another item by replacing the current JSON data with…

```json
{
  "name": "Susan",
  "description": "Likes to run"
}
```

Once more refresh the website: `http://localhost:8000/items` and you should see the other items.

Let’s add another person but this time add a new `key` labelled `age` and set it to `28`

```json
{
  "name": "May",
  "age": 28,
  "description": "Enjoys spring"
}
```

You’ll be able to create the person but it won’t add the `age` value. This is because back in the **python code** for the `main.py` we said objects can only have a `name` and `description`.

### Let’s dig into the code

In your IDE `VS Code` open `main.py` and locate the line…

```python
# Pydantic model for the request body
class Item(BaseModel):
    name: str
    description: str = None
```

You don’t need to understand python. All you need to know is that the code above is creating a new object we called `Item` and that we’ve given this `Item` object, **two** keys, fields, or columns. Imagine this is in a table and we’ve created the columns: name and description. In this code, instead of columns we have `keys` with `values`.

Even though in the Insomnia API testing tool it let’s us add the key `age` with a value, it will just ignore this key because we didn’t provide this key when we created the `Item object`.

Let’s add a new `key (column)` to the `Item` object. We will also set the data format to an `int (number)` and we set it’s default value to `0 (zero)`.

```python
# Pydantic model for the request body
class Item(BaseModel):
    name: str
    description: str = None
    age: int = 0
```

Make sure to save your changes. Since we saved our changes the server will automatically restart clearing out the `local` data or the objects we created.

Let’s go back to Insomnia and run the `POST Request` again. This will create a new item with a value for `age`.

### Endpoint Basics

Right now we see our new items at: `http://localhost:8000/items` but we can set this to anything.

In the code find the section:

```python
@app.get("/items")
async def read_items():
    return items
```

Change the `/items` to `/people` and save. Our items in the local memory will be wiped out again. Let’s once again add a user with an `age` key and value. Then repeat the step and add two other people with different information.

Open your browser and now go to: `http://localhost:8000/people` to see the people items you created.

## Finished

Play around with this a little, change the endpoints, add new keys, or create an item with only a name. Have fun!
