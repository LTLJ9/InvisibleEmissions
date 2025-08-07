# 🌿 Invisible Emissions: Eco-Feedback for ChatGPT

This Chrome extension explores how real-time eco-feedback can raise awareness of the environmental costs associated with using large language models (LLMs), such as ChatGPT.

Developed as part of a research project on **sustainable interaction design**, this prototype investigates how different types and placements of carbon feedback influence users' understanding, concern, and willingness to reduce emissions during everyday AI use.

> 💡 This prototype overlays estimated CO₂ emissions onto ChatGPT's interface. Emission values are **simulated based on prompt token length** and serve to illustrate the environmental impact of inference. 

---

## 🔧 How to Use the Extension

### 1. Download and Install

1. [Download the ZIP file](#) from this GitHub repository and **unzip** it to your desktop or another easy-to-find location.
   <img width="414" height="373" alt="Screenshot 2025-08-07 at 13 23 25" src="https://github.com/user-attachments/assets/632fb963-f5a3-4557-ada6-c0fc0f3c98eb" />

3. Open **Google Chrome** and go to:  
   `chrome://extensions/`
    
5. In the top-right corner, **toggle on** `Developer mode`.
   
   <img width="164" height="44" alt="image" src="https://github.com/user-attachments/assets/2042307b-327d-43c2-a2c9-b405f4bdf78f" />

7. Click **Load unpacked** and select the unzipped folder.
   
   <img width="172" height="48" alt="image" src="https://github.com/user-attachments/assets/b9ded244-9f23-4e65-bcad-d9790e5fed97" />

9. In your Chrome toolbar:
   Click the 🧩 **Extensions icon**
   
   <img width="612" height="24" alt="image" src="https://github.com/user-attachments/assets/ae31eeb7-2aae-4145-819d-93d3b843e739" />
   
   Click the 📌 **pin** next to “Invisible Emissions” Leaf icon to make it visible and switch the **Enable Feedback** toggle to **ON.**
   
   <img width="304" height="308" alt="Screenshot 2025-08-07 at 10 57 26" src="https://github.com/user-attachments/assets/cc1102fe-7a95-4405-a2e6-d38467eba675" />

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

