let totalCO2 = 0;
let floatingWidget;
let activePopover = null;
let popoverAnchor = null;

chrome.storage.local.get(["ecoFeedbackEnabled"], (data) => {
    if (!data.ecoFeedbackEnabled) {
        console.log("Eco-feedback disabled");
        return;
    }
    console.log("Eco-feedback script running");

    startObserver();
});

// Heuristic estimate: ~0.003g CO₂ per token (input + output)
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

// Color gradient for impact severity — used by both inline + floating feedback
function getImpactColor(value) {
    if (value <= 0.02) return "#FFB300"; // Deep golden amber
    if (value <= 0.1) return "#FFA000"; // Warm orange
    if (value <= 0.25) return "#FB8C00"; // Strong orange
    if (value <= 0.5) return "#F57C00"; // Burnt orange
    if (value <= 1.0) return "#EF6C00"; // Darker orange
    if (value <= 2.5) return "#E64A19"; // Orangey red
    if (value <= 5.0) return "#D84315"; // Red-orange
    if (value <= 10.0) return "#D32F2F"; // True red
    if (value <= 20.0) return "#C62828"; // Dark red
    return "#B71C1C"; // Blood red
}


// Floating widget creation
const DAILY_BUDGET_G = 50;

function createFloatingWidget() {
    const existing = document.getElementById("eco-orb");
    if (existing) existing.remove();
    ensureEcoOrbStyles();

    const orb = document.createElement("div");
    orb.id = "eco-orb";
    orb.innerHTML = `
    <div class="eco-orb__metaphor">
      <span class="eco-orb__icon">📩</span>
      <span class="eco-orb__text">Sending an email</span>
    </div>

    <div class="eco-orb__ring">
      <div class="eco-orb__value-wrap">
        <div class="eco-orb__value">0.000</div>
        <div class="eco-orb__unit">g CO₂</div>
      </div>
    </div>
  `;
    orb.addEventListener("click", (e) => {
        const value = totalCO2 || 0;
        const metaphor = getMetaphor(value);
        showPopover(orb, metaphor);
    });

    document.body.appendChild(orb);
    floatingWidget = orb;
}

// Updates cumulative session CO₂ total with animation and metaphor display
function updateFloatingSummary(gramsCO2) {
    const start = totalCO2;
    const end = totalCO2 + gramsCO2;

    if (!floatingWidget || !document.body.contains(floatingWidget)) {
        createFloatingWidget();
    }

    const valueEl = floatingWidget.querySelector(".eco-orb__value");
    const unitEl = floatingWidget.querySelector(".eco-orb__unit");
    const metaphorText = floatingWidget.querySelector(".eco-orb__text");
    const iconEl = floatingWidget.querySelector(".eco-orb__icon");

    const metaphor = getMetaphor(end);
    metaphorText.textContent = metaphor.text.replace("≈ ", "");
    iconEl.textContent = metaphor.icon || "🌱";

    const duration = 900;
    const startTime = performance.now();

    const animate = (t) => {
        const p = Math.min((t - startTime) / duration, 1);
        const current = start + (end - start) * p;
        valueEl.textContent = current.toFixed(3);

        const color = getImpactColor(current);
        const progress = Math.min(current / DAILY_BUDGET_G, 1);
        floatingWidget.style.setProperty("--ring", color);
        floatingWidget.style.setProperty("--progress", progress.toString());

        if (p < 1) {
            requestAnimationFrame(animate);
        } else {
            totalCO2 = end;
        }
    };
    requestAnimationFrame(animate);
}

