document.addEventListener("DOMContentLoaded", () => {
    const includeTargets = document.querySelectorAll("[data-include]");

    includeTargets.forEach(el => {
        const file = el.getAttribute("data-include");

        fetch(file)
            .then(response => response.text())
            .then(data => {
                el.innerHTML = data;
            })
            .catch(err => {
                console.error("Include error:", err);
                el.innerHTML = "Footer failed to load.";
            });
    });
});
