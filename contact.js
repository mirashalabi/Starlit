// contact.js
// Handles displaying the inquiry cart on the Contact page

document.addEventListener("DOMContentLoaded", () => {
    renderInquiryCart();
    setupFormSubmit();
});

/* ----------------------------------------------------
   LOAD & RENDER INQUIRY CART
---------------------------------------------------- */
function renderInquiryCart() {
    const list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");

    const container = document.getElementById("inquiryItemsList");
    const emptyMsg = document.getElementById("emptyInquiryMessage");

    if (!container || !emptyMsg) return;

    container.innerHTML = "";

    if (list.length === 0) {
        emptyMsg.style.display = "block";
        return;
    }

    emptyMsg.style.display = "none";

    list.forEach(item => {
        const row = document.createElement("div");
        row.className = "inquiry-row";

        row.innerHTML = `
            <img src="${item.image}" class="inquiry-thumb" alt="${item.name}">
            <span class="inquiry-item-name">${item.name}</span>
            <button class="inquiry-remove-btn" data-name="${item.name}">
                ✕
            </button>
        `;

        container.appendChild(row);
    });

    // Attach remove events
    document.querySelectorAll(".inquiry-remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            removeInquiryItem(btn.dataset.name);
        });
    });
}

/* ----------------------------------------------------
   REMOVE ITEM FROM LOCAL STORAGE
---------------------------------------------------- */
function removeInquiryItem(name) {
    let list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");
    list = list.filter(item => item.name !== name);
    localStorage.setItem("inquiryItems", JSON.stringify(list));

    renderInquiryCart(); // Re-render
}

/* ----------------------------------------------------
   NETLIFY FORM SUBMISSION – APPEND INQUIRY ITEMS
---------------------------------------------------- */
function setupFormSubmit() {
    const form = document.getElementById("contactForm");
    const hiddenField = document.getElementById("inquiry_items_field");

    if (!form || !hiddenField) return;

    form.addEventListener("submit", () => {
        const list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");

        if (list.length === 0) {
            hiddenField.value = "No rental items added.";
        } else {
            hiddenField.value = list
                .map(i => `• ${i.name}`)
                .join("\n");
        }
    });
}
