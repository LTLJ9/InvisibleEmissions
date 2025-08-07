document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggle");
    const slider = document.getElementById("simulatedCO2");
    const simValue = document.getElementById("simValue");
    const resetButton = document.getElementById("resetButton");
  
    // Load toggle state and current total CO₂
    chrome.storage.local.get(["ecoFeedbackEnabled"], (result) => {
      toggle.checked = result.ecoFeedbackEnabled ?? true;
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getCurrentCO2" }, (response) => {
          if (response?.currentTotal != null) {
            slider.value = response.currentTotal;
            simValue.textContent = `${parseFloat(slider.value).toFixed(2)}g`;
          }
        });
      });
    });
  
    // Toggle enable/disable
    toggle.addEventListener("change", () => {
      const enabled = toggle.checked;
      chrome.storage.local.set({ ecoFeedbackEnabled: enabled }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => window.location.reload(),
          });
        });
      });
    });
  
    // Simulated CO₂ slider
    slider.addEventListener("input", () => {
      const value = parseFloat(slider.value);
      simValue.textContent = `${value.toFixed(2)}g`;
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "simulateCO2",
          simulatedTotal: value,
        });
      });
    });
  
    // Reset session counter
    resetButton.addEventListener("click", () => {
      slider.value = 0;
      simValue.textContent = `0.00g`;
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "simulateCO2",
          simulatedTotal: 0,
        });
      });
    });
  });
  