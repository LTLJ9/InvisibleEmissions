let currentVariant = "A1B1"; // default
let totalCO2 = 0;
let floatingWidget;
let activePopover = null;
let popoverAnchor = null;

chrome.storage.local.get(["ecoFeedbackEnabled", "designVariant"], (data) => {
    if (!data.ecoFeedbackEnabled) {
        console.log("Eco-feedback disabled");
        return;
    }
    currentVariant = data.designVariant || "A1B1";
    console.log(`Eco-feedback script running. Variant: ${currentVariant}`);
    startObserver();
});

function estimateCarbon(inputText, outputText) {
    const tokensInput = countTokens(inputText);
    const tokensOutput = countTokens(outputText);
    const totalTokens = tokensInput + tokensOutput;

    const gramsPerToken = 0.003;
    // ~0.003g CO₂ per token => 
    // ~3g CO₂ for 1000 tokens
    return parseFloat((totalTokens * gramsPerToken).toFixed(3));
}

function countTokens(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length * 1.5;
}

function getImpactColor(valueSingle, valueTotal) {
    if (currentVariant === "A1B1") {
        if (valueSingle <= 0.2) return "#FFC107"; // Yellow 
        if (valueSingle <= 0.4) return "#FFB300"; // Darker Yellow
        if (valueSingle <= 0.6) return "#FB8C00"; // Orange 
        if (valueSingle <= 0.8) return "#F57C00"; // Darker Orange 
        return "#BF360C"; // Deep Orange

    } else {
        if (valueTotal <= 2) return "#FFC107"; // Yellow
        if (valueTotal <= 5) return "#FFB300"; // Darker Yellow
        if (valueTotal <= 10) return "#FB8C00"; // Orange 
        if (valueTotal <= 19.99) return "#F57C00"; // Darker Orange 
        return "#BF360C"; // Deep Orange
    }
}
// Floating widget creation
function createFloatingWidget(gramsCO2, totalCO2) {
    const impactColor = getImpactColor(gramsCO2, totalCO2);
    floatingWidget = document.createElement("div");
    floatingWidget.id = "eco-floating-widget";
    floatingWidget.style.position = "fixed";
    floatingWidget.style.bottom = "20px";
    floatingWidget.style.right = "20px";
    floatingWidget.style.background = impactColor;
    floatingWidget.style.color = "#fff";
    floatingWidget.style.padding = "10px 14px";
    floatingWidget.style.borderRadius = "10px";
    floatingWidget.style.fontSize = "14px";
    floatingWidget.style.fontFamily = "system-ui, sans-serif";
    floatingWidget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
    floatingWidget.style.zIndex = "9999";
    floatingWidget.innerText = `🌿 Session total: <strong>${totalCO2.toFixed(3)}g CO₂</strong>`;
    document.body.appendChild(floatingWidget);
}
// Update floating widget for Variant B (cumulative)
function updateFloatingSummary(gramsCO2) {
    const metaphor = getMetaphor(totalCO2 + gramsCO2);
    const start = totalCO2;
    const end = totalCO2 + gramsCO2;

    if (!floatingWidget || !document.body.contains(floatingWidget)) {
        createFloatingWidget(0, start); // Start from current total
    }

    floatingWidget.innerHTML = `<span>🌿 Session total: ⏳ Calculating...</span>`;

    requestAnimationFrame(() => {
        const duration = 1000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = start + (end - start) * progress;

            floatingWidget.innerHTML = `🌿 Session total: <strong style="color: inherit;">${current.toFixed(3)}g CO₂</strong>`;
            floatingWidget.style.background = getImpactColor(current, current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                totalCO2 = end;
            }
        }

        requestAnimationFrame(animate);
    });

    let metaphorEl = document.getElementById("eco-floating-metaphor");
    if (!metaphorEl) {
        metaphorEl = document.createElement("div");
        metaphorEl.id = "eco-floating-metaphor";
        Object.assign(metaphorEl.style, {
            position: "fixed",
            bottom: "60px",
            right: "20px",
            fontSize: "12px",
            fontStyle: "italic",
            color: "#666",
            fontFamily: "system-ui, sans-serif",
            zIndex: "9999",
            marginBottom: "6px",
            marginRight: "2px",
            marginLeft: "auto",
        });
        document.body.appendChild(metaphorEl);
    }

    metaphorEl.innerHTML = `
      ${metaphor.text}
      <span class="eco-info-trigger" style="cursor:pointer; font-style:normal; margin-left:4px;">ℹ️</span>
  `;

    const info = metaphorEl.querySelector(".eco-info-trigger");
    if (info) {
        info.addEventListener("click", () => {
            showPopover(info, metaphor);
        });
    }
}