function addFeedbackBubble(gramsCO2, messageNode) {
    const metaphor = getMetaphor(gramsCO2);
    const impactColor = getImpactColor(gramsCO2, totalCO2);

    const container = document.createElement("div");
    Object.assign(container.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
    });

    const bubble = document.createElement("span");
    Object.assign(bubble.style, {
        background: "transparent",
        color: impactColor,
        border: `1px dashed ${impactColor}`,
        padding: "2px 6px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "500",
        fontFamily: "system-ui, sans-serif",
        opacity: 0.75,
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

        assistantMessages.forEach((assistantMsg, i) => {
            if (assistantMsg.dataset.ecoWatching === "true") return;

            const outputNode = assistantMsg.querySelector(".markdown");
            if (!outputNode) return;

            assistantMsg.dataset.ecoWatching = "true";

            const userMsg = userMessages[i] || userMessages[userMessages.length - 1];
            const inputNode =
                userMsg?.querySelector(".markdown") ||
                userMsg?.querySelector(".text-base") ||
                userMsg?.querySelector("p");
            const inputText = inputNode?.innerText || userMsg?.innerText || "";

            if (!floatingWidget || !document.body.contains(floatingWidget)) {
                createFloatingWidget();
            }

            insertPlaceholderBubble(outputNode);

            waitForStableOutput(outputNode, () => {
                if (outputNode.dataset.co2Calculated === "true") {
                    console.warn("CO₂ already calculated for this node, skipping.");
                    return;
                }
                outputNode.dataset.co2Calculated = "true";

                const outputText = outputNode.innerText || "";
                if (!outputText.trim()) return;

                const carbon = estimateCarbon(inputText, outputText);
                console.log("💬 Final CO₂ Estimate:", carbon);

                updatePlaceholderWithCO2(outputNode, carbon);
                updateFloatingSummary(carbon);
            });
        });
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

        floatingWidget.innerText = `Session total: 🌿 ${current.toFixed(3)}g`;
        floatingWidget.style.background = getImpactColor(current, current);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            totalCO2 = end;
            floatingWidget.innerText = `Session total: 🌿 ${totalCO2.toFixed(3)}g`;
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

        // Dynamic target cycles
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

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (gramsCO2 - start) * progress;

        let prefix = "This prompt: ";
        bubble.innerHTML = `${prefix}<strong style="color: inherit;">🌿 ${current.toFixed(3)}g CO₂</strong>`;
        const impactColor = getImpactColor(current, totalCO2);
        bubble.style.background = hexToRgba(impactColor, 0.1);
        bubble.style.color = getImpactColor(current, totalCO2);


        desc.textContent = "";
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

function hexToRgba(hex, alpha = 0.15) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clearEcoFeedbackUI() {
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


function resetCO2Counter() {
    totalCO2 = 0;

    if (floatingWidget && document.body.contains(floatingWidget)) {
        const valueEl = floatingWidget.querySelector(".eco-orb__value");
        const metaphorText = floatingWidget.querySelector(".eco-orb__text");
        const iconEl = floatingWidget.querySelector(".eco-orb__icon");
        // Reset values
        valueEl.textContent = "0.000";
        metaphorText.textContent = "Sending an email"; // or something default
        iconEl.textContent = "📩";

        floatingWidget.style.setProperty("--progress", "0");
        floatingWidget.style.setProperty("--ring", getImpactColor(0));
    }

    console.log("🧼 CO₂ counter reset.");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCurrentCO2") {
        sendResponse({
            currentTotal: totalCO2
        });
    }

    if (message.action === "simulateCO2") {
        const value = message.simulatedTotal;
        totalCO2 = value;

        clearEcoFeedbackUI();
        totalCO2 = value;
        const assistantMessages = document.querySelectorAll(
            'div[data-message-author-role="assistant"]'
        );
        const last = assistantMessages[assistantMessages.length - 1];
        const outputNode = last?.querySelector(".markdown");

        if (outputNode) {
            insertPlaceholderBubble(outputNode);
            updatePlaceholderWithCO2(outputNode, value);
            updateFloatingSummary(0); // triggers metaphor + cumulative
        }
    }
});

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
        background: "rgba(0, 0, 0, 0.05)",
        opacity: "0.8",
        color: "#333",
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

    // Hide the orb while popover is open
    if (floatingWidget) floatingWidget.style.display = "none";

    const popover = document.createElement("div");
    popover.className = "eco-popover";
    Object.assign(popover.style, {
        position: "fixed",
        top: "0",
        right: "0",
        width: "360px",
        height: "100%",
        background: "#fff",
        borderLeft: "1px solid #ccc",
        boxShadow: "-2px 0 12px rgba(0,0,0,0.1)",
        padding: "28px 24px",
        zIndex: 10000,
        overflowY: "auto",
        fontFamily: "system-ui, sans-serif"
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
    activePopover = popover;

    // Handle outside click to close
    setTimeout(() => {
        function handleClickOutside(e) {
            if (!popover.contains(e.target)) {
                removeExistingPopover();
                document.removeEventListener("click", handleClickOutside);
            }
        }
        document.addEventListener("click", handleClickOutside);
    }, 0);
}

function removeExistingPopover() {
    const existing = document.querySelector(".eco-popover");
    if (existing) existing.remove();
    if (floatingWidget) floatingWidget.style.display = "block";
}


function getMetaphor(gramsCO2) {

    function pick(options) {
        return options[Math.floor(Math.random() * options.length)];
    }

    const contextualLine = pick([
        "That might not sound like much, but digital activities add up fast.",
        "Even small emissions can scale dramatically with millions of users.",
        "These small footprints can accumulate into significant climate impacts."
    ]);

    const climateLine = pick([
        "CO₂ traps heat in the atmosphere, accelerating climate change.",
        "Every gram of CO₂ contributes to global warming.",
        "Reducing emissions — even small ones — helps curb temperature rise."
    ]);

    if (gramsCO2 <= 0.02) {
        return pick([{
            icon: "📩",
            text: "≈ Sending an email",
            source: "Berners-Lee (2010)",
            details: `A short plain-text email emits ~0.02g CO₂. ${contextualLine}`,
            moreInfo: "https://archive.org/details/howbadarebananas0000bern",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 0.1) {
        return pick([{
            icon: "🔍",
            text: "≈ 5 Google searches",
            source: "Google (2009)",
            details: `Each search emits ~0.02g CO₂. ${contextualLine}`,
            moreInfo: "https://googleblog.blogspot.com/2009/01/powering-google-search.html",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 0.3) {
        return pick([{
            icon: "🛍️",
            text: "≈ Making a plastic bag",
            source: "EPA (2020)",
            details: `Manufacturing a small plastic item like a bag or carton emits ~0.3g CO₂. ${contextualLine}`,
            moreInfo: "https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling/plastics-material-specific-data",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 0.6) {
        return pick([{
            icon: "🚿",
            text: "≈ 5 min of hot shower water",
            source: "Carbon Footprint Ltd",
            details: `Heating 15 liters for a short shower uses ~0.6g CO₂. ${contextualLine}`,
            moreInfo: "https://www.carbonfootprint.com/energyconsumption.html",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 1.5) {
        return pick([{
            icon: "🧴",
            text: "≈ Making 1 plastic bottle cap",
            source: "PlasticsEurope",
            details: `A small HDPE bottle cap emits ~1.5g CO₂. ${contextualLine}`,
            moreInfo: "https://plasticseurope.org/knowledge-hub/life-cycle-assessment/",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 3.0) {
        return pick([{
            icon: "♻️",
            text: "≈ Throwing away a PET bottle",
            source: "Zero Waste Europe",
            details: `A 500ml PET bottle emits ~3g CO₂. ${contextualLine}`,
            moreInfo: "https://zerowasteeurope.eu/2020/07/the-carbon-footprint-of-plastics/",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 6.0) {
        return pick([{
            icon: "💡",
            text: "≈ 1 hr of LED lighting",
            source: "Carbon Trust",
            details: `A 10W LED bulb emits ~6g CO₂/hour. ${contextualLine}`,
            moreInfo: "https://www.carbontrust.com/resources/carbon-footprinting-guide",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 10.0) {
        return pick([{
            icon: "🚰",
            text: "≈ 5 min of heated tap water",
            source: "UK Government Data (BEIS)",
            details: `Heating water for 5 mins emits ~10g CO₂. ${contextualLine}`,
            moreInfo: "https://www.gov.uk/government/statistics/energy-consumption-in-the-uk",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 15.0) {
        return pick([{
                icon: "🧊",
                text: "≈ Running a fridge for 12 hrs",
                source: "IEA (2020)",
                details: "A modern fridge uses ~30W. Over 12 hours, that adds up to ~12g CO₂ in the EU.",
                moreInfo: "https://www.iea.org/reports/tracking-buildings-2020",
                whyItMatters: climateLine
            },
            {
                icon: "🗓️",
                text: "Doing this daily ≈ 10kg CO₂/year",
                source: "ScienceDirect (2019)",
                details: "Even modest daily digital actions can surpass the annual footprint of a low-energy laptop.",
                moreInfo: "https://www.sciencedirect.com/science/article/pii/S1364032119302794",
                whyItMatters: climateLine
            }
        ]);
    }

    if (gramsCO2 <= 25.0) {
        function pick(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }
        return pick([{
                icon: "🔁",
                text: "≈ 125 Google searches",
                source: "Google (2009)",
                details: `~0.2g per search × 125 = 25g CO₂. ${contextualLine}`,
                moreInfo: "https://googleblog.blogspot.com/2009/01/powering-google-search.html",
                whyItMatters: climateLine
            },
            {
                icon: "📉",
                text: "≈ 0.2% of your yearly CO₂ budget",
                source: "Nature Climate Change (2018)",
                details: `To meet the 1.5°C goal, each person is ‘allowed’ ~2 tons/year. A ${gramsCO2.toFixed(1)}g action eats into that fast.`,
                moreInfo: "https://www.nature.com/articles/s41558-018-0091-3",
                whyItMatters: climateLine
            }
        ]);
    }

    if (gramsCO2 <= 40.0) {
        return pick([{
            icon: "🧺",
            text: "≈ 1 laundry cycle",
            source: "IEA (2022)",
            details: `One cycle emits ~35g CO₂ on average. ${contextualLine}`,
            moreInfo: "https://www.iea.org/reports/tracking-buildings-2020",
            whyItMatters: climateLine
        }]);
    }

    if (gramsCO2 <= 60.0) {
        return pick([{
                icon: "📦",
                text: "≈ Shipping an online order",
                source: "Carbon Trust",
                details: `Small parcel delivery can emit ~60g CO₂. ${contextualLine}`,
                moreInfo: "https://www.carbontrust.com/news-and-events/insights/the-carbon-footprint-of-delivery",
                whyItMatters: climateLine
            },
            {
                icon: "🌍",
                text: "≈ If 1M people did this daily, it would add 20,000 cars on the road",
                source: "Our World in Data",
                details: "If 1M people did this daily, it would equal to 20,000 cars on the road. Small actions feel negligible — but scaled globally, they compete with transport emissions.",
                moreInfo: "https://ourworldindata.org/co2-emissions-from-transport",
                whyItMatters: climateLine
            }
        ]);
    }

    return pick([{
        icon: "⚠️",
        text: "≈ 200 Google searches",
        source: "Luccioni et al. (2023)",
        details: `Heavy AI tasks (image generation, large LLMs) can emit over 100g CO₂ per call. ${contextualLine}`,
        moreInfo: "https://arxiv.org/abs/2104.10350",
        whyItMatters: climateLine
    }]);
}


function ensureEcoOrbStyles() {
    if (document.getElementById("eco-orb-styles")) return;
    const style = document.createElement("style");
    style.id = "eco-orb-styles";
    style.textContent = `
    #eco-orb * {
      pointer-events: none;
    }

    #eco-orb {
      cursor: pointer;
    }
  `;
    document.head.appendChild(style);
}