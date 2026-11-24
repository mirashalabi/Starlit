document.addEventListener("DOMContentLoaded", () => {
    const includeTargets = document.querySelectorAll("[data-include]");

    includeTargets.forEach(el => {
        const file = el.getAttribute("data-include");

        fetch(file)
            .then(response => response.text())
            .then(data => {
                el.innerHTML = data;

                // ✅ IMPORTANT: run after navbar/footer is injected
                if (file.includes("navbar") && typeof initMobileMenu === "function") {
                    initMobileMenu();
                }
            })
            .catch(err => {
                console.error("Include error:", err);
                el.innerHTML = "Failed to load content.";
            });
    });
});