// Add inline or floating feedback
function addFeedbackBubble(gramsCO2, messageNode) {
    const metaphor = getMetaphor(gramsCO2);
    const impactColor = getImpactColor(gramsCO2, totalCO2);

    if (currentVariant === "A2B2") {
        updateFloatingSummary(gramsCO2);
        return;
    }
    // Variant A (inline)
    const container = document.createElement("div");
    Object.assign(container.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
    });

    const bubble = document.createElement("span");
    Object.assign(bubble.style, {
        background: impactColor,
        color: "#fff",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "400",
        fontFamily: "system-ui, sans-serif",
    });

    bubble.innerText = "⏳ Calculating CO₂…";
    container.appendChild(bubble);

    const description = document.createElement("span");
    Object.assign(description.style, {
        color: "#999",
        fontStyle: "italic",
        fontSize: "13px",
        fontFamily: "system-ui, sans-serif",
    });
    container.appendChild(description);

    messageNode.appendChild(container);

    // Animate in a frame after renders
    requestAnimationFrame(() => {
        let start = 0;
        const duration = 1000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = start + (gramsCO2 - start) * progress;
            bubble.style.background = getImpactColor(current, totalCO2);

            bubble.innerText = `🌿 ${current.toFixed(3)}g CO₂`;
            description.innerText = metaphor.text;

            if (progress < 1) requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    });
}

