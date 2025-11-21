# 🚀 How to Launch Your App on GitHub (Step-by-Step)

Imagine GitHub is a giant robot factory. You are going to give them your blueprints (your code), and they are going to:
1. Build your website so everyone can see it.
2. Run a robot (server) every 15 minutes to send your emails.

Here is exactly what you need to do, step by step.

---

## Part 1: Get the "Master Key" 🔑
The robot needs a key to open your Firebase database to send emails.

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click on your project (**bEmails**).
3. Click the ⚙️ **Gear Icon** (top left, next to "Project Overview") -> **Project settings**.
4. Click the **Service accounts** tab (it's on the top bar).
5. Click the blue button: **Generate new private key**.
6. Click **Generate Key** again to confirm.
7. A file will download to your computer (it ends in `.json`).
8. **Open this file** with a text editor (like Notepad or VS Code) and **Copy everything inside it**.

---

## Part 2: Give the Key to the Robot 🤖
Now we need to give this key to GitHub securely.

1. Go to your **GitHub Repository** page in your browser.
2. Click the **Settings** tab (top right).
3. On the left menu, look for **Secrets and variables** -> Click **Actions**.
4. Click the green button: **New repository secret**.
5. **Name:** Type exactly this: `FIREBASE_SERVICE_ACCOUNT`
6. **Secret:** Paste the code you copied from the JSON file in Part 1.
7. Click **Add secret**.

---

## Part 3: Upload Your Code 📤
Now we send your files to the factory.

1. Open your **Terminal** (or Command Prompt) inside your project folder.
2. Run these commands one by one (press Enter after each line):

```bash
git init
git add .
git commit -m "Initial commit - Ready for launch"
git branch -M main
```

3. Now, connect to your GitHub repo (Replace the link below with YOUR actual GitHub link):
*(You find this link on your empty GitHub repository page)*

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## Part 4: Turn on the Website 🌍
Your code is uploaded! Now let's turn on the screen.

1. Go back to your **GitHub Repository** page.
2. Click the **Settings** tab again.
3. On the left menu, click **Pages**.
4. Under **Build and deployment** -> **Source**, change it from "Deploy from a branch" to **GitHub Actions**.
   *(If you don't see "GitHub Actions", just wait 2 minutes. My code creates a custom action for you automatically).*
5. Go to the **Actions** tab (top of the screen).
    - You should see a workflow running called **"Deploy to GitHub Pages"**.
    - When it turns 🟢 **Green**, your site is live!

---

## Part 5: Verify Everything ✅

1. **Check the Website:** 
   - Go back to **Settings -> Pages**. You will see a link at the top (e.g., `https://yourname.github.io/repo`). Click it! Your app should load.

2. **Check the Automation:**
   - Go to the **Actions** tab.
   - You will see another workflow called **"Email Campaign Scheduler"**.
   - It is set to run every 15 minutes automatically.
   - You can also click on it, click "Run workflow", and hit the green button to test it immediately.

---

## 🆘 Troubleshooting: "I don't see the workflow running!"

If you are on Part 4/5 and the Actions tab is empty:

1.  **Did you verify your email?**
    - GitHub Actions won't run if you haven't verified your email address with GitHub when you signed up. Check your email inbox.

2.  **Did you push the `.github` folder?**
    - Sometimes computers hide folders starting with a dot.
    - In your code editor, look for the `.github` folder. Inside it should be `workflows` -> `deploy.yml`.
    - If this file is missing on your GitHub Code page, you haven't pushed it yet. Run `git add .`, `git commit -m "fix"`, and `git push` again.

3.  **Are Actions enabled?**
    - Go to **Settings** -> **Actions** -> **General**.
    - Make sure **"Allow all actions and reusable workflows"** is selected.

4.  **Check the branch name**
    - Look at the "Code" tab. Does the dropdown say `main` or `master`?
    - If it says `master`, the old workflow file ignored it. I have updated the code to support both. Just push the new code provided.