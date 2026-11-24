// Load inquiry items from LocalStorage
function loadInquiry() {
    const items = JSON.parse(localStorage.getItem("inquiryItems") || "[]");
    const container = document.getElementById("inquiryItems");
    const emptyState = document.getElementById("inquiryEmpty");

    container.innerHTML = "";

    if (items.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    items.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("inquiry-item-card");
        div.innerHTML = `
            <img src="assets/images/rentals/${item.image}" alt="">
            <div>
                <p class="inq-item-name">${item.name}</p>
                <p class="inq-item-cat">${item.category}</p>
                <button class="remove-inquiry" data-id="${item.sku}">Remove</button>
            </div>
        `;
        container.appendChild(div);
    });

    // Hidden field to send to Netlify
    document.getElementById("inqItemsField").value = items.map(i => i.name).join(", ");
}

document.addEventListener("click", e => {
    if (e.target.classList.contains("remove-inquiry")) {
        const sku = e.target.dataset.id;
        let items = JSON.parse(localStorage.getItem("inquiryItems") || "[]");
        items = items.filter(i => i.sku !== sku);
        localStorage.setItem("inquiryItems", JSON.stringify(items));
        loadInquiry();
    }
});

// Delivery toggle
const method = document.getElementById("inqMethod");
const addressWrap = document.getElementById("deliveryAddressWrapper");

method.addEventListener("change", () => {
    addressWrap.hidden = method.value !== "Delivery";
});

// Initial load
loadInquiry();