function startObserver() {
    const observer = new MutationObserver(() => {
        const assistantMessages = document.querySelectorAll(
            'div[data-message-author-role="assistant"]'
        );
        const userMessages = document.querySelectorAll(
            'div[data-message-author-role="user"]'
        );

        const lastAssistantMessage =
            assistantMessages[assistantMessages.length - 1];
        const lastUserMessage = userMessages[userMessages.length - 1];

        if (
            lastAssistantMessage &&
            !lastAssistantMessage.dataset.feedbackAdded &&
            !lastAssistantMessage.dataset.feedbackPending
        ) {
            const outputNode = lastAssistantMessage.querySelector(".markdown");
            const inputNode =
                lastUserMessage?.querySelector(".markdown") ||
                lastUserMessage?.querySelector(".text-base") ||
                lastUserMessage?.querySelector("p");
            const inputText =
                inputNode?.innerText || lastUserMessage?.innerText || "";

            if (outputNode) {
                lastAssistantMessage.dataset.feedbackPending = "true";

                if (currentVariant === "A2B2" || currentVariant === "A2B1") {
                    if (!floatingWidget || !document.body.contains(floatingWidget)) {
                        createFloatingWidget(0, 0); // Start at zero
                    }
                    floatingWidget.innerText = `⏳ Calculating CO₂…`;
                    floatingWidget.style.background = "#999";
                }
                // For variant A, show placeholder inline
                if (currentVariant === "A1B1" || currentVariant === "A1B2") {
                    insertPlaceholderBubble(outputNode);
                }
                waitForStableOutput(outputNode, () => {
                    const outputText = outputNode.innerText;
                    if (!outputText || outputText.trim().length === 0) {
                        delete lastAssistantMessage.dataset.feedbackPending;
                        return;
                    }

                    const carbon = estimateCarbon(inputText, outputText);
                    console.log("💬 Final CO₂ Estimate:", carbon);

                    if (currentVariant === "A1B1") {
                        updatePlaceholderWithCO2(outputNode, carbon);
                    } else if (currentVariant === "A1B2") {
                        totalCO2 += carbon;
                        updatePlaceholderWithCO2(outputNode, totalCO2);
                    } else if (currentVariant === "A2B2") {
                        updateFloatingSummary(carbon);
                    } else if (currentVariant === "A2B1") {
                        updateFloatingInstantaneous(carbon);
                    }


                    lastAssistantMessage.dataset.feedbackAdded = "true";
                    delete lastAssistantMessage.dataset.feedbackPending;
                });
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function animateFloatingWidget(gramsToAdd) {
    const metaphor = getMetaphor(gramsToAdd);
    const start = totalCO2;
    const end = totalCO2 + gramsToAdd;
    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * progress;

        floatingWidget.innerText = `🌿 Session total: ${current.toFixed(3)}g`;
        floatingWidget.style.background = getImpactColor(current, current);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            totalCO2 = end;
            floatingWidget.innerText = `🌿 Session total: ${totalCO2.toFixed(3)}g`;
            floatingWidget.style.background = getImpactColor(gramsToAdd, totalCO2);
        }
    }

    requestAnimationFrame(animate);
}

function waitForStableOutput(
    node,
    callback, {
        baseInterval = 400,
        trailingBufferMs = 1000,
        minObservationTime = 1500,
        maxTimeout = 70000
    } = {}
) {
    let lastContentLength = 0;
    let stableCycles = 0;
    let totalElapsed = 0;
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
        const currentLength = node.innerText.length;

        let targetStableCycles = Math.min(
            Math.ceil(currentLength / 400),
            7
        );
        targetStableCycles = Math.max(targetStableCycles, 3);

        if (currentLength === lastContentLength) {
            stableCycles++;
        } else {
            stableCycles = 0;
            lastContentLength = currentLength;
        }

        totalElapsed += baseInterval;

        console.log(`🔍 Output length=${currentLength}, stableCycles=${stableCycles}/${targetStableCycles}`);

        const minTimeReached = (Date.now() - startTime) >= minObservationTime;

        if (stableCycles >= targetStableCycles && minTimeReached) {
            clearInterval(checkInterval);
            console.log(`Stable reached. Waiting extra ${trailingBufferMs}ms to confirm...`);
            setTimeout(() => {
                if (node.innerText.length === currentLength) {
                    console.log("Stable. Proceeding with CO₂ calculation.");
                    callback();
                } else {
                    console.log("Text changed during trailing buffer. Restarting watch.");
                    waitForStableOutput(node, callback, {
                        baseInterval,
                        trailingBufferMs,
                        minObservationTime,
                        maxTimeout
                    });
                }
            }, trailingBufferMs);
        }

        if (totalElapsed >= maxTimeout) {
            clearInterval(checkInterval);
            console.warn("⚠️ Max timeout reached — using last available output.");
            callback();
        }
    }, baseInterval);
}


function updatePlaceholderWithCO2(messageNode, gramsCO2) {
    const bubble = messageNode.querySelector(".eco-bubble");
    const desc = messageNode.querySelector(".eco-description");

    if (!bubble || !desc) {
        console.warn("updatePlaceholderWithCO2: missing bubble or description nodes.");
        return;
    }

    const metaphor = getMetaphor(gramsCO2);
    const start = 0;
    const duration = 1000;
    const startTime = performance.now();

    desc.innerHTML = "";

    const info = document.createElement("span");
    info.className = "eco-info-trigger";
    info.innerText = " ℹ️";
    info.style.fontStyle = "normal";
    info.style.cursor = "pointer";
    info.style.marginLeft = "4px";

    info.addEventListener("click", () => {
        showPopover(info, metaphor);
    });

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (gramsCO2 - start) * progress;

        // bubble.innerText = `${metaphor.icon} ${current.toFixed(3)}g CO₂`;
        let prefix = currentVariant === "A1B1" ? "🌿 This prompt: " : "🌿 Session total: ";
        bubble.innerHTML = `${prefix}<strong style="color: inherit;">${current.toFixed(3)}g CO₂</strong>`;
        bubble.style.background = getImpactColor(current, totalCO2);

        desc.textContent = metaphor.text;
        desc.appendChild(info);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

function clearAllVariantUI() {
    const float = document.getElementById("eco-floating-widget");
    if (float) float.remove();
    floatingWidget = null;

    const metaphor = document.getElementById("eco-floating-metaphor");
    if (metaphor) metaphor.remove();

    const existingPopover = document.querySelector(".eco-popover");
    if (existingPopover) existingPopover.remove();

    const placeholders = document.querySelectorAll(".eco-co2-placeholder");
    placeholders.forEach((el) => el.remove());

    const bubbles = document.querySelectorAll(".eco-bubble");
    bubbles.forEach((el) => el.remove());

    const descriptions = document.querySelectorAll(".eco-description");
    descriptions.forEach((el) => el.remove());

    activePopover = null;
    popoverAnchor = null;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateVariant" && message.variant) {
        console.log(`🔁 Switching to variant: ${message.variant}`);
        currentVariant = message.variant;
        clearAllVariantUI();
    }

    if (message.action === "resetCounter") {
        resetCO2Counter();
    }
});

function resetCO2Counter() {
    totalCO2 = 0;
    if (floatingWidget && document.body.contains(floatingWidget)) {
        const initialColor = getImpactColor(0, totalCO2);
        floatingWidget.innerText = `🌿 Session total: <strong>${totalCO2.toFixed(3)}g CO₂</strong>`;


        floatingWidget.style.background = initialColor;
    }
    console.log("🔄 CO₂ Counter Reset!");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentCO2") {
        sendResponse({
            currentTotal: totalCO2
        });
    }

    if (message.action === "simulateCO2") {
        const value = message.simulatedTotal;
        const mode = currentVariant;
        totalCO2 = value;

        if (mode === "A1B1") {
            clearAllVariantUI();
            const assistantMessages = document.querySelectorAll(
                'div[data-message-author-role="assistant"]'
            );
            const last = assistantMessages[assistantMessages.length - 1];
            const outputNode = last?.querySelector(".markdown");
            if (outputNode) {
                insertPlaceholderBubble(outputNode);
                updatePlaceholderWithCO2(outputNode, value);
            }
        } else if (mode === "A1B2") {
            clearAllVariantUI();
            totalCO2 = value;
            const assistantMessages = document.querySelectorAll(
                'div[data-message-author-role="assistant"]'
            );
            const last = assistantMessages[assistantMessages.length - 1];
            const outputNode = last?.querySelector(".markdown");
            if (outputNode) {
                insertPlaceholderBubble(outputNode);
                updatePlaceholderWithCO2(outputNode, totalCO2);
            }
        } else if (mode === "A2B2") {
            clearAllVariantUI();

            const previous = totalCO2;
            totalCO2 = value;

            createFloatingWidget(0, totalCO2);
            updateFloatingSummary(totalCO2 - previous);
        } else if (mode === "A2B1") {
            clearAllVariantUI();
            updateFloatingInstantaneous(value);
        }
    }
});

function updateFloatingInstantaneous(gramsCO2) {
    // Make or update floating widget
    if (!floatingWidget || !document.body.contains(floatingWidget)) {
        floatingWidget = document.createElement("div");
        floatingWidget.id = "eco-floating-widget";
        floatingWidget.style.position = "fixed";
        floatingWidget.style.bottom = "20px";
        floatingWidget.style.right = "20px";
        floatingWidget.style.background = getImpactColor(gramsCO2, gramsCO2);
        floatingWidget.style.color = "#fff";
        floatingWidget.style.padding = "10px 14px";
        floatingWidget.style.borderRadius = "10px";
        floatingWidget.style.fontSize = "14px";
        floatingWidget.style.fontFamily = "system-ui, sans-serif";
        floatingWidget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
        floatingWidget.style.zIndex = "9999";
        document.body.appendChild(floatingWidget);
    }

    // Animate the number and keep it bold
    const start = 0;
    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (gramsCO2 - start) * progress;

        floatingWidget.innerHTML = `🌿 This prompt: <strong style="color: inherit;">${current.toFixed(3)}g CO₂</strong>`;
        floatingWidget.style.background = getImpactColor(current, current);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);

    // Handle metaphor below
    let metaphorEl = document.getElementById("eco-floating-metaphor");
    const metaphor = getMetaphor(gramsCO2);

    if (!metaphorEl) {
        metaphorEl = document.createElement("div");
        metaphorEl.id = "eco-floating-metaphor";
        metaphorEl.style.position = "fixed";
        metaphorEl.style.bottom = "60px";
        metaphorEl.style.right = "20px";
        metaphorEl.style.fontSize = "12px";
        metaphorEl.style.fontStyle = "italic";
        metaphorEl.style.color = "#666";
        metaphorEl.style.fontFamily = "system-ui, sans-serif";
        metaphorEl.style.zIndex = "9999";
        metaphorEl.style.marginBottom = "6px";
        metaphorEl.style.marginRight = "2px";
        metaphorEl.style.marginLeft = "auto";
        document.body.appendChild(metaphorEl);
    }

    // Update metaphor content
    metaphorEl.innerHTML = `
    ${metaphor.text}
    <span class="eco-info-trigger" style="cursor:pointer; font-style:normal; margin-left:4px;">ℹ️</span>
  `;

    const info = metaphorEl.querySelector(".eco-info-trigger");
    if (info) {
        info.addEventListener("click", () => {
            showPopover(info, metaphor);
        });
    }
}

function insertPlaceholderBubble(messageNode) {
    const container = document.createElement("div");
    container.className = "eco-co2-placeholder";
    Object.assign(container.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
    });

    const bubble = document.createElement("span");
    bubble.className = "eco-bubble";
    Object.assign(bubble.style, {
        background: "#999",
        color: "#fff",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "400",
        fontFamily: "system-ui, sans-serif",
    });
    bubble.innerText = `⏳ Calculating CO₂…`;

    const description = document.createElement("span");
    description.className = "eco-description";
    Object.assign(description.style, {
        color: "#999",
        fontStyle: "italic",
        fontSize: "13px",
        fontFamily: "system-ui, sans-serif",
    });

    container.appendChild(bubble);
    container.appendChild(description);
    messageNode.appendChild(container);
}

function showPopover(triggerElement, metaphor) {
    removeExistingPopover();

    const popover = document.createElement("div");
    popover.className = "eco-popover";

    Object.assign(popover.style, {
        background: "#fff",
        color: "#333",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #ddd",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, sans-serif",
        zIndex: 10000,
        transition: "opacity 0.3s ease",
    });

    // Variant B — fixed panel
    if (currentVariant === "A2B2" || currentVariant === "A2B1") {
        Object.assign(popover.style, {
            position: "fixed",
            top: "0",
            right: "0",
            width: "340px",
            height: "100%",
            maxHeight: "100%",
            overflowY: "auto",
            borderLeft: "1px solid #ccc",
            borderRadius: "0",
            padding: "28px 24px",
        });

        popover.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 22px; font-weight: 600;">
          ${metaphor.text.replace("≈ ", "")}
        </div>
        <div style="font-style: italic; color: #555;">${metaphor.source}</div>
        <div style="font-size: 15px; line-height: 1.6;">
          ${metaphor.details || "No details available."}
        </div>
        ${
          metaphor.moreInfo
            ? `<a href="${metaphor.moreInfo}" target="_blank" rel="noopener" style="color: #2a7ae2; font-size: 14px; margin-top: 8px;">🔗 Learn more</a>`
            : ""
        }
      </div>
    `;

        document.body.appendChild(popover);
        return;
    }

    // Variant A — floating inline with left-pointing arrow
    popover.style.position = "absolute";
    popover.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div><strong>${metaphor.text.replace("≈ ", "")}</strong></div>
      <div style="font-style: italic; color: #666;">${metaphor.source}</div>
      <div>${metaphor.details || "No details available."}</div>
      ${
        metaphor.moreInfo
          ? `<a href="${metaphor.moreInfo}" target="_blank" rel="noopener" style="color: #2a7ae2; font-size: 13px;">Read more</a>`
          : ""
      }
    </div>
  `;

    // Create left-pointing arrow
    const arrow = document.createElement("div");
    Object.assign(arrow.style, {
        position: "absolute",
        width: "0",
        height: "0",
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderRight: "6px solid #fff",
        left: "-6px",
        top: "16px",
        zIndex: 10001,
    });
    popover.appendChild(arrow);

    document.body.appendChild(popover);

    activePopover = popover;
    popoverAnchor = triggerElement;

    // Position popover to the right of the icon
    function trackPosition() {
        if (!activePopover || !popoverAnchor) return;

        const rect = popoverAnchor.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;

        const spacing = 8; // pixels from icon

        activePopover.style.top = `${rect.top + scrollY - 8}px`;
        activePopover.style.left = `${rect.right + scrollX + spacing}px`;

        requestAnimationFrame(trackPosition);
    }

    requestAnimationFrame(trackPosition);
}

document.addEventListener("click", (e) => {
    const existing = document.querySelector(".eco-popover");
    if (
        existing &&
        !existing.contains(e.target) &&
        !e.target.classList.contains("eco-info-trigger")
    ) {
        existing.remove();
    }
});

function removeExistingPopover() {
    const pop = document.querySelector(".eco-popover");
    if (pop) pop.remove();
    activePopover = null;
    popoverAnchor = null;
}

function getMetaphor(gramsCO2) {
    if (gramsCO2 <= 0.02) {
        return {
            icon: "📩",
            text: "≈ 📩 Sending a short email",
            source: "Berners-Lee (2010)",
            details: "A short plain-text email emits ~0.02g CO₂. Most of this is due to the energy used by servers and networking infrastructure.",
            moreInfo: "https://archive.org/details/howbadarebananas0000bern",
        };
    }
    if (gramsCO2 <= 0.25) {
        return {
            icon: "🔍",
            text: "≈ 🔍 One Google search",
            source: "Google (2009)",
            details: "One typical Google search uses about 0.0003 kWh of energy (~0.2g CO₂), from data center processing and delivery.",
            moreInfo: "https://googleblog.blogspot.com/2009/01/powering-google-search.html",
        };
    }
    if (gramsCO2 <= 0.5) {
        return {
            icon: "🔋",
            text: "≈ 🔋 Charging a phone for 5 mins",
            source: "UK DEFRA (2018)",
            details: "Charging a smartphone for 5 minutes uses ~0.5 Wh, emitting ~0.25g CO₂ based on UK grid intensity.",
            moreInfo: "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/854660/Conversion-Factors-2019-Methodology-Paper.pdf",
        };
    }
    if (gramsCO2 <= 1.0) {
        return {
            icon: "🧊",
            text: "≈ 🧊 Running a fridge for 1 hour",
            source: "IEA (2020)",
            details: "An energy-efficient (A++) fridge runs at ~30W. Over 1 hour, this produces ~1g CO₂ at EU average intensity.",
            moreInfo: "https://www.iea.org/reports/tracking-buildings-2020",
        };
    }
    if (gramsCO2 <= 2.5) {
        return {
            icon: "🫖",
            text: "≈ 🫖 Making a cup of tea",
            source: "UK Gov Energy Survey",
            details: "Boiling ~250ml of water in a kettle (~0.05 kWh) emits ~2–3g CO₂ depending on grid mix.",
            moreInfo: "https://www.gov.uk/government/statistics/energy-consumption-in-the-uk",
        };
    }
    if (gramsCO2 <= 5.0) {
        return {
            icon: "💡",
            text: "≈ 💡 LED bulb for 1 hour",
            source: "Carbon Trust",
            details: "A 10W LED bulb used for one hour uses 0.01 kWh, which results in ~5g CO₂ in most countries.",
            moreInfo: "https://www.carbontrust.com/resources/carbon-footprinting-guide",
        };
    }
    if (gramsCO2 <= 10.0) {
        return {
            icon: "🚗",
            text: "≈ 🚗 Driving 100 meters",
            source: "EEA (2023)",
            details: "An average EU petrol car emits ~120g CO₂/km. That's ~12g for just 100 meters of driving.",
            moreInfo: "https://www.eea.europa.eu/en/topics/in-depth/transport-and-environment",
        };
    }
    if (gramsCO2 <= 20.0) {
        return {
            icon: "📦",
            text: "≈ 📦 Sending a letter by post",
            source: "Royal Mail",
            details: "A first-class letter delivery by post emits ~20g CO₂ including transport and sorting stages.",
            moreInfo: "https://www.royalmailgroup.com/en/sustainability/",
        };
    }
    if (gramsCO2 <= 50.0) {
        return {
            icon: "🧠",
            text: "≈ 🧠 Training a small ML model",
            source: "Luccioni et al. (2023)",
            details: "Training a small neural net locally on a laptop or single GPU may emit between 30–50g CO₂ depending on hardware and time.",
            moreInfo: "https://arxiv.org/abs/2104.10350",
        };
    }
    return {
        icon: "⚠",
        text: "≈ ⚠ High-impact AI task",
        source: "Henderson et al. (2020)",
        details: "Tasks like large model inference or image generation can exceed 100g CO₂ per use depending on model size and infrastructure.",
        moreInfo: "https://arxiv.org/abs/2004.08900",
    };
}
