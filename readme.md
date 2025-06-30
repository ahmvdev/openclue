# OpenClue

This is an open-source version of the app Cluely, without the voice transcription.

---

## Features/Usage

- Ask whats on the screen and it will tell you and provide more information
- Some use cases:
    - "Explain this thing"
    - "Whos this guy on the screen?"

---

## Shortcuts

- **Maximize or minimize:** CTRL + SHIFT + K 
- **Close the app completely:** CTRL + SHIFT + D

## Screenshots of usecases:
![1](https://github.com/user-attachments/assets/c8b1b296-e932-4d90-a3eb-f464d960be6f)
![2](https://github.com/user-attachments/assets/5f7f3f19-b6cb-4dd4-bb35-433f8b3fae0d)


## Installation

1. **Run it locally**

```bash
npm install
```
2. **Create a `.env` file in the root directory and paste your API KEY:**

```bash
VITE_GEMINI_API_KEY=EXAMPLE_KEY_HERE
```

3. **Start development server**:

```bash
npm run:electron dev
```

---


### Build app

1. **Build the app**
```bash
npm run dist
```

2. Open it in `dist/win-unpacked`

There you go!

### Platform Support:
I have only tested this on windows so far.

Feedback appreciated. Thanks!

---
