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

        // Use the same photo source as Rentals:
        // Prefer item.image if it exists, otherwise use item.images[0]
        let imgSrc = item.image || (item.images && item.images[0]) || "";

        // Optional: if you want a hard fallback placeholder:
        // if (!imgSrc) {
        // imgSrc = "assets/images/rentals/placeholder.jpg";
        // }

        row.innerHTML = `
            <img src="${imgSrc}" class="inquiry-thumb" alt="${item.name}">
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
    const itemsField = document.getElementById("inquiry_items_field");
    const summaryField = document.getElementById("inquiry_summary_field");
    const successMsg = document.getElementById("contactSuccess");
    const errorMsg = document.getElementById("contactError");

    if (!form || !itemsField || !summaryField) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Hide messages
        if (successMsg) successMsg.hidden = true;
        if (errorMsg) errorMsg.hidden = true;

        /* -------------------------
           REQUIRED FIELD VALIDATION
        -------------------------- */
        const requiredFields = [
            "name",
            "lastname",
            "email",
            "phone",
            "inquiry_type",
            "message"
        ];

        let hasError = false;

        requiredFields.forEach(name => {
            const field = form.querySelector(`[name="${name}"]`);
            if (!field || !field.value.trim()) {
                hasError = true;
                field?.classList.add("field-error");
            } else {
                field?.classList.remove("field-error");
            }
        });

        if (hasError) {
            if (errorMsg) errorMsg.hidden = false;
            return; // ⛔ STOP submission
        }

        /* -------------------------
           BUILD INQUIRY ITEMS
        -------------------------- */
        const list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");

        let itemsText = "No rental items added.";

        if (list.length > 0) {
            itemsText = list
                .map(item => {
                    const name = item.name || "Unnamed item";
                    const category = item.category || "Uncategorized";
                    const price = item.price ? `$${item.price}` : "Price not listed";
                    return `• ${name} (${category}) – ${price}`;
                })
                .join("\n");
        }

        itemsField.value = itemsText;

        /* -------------------------
           BUILD SUMMARY
        -------------------------- */
        const fd = new FormData(form);

        summaryField.value = `
CONTACT DETAILS
-------------------------
Name: ${fd.get("name")} ${fd.get("lastname")}
Email: ${fd.get("email")}
Phone: ${fd.get("phone")}

INQUIRY DETAILS
-------------------------
Inquiry Type: ${fd.get("inquiry_type")}
Event Date: ${fd.get("event_date") || "Not provided"}

MESSAGE
-------------------------
${fd.get("message")}

INQUIRY ITEMS
-------------------------
${itemsText}
        `.trim();

        /* -------------------------
           SEND TO NETLIFY
        -------------------------- */
        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(new FormData(form)).toString()
        })
        .then(() => {
            form.reset();
            localStorage.removeItem("inquiryItems");
            renderInquiryCart();

            if (errorMsg) errorMsg.hidden = true;   // ✅ hide error
            if (successMsg) successMsg.hidden = false;
        })
        .catch(err => {
            console.error(err);
            alert("Submission failed. Please try again.");
        });
    });
}

