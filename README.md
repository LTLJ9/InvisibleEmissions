# 🌿 Invisible Emissions: Eco-Feedback for ChatGPT

This Chrome extension explores how real-time eco-feedback can raise awareness of the environmental costs associated with using large language models (LLMs), such as ChatGPT.

Developed as part of a research project on **sustainable interaction design**, this prototype investigates how different types and placements of carbon feedback influence users' understanding, concern, and willingness to reduce emissions during everyday AI use.

> 💡 This prototype overlays estimated CO₂ emissions onto ChatGPT's interface. Emission values are **simulated based on prompt token length** and serve to illustrate the environmental impact of inference. 

---

## 🔧 How to Use the Extension

### 1. Download and Install

1. Download the ZIP file from this GitHub repository and **unzip** it to your desktop or another easy-to-find location.
   
   <img width="456" height="351" alt="DownloadZIP" src="https://github.com/user-attachments/assets/c49f5d5b-191a-4bcb-b3d4-61b367135c27" />

3. Open **Google Chrome** and go to:  
   `chrome://extensions/`
    
5. In the top-right corner, **toggle on** `Developer mode`.
   
   <img width="164" height="44" alt="image" src="https://github.com/user-attachments/assets/87922a6f-260d-4754-a74e-fae458344651" />


7. Click **Load unpacked** and select the unzipped folder.
   
   <img width="172" height="48" alt="image" src="https://github.com/user-attachments/assets/009fd06c-7b2c-449a-acba-6c7acc8b3010" />

9. In your Chrome toolbar:
   Click the 🧩 **Extensions icon**
   
   <img width="612" height="24" alt="image" src="https://github.com/user-attachments/assets/99de7fb3-2db9-4f1c-abf3-8c84343e2dd4" />

   Click the 📌 **pin** next to “Invisible Emissions” Leaf icon to make it visible and switch the **Enable Feedback** toggle to **ON.**
   
   <img width="304" height="308" alt="Screenshot 2025-08-07 at 10 57 26" src="https://github.com/user-attachments/assets/cb52f4d3-b281-445c-836f-82dc0d8db37f" />

### 2. Access ChatGPT

1. Go to [https://chat.openai.com](https://chat.openai.com)
> The extension runs entirely on your browser and does not store any user data.
> It activates automatically when you visit ChatGPT while the extension is enabled.

---

## 🗂 Accessing Earlier Prototype (V1)

What you're viewing now is the **refined prototype** based on post-study feedback and iteration.

If you would like to access the **original version tested in the initial user study**:

1. Navigate to the **"V1" branch** of this repository.
2. Download the ZIP file from that branch.
3. Follow the same steps under [Download and Install](#1-download-and-install) to load it as a Chrome extension.

This version includes the original UI designs and variant logic used during the first round of user testing.

## 📁 Repository Contents

- `manifest.json`: Chrome extension configuration
- `popup.html`, `popup.js`: Extension launcher and controls
- `content.js`: Main logic injected into ChatGPT pages
- `styles.css`: Visual styles for feedback elements
- `icons/`: Icon assets used in the browser toolbar

---

