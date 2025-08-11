const variantSelect = document.getElementById("designVersion");
const co2Sim = document.getElementById("co2Simulator");
const slider = document.getElementById("simulatedCO2");
const simValue = document.getElementById("simValue");

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggle");
    const designSelect = document.getElementById("designVersion");
    const resetButton = document.getElementById("resetButton");
    const co2Sim = document.getElementById("co2Simulator");
    const slider = document.getElementById("simulatedCO2");
    const simValue = document.getElementById("simValue");

    chrome.storage.local.get(
        ["ecoFeedbackEnabled", "designVariant"],
        (result) => {
            toggle.checked = result.ecoFeedbackEnabled || false;
            const variant = result.designVariant || "A1B1";
            designSelect.value = variant;

            // Show/hide slider based on variant
            co2Sim.style.display =
                variant === "A1B1" || variant === "A1B2" || variant === "A2B1" || variant === "A2B2" ?
                "block" :
                "none";

            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                chrome.tabs.sendMessage(
                    tabs[0].id, {
                        action: "getCurrentCO2"
                    },
                    (response) => {
                        if (response?.currentTotal != null) {
                            slider.value = response.currentTotal;
                            simValue.textContent = `${parseFloat(slider.value).toFixed(2)}g`;
                        }
                    }
                );
            });
        }
    );

    toggle.addEventListener("change", () => {
        const enabled = toggle.checked;
        chrome.storage.local.set({
            ecoFeedbackEnabled: enabled
        });
    });

    designSelect.addEventListener("change", () => {
        const variant = designSelect.value;
        chrome.storage.local.set({
            designVariant: variant
        }, () => {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateVariant",
                    variant,
                });
            });
        });

        co2Sim.style.display =
            variant === "A1B1" || variant === "A1B2" || variant === "A2B1" || variant === "A2B2" ?
            "block" :
            "none";
    });

    resetButton.addEventListener("click", () => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "resetCounter"
            });

            //reset slider and label
            if (slider && simValue) {
                slider.value = 0;
                simValue.textContent = `0.00g`;

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "simulateCO2",
                    simulatedTotal: 0,
                });
            }
        });
    });

    slider.addEventListener("input", () => {
        const value = parseFloat(slider.value);
        simValue.textContent = `${value.toFixed(2)}g`;

        chrome.storage.local.get("designVariant", (result) => {
            const mode = result.designVariant || "A1B1";
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "simulateCO2",
                    simulatedTotal: value,
                    mode: mode
                });
            });
        });

    });
});

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggle");
    const designSelect = document.getElementById("designVersion");
    const resetButton = document.getElementById("resetButton");

    chrome.storage.local.get(
        ["ecoFeedbackEnabled", "designVariant"],
        (result) => {
            toggle.checked = result.ecoFeedbackEnabled || false;
            designSelect.value = result.designVariant || "A1B1";
        }
    );

    toggle.addEventListener("change", () => {
        const enabled = toggle.checked;
        chrome.storage.local.set({
            ecoFeedbackEnabled: enabled
        });
    });

    designSelect.addEventListener("change", () => {
        const selected = designSelect.value;
        chrome.storage.local.set({
            designVariant: selected
        }, () => {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateVariant",
                    variant: selected,
                });
            });
        });
    });

    resetButton.addEventListener("click", () => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "resetCounter"
            });
        });
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "simulateCO2") {
        const value = message.simulatedTotal;

        if (currentVariant === "A2B2") {
            totalCO2 = value;
            updateFloatingSummary(0);
        }

        if (currentVariant === "A1B1") {
            const lastAssistantMessage = [
                ...document.querySelectorAll(
                    'div[data-message-author-role="assistant"]'
                ),
            ].pop();

            if (lastAssistantMessage) {
                const outputNode = lastAssistantMessage.querySelector(".markdown");
                if (outputNode) {
                    const placeholder = outputNode.querySelector(".eco-co2-placeholder");
                    if (placeholder) placeholder.remove();
                    insertPlaceholderBubble(outputNode);
                    updatePlaceholderWithCO2(outputNode, value);
                }
            }
        }
    }
});

variantSelect.addEventListener("change", () => {
    const variant = variantSelect.value;
    chrome.storage.local.set({
        designVariant: variant
    });
    chrome.runtime.sendMessage({
        action: "updateVariant",
        variant
    });

    co2Sim.style.display = "block";
});

// Update simulated CO2
slider.addEventListener("input", () => {
    const value = parseFloat(slider.value);
    simValue.textContent = `${value.toFixed(2)}g`;

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "simulateCO2",
            simulatedTotal: parseFloat(slider.value),
        });
    });
});
