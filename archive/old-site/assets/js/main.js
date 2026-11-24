// assets/js/main.js

// ---------- CONFIG ----------

// Google Sheets -> GViz JSON endpoint
const RENTALS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rcfJdQcWe4X3pP4EH4-0OaGooQiFTMBoyglDH2H9UGU/gviz/tq?tqx=out:json&gid=0";

const PHOTOGRAPHY_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rcfJdQcWe4X3pP4EH4-0OaGooQiFTMBoyglDH2H9UGU/gviz/tq?tqx=out:json&gid=1097452701";

const EVENTS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rcfJdQcWe4X3pP4EH4-0OaGooQiFTMBoyglDH2H9UGU/gviz/tq?tqx=out:json&gid=1019661179";

const RENTAL_CATEGORIES = [
  "Backdrops and Stands",
  "Board Games",
  "Bridal and Party Wear",
  "Decor and Display",
  "Dining Accessories",
  "Setup and Tools"
];

// ---------- UTILITIES ----------

function normalizeCategory(raw) {
  if (!raw) return "Other";
  return String(raw).replace(/&/g, "and").trim();
}

function showToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.hidden = false;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 300);
  }, 1600);
}

function formatPrice(value) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  if (num < 1) return `$${num.toFixed(2)} / day`;
  return `$${num.toFixed(0)} / day`;
}

// Parse Google GViz JSON
function parseGvizJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.substring(start, end + 1));
}

// ---------- RENTALS PAGE ----------

let allRentalItems = [];
let currentCategory = "All";
let currentSearchTerm = "";
let currentSortMode = "none";
let currentPage = 1;

function getItemsPerPage() {
    if (window.innerWidth < 600) return 10;
    return 15;
}
const ITEMS_PER_PAGE = getItemsPerPage();


function setupRentals() {
  const rentalGrid = document.getElementById("rentalGrid");
  if (!rentalGrid) return;

  const searchBox = document.getElementById("searchBox");
  const sortSelect = document.getElementById("sortSelect");
  const categoryList = document.getElementById("categoryFilters");
  const emptyState = document.getElementById("rentalEmptyState");

  const categories = ["All", ...RENTAL_CATEGORIES];
  categories.forEach((cat, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.className = "category-chip" + (idx === 0 ? " active" : "");
    btn.addEventListener("click", () => {
      currentCategory = cat;
      currentPage = 1;
      document.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderRentals();
    });
    li.appendChild(btn);
    categoryList.appendChild(li);
  });

  populateMobileCategories(categories);

  if (searchBox) {
    searchBox.addEventListener("input", () => {
      currentSearchTerm = searchBox.value.toLowerCase().trim();
      currentPage = 1;
      renderRentals();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSortMode = sortSelect.value;
      currentPage = 1;
      renderRentals();
    });
  }

  fetch(RENTALS_SHEET_URL)
    .then(res => res.text())
    .then(text => {
      const json = parseGvizJson(text);
      const rows = json.table.rows || [];

      const itemsByName = new Map();
      let currentName = null;

      rows.forEach(row => {
        const cells = row.c || [];
        const nameCell = cells[1];
        const catCell = cells[2];
        const priceCell = cells[5];
        const photoCell = cells[6];
        const descCell = cells[3];

        const nameValue = nameCell?.v ? String(nameCell.v).trim() : null;

        if (nameValue) {
          currentName = nameValue;
          if (!itemsByName.has(currentName)) {
            itemsByName.set(currentName, {
              name: currentName,
              category: normalizeCategory(catCell?.v),
              price: priceCell?.v || null,
              description: descCell?.v || "",
              images: []
            });
          }
        }

        if (!currentName) return;

        const item = itemsByName.get(currentName);

        if (photoCell?.v) {
          item.images.push(`assets/images/rentals/${String(photoCell.v).trim()}.JPG`);
        }
      });

      allRentalItems = Array.from(itemsByName.values()).filter(item => item.images.length > 0);
      renderRentals();
    })
    .catch(err => {
      console.error("Error loading rentals:", err);
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = "Unable to load rentals.";
      }
    });

  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  if (prevBtn && nextBtn) {
      prevBtn.addEventListener("click", () => {
          if (currentPage > 1) {
              currentPage--;
              renderRentals();
          }
      });

      nextBtn.addEventListener("click", () => {
          currentPage++;
          renderRentals();
      });
  }

}

// ---------- GLOBAL renderRentals() ADDED ----------
function renderRentals() {
    const rentalGrid = document.getElementById("rentalGrid");
    const emptyState = document.getElementById("rentalEmptyState");

    rentalGrid.innerHTML = "";
    let items = [...allRentalItems];

    if (currentCategory !== "All") {
        items = items.filter(i => i.category === currentCategory);
    }

    if (currentSearchTerm) {
        items = items.filter(i =>
            i.name.toLowerCase().includes(currentSearchTerm)
        );
    }

    if (currentSortMode === "low")
        items.sort((a, b) => (a.price || 0) - (b.price || 0));

    if (currentSortMode === "high")
        items.sort((a, b) => (b.price || 0) - (a.price || 0));

    if (currentSortMode === "name")
        items.sort((a, b) => a.name.localeCompare(b.name));

    if (!items.length) {
        emptyState.hidden = false;
        return;
    } else emptyState.hidden = true;

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = items.slice(start, end);

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} of ${totalPages || 1}`;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;

    paginatedItems.forEach(item => {
        const card = document.createElement("article");
        card.className = "rental-card";
        card.dataset.item = JSON.stringify(item);

        const imgWrap = document.createElement("div");
        imgWrap.className = "rental-image";

        const img = document.createElement("img");
        img.src = item.images[0];
        img.alt = item.name;
        imgWrap.appendChild(img);

        const body = document.createElement("div");
        body.className = "rental-body";

        const cat = document.createElement("span");
        cat.className = "rental-category";
        cat.textContent = item.category;

        const title = document.createElement("h3");
        title.className = "rental-name";
        title.textContent = item.name;

        const price = document.createElement("p");
        price.className = "rental-price";
        price.textContent = formatPrice(item.price);

        body.appendChild(cat);
        body.appendChild(title);
        if (price.textContent) body.appendChild(price);

        card.appendChild(imgWrap);
        card.appendChild(body);
        rentalGrid.appendChild(card);

        if (item.images.length > 1) {
            let interval = null;
            let idx = 1;

            card.addEventListener("mouseenter", () => {
                if (interval) return;
                img.src = item.images[idx];
                interval =
                    setInterval(() => {
                        idx = (idx + 1) % item.images.length;
                        if (idx === 0) idx = 1;
                        img.src = item.images[idx];
                    }, 10000);
            });

            card.addEventListener("mouseleave", () => {
                if (interval) clearInterval(interval);
                interval = null;
                img.src = item.images[0];
                idx = 1;
            });
        }
    });
}

// ---------- PHOTOGRAPHY ----------

function setupPhotography() {
  const grid = document.getElementById("photographyGrid");
  if (!grid) return;

  fetch(PHOTOGRAPHY_SHEET_URL)
    .then(res => res.text())
    .then(text => {
      const json = parseGvizJson(text);
      const rows = json.table.rows || [];

      const services = new Map();
      let currentService = null;

      rows.forEach(row => {
        const c = row.c || [];

        const serviceCell = c[0];
        const taglineCell = c[2];
        const durationCell = c[3];
        const priceCell = c[5];
        const photoCell = c[6];

        const serviceName = serviceCell?.v ? String(serviceCell.v).trim() : null;

        if (serviceName) {
          currentService = serviceName;

          if (!services.has(currentService)) {
            services.set(currentService, {
              name: currentService,
              tagline: taglineCell?.v || "",
              duration: durationCell?.v || "",
              price: priceCell?.v || "",
              images: []
            });
          }
        }

        if (!currentService) return;

        const svc = services.get(currentService);

        if (photoCell?.v) {
          svc.images.push(`assets/images/photography/${String(photoCell.v).trim()}.JPG`);
        }
      });

      renderPhotography(Array.from(services.values()));
    });

  function renderPhotography(list) {
    grid.innerHTML = "";

    list.forEach(svc => {
      const card = document.createElement("article");
      card.className = "photo-card unified-card";

      const imgWrap = document.createElement("div");
      imgWrap.className = "photo-image";

      const img = document.createElement("img");
      img.src = svc.images[0];
      img.alt = svc.name;
      imgWrap.appendChild(img);

      const body = document.createElement("div");
      body.className = "photo-body unified-body";

      const title = document.createElement("h3");
      title.textContent = svc.name;
      body.appendChild(title);

      if (svc.tagline) {
        const t = document.createElement("p");
        t.className = "photo-tagline";
        t.textContent = svc.tagline;
        body.appendChild(t);
      }

      if (svc.price || svc.duration) {
        const p = document.createElement("p");
        p.className = "photo-price";

        const priceText = svc.price ? `$${svc.price}` : "";
        const durationText = svc.duration ? `${svc.duration} hr` : "";

        p.textContent = durationText
          ? `Starting at ${priceText} / ${durationText}`
          : `Starting at ${priceText}`;

        body.appendChild(p);
      }

      card.appendChild(imgWrap);
      card.appendChild(body);
      grid.appendChild(card);

      if (svc.images.length > 1) {
        let interval = null;
        let idx = 1;

        card.addEventListener("mouseenter", () => {
          if (interval) return;
          img.src = svc.images[idx];
          interval =
            setInterval(() => {
              idx++;
              if (idx >= svc.images.length) idx = 1;
              img.src = svc.images[idx];
            }, 10000);
        });

        card.addEventListener("mouseleave", () => {
          if (interval) clearInterval(interval);
          interval = null;
          img.src = svc.images[0];
          idx = 1;
        });
      }
    });
  }
}

// ---------- EVENTS (Google Sheets) ----------

function setupEvents() {
  const container = document.getElementById("eventsContainer");
  if (!container) return;

  fetch(EVENTS_SHEET_URL)
    .then(res => res.text())
    .then(text => {
      const json = parseGvizJson(text);
      const rows = json.table.rows || [];

      const events = new Map();
      let currentEvent = null;

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // skip header row

        const c = row.c || [];
        const nameCell = c[0];
        const descCell = c[1];
        const photoCell = c[2];

        const eventName = nameCell?.v ? String(nameCell.v).trim() : null;

        if (eventName) {
          currentEvent = eventName;
          if (!events.has(currentEvent)) {
            events.set(currentEvent, {
              name: currentEvent,
              description: descCell?.v || "",
              images: []
            });
          }
        }

        if (!currentEvent) return;

        if (photoCell?.v) {
          events.get(currentEvent).images.push(
            `assets/images/events/${String(photoCell.v).trim()}.JPG`
          );
        }
      });

      renderEvents(Array.from(events.values()));
    });

  function renderEvents(list) {
    container.innerHTML = "";

    list.forEach((evt, index) => {
      const row = document.createElement("div");
      row.className = "event-row";

      const text = document.createElement("div");
      text.className = "event-text";
      text.innerHTML = `
        <h2>${evt.name}</h2>
        <p>${evt.description}</p>
      `;

      const carousel = document.createElement("div");
      carousel.className = "event-carousel";

      evt.images.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = evt.name;
        if (i === 0) img.classList.add("show");
        carousel.appendChild(img);
      });

      if (index % 2 === 0) {
        row.appendChild(text);
        row.appendChild(carousel);
      } else {
        row.appendChild(carousel);
        row.appendChild(text);
      }

      container.appendChild(row);

      const imgs = carousel.querySelectorAll("img");
      if (imgs.length > 1) {
        let idx = 0;

        setInterval(() => {
          imgs[idx].classList.remove("show");
          idx = (idx + 1) % imgs.length;
          imgs[idx].classList.add("show");
        }, 5000);
      }
    });
  }
}

// ---------- HOME PAGE REVIEWS ----------

function setupReviewCarousel() {
  const slides = document.querySelectorAll(".review-slide");
  if (!slides.length) return;

  const dots = document.querySelectorAll(".review-dots .dot");
  const prev = document.querySelector(".review-arrow-left");
  const next = document.querySelector(".review-arrow-right");

  slides.forEach(slide => {
    const bg = slide.dataset.bg;

    if (bg) {
      slide.style.backgroundImage = `url("assets/images/reviews/${bg}")`;
      slide.style.backgroundSize = "cover";
      slide.style.backgroundPosition = "center";
    }
  });

  let current = 0;
  let interval = null;

  function show(i) {
    current = (i + slides.length) % slides.length;

    slides.forEach((s, idx) => s.classList.toggle("active", idx === current));
    dots.forEach((d, idx) => d.classList.toggle("active", idx === current));
  }

  function start() {
    interval = setInterval(() => show(current + 1), 7000);
  }

  function stop() {
    if (interval) clearInterval(interval);
  }

  prev?.addEventListener("click", () => {
    stop();
    show(current - 1);
    start();
  });

  next?.addEventListener("click", () => {
    stop();
    show(current + 1);
    start();
  });

  dots.forEach((d) =>
    d.addEventListener("click", () => {
      stop();
      show(Number(d.dataset.index));
      start();
    })
  );

  show(0);
  start();
}

// ------------------------------------------------------
// RENTAL POPUP MODAL
// ------------------------------------------------------

const modal = document.getElementById("rentalModal");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDescription = document.getElementById("modalDescription");
const modalMainImage = document.getElementById("modalMainImage");
const modalThumbs = document.getElementById("modalThumbs");

// Close modal
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-close") || e.target === modal) {
    modal.hidden = true;
  }
});

// Open modal when clicking a rental card
document.addEventListener("click", (e) => {
  const card = e.target.closest(".rental-card");
  if (!card) return;

  const item = JSON.parse(card.dataset.item);
  if (!item) return;

  window.currentModalItem = item;

  // Fill modal
  modalTitle.textContent = item.name;
  modalPrice.textContent = item.price ? `$${item.price} / day` : "";
  modalDescription.textContent = item.description || "No description available.";

  // Remove any existing Add-to-Inquiry buttons
  modal.querySelectorAll(".modal-add-btn").forEach(btn => btn.remove());

  // Create new button
  const addBtn = document.createElement("button");
  addBtn.className = "modal-add-btn";

  // Load inquiry list
  let inquiryList = JSON.parse(localStorage.getItem("inquiryItems") || "[]");
  let alreadyIn = inquiryList.some(i => i.name === item.name);

  if (alreadyIn) {
      addBtn.textContent = "Already in Inquiry";
      addBtn.disabled = true;
      addBtn.style.background = "#ccc";
      addBtn.style.color = "#555";
  } else {
      addBtn.textContent = "Add to Inquiry";

      addBtn.onclick = () => {
          addItemToInquiry(item);

          addBtn.textContent = "Already in Inquiry";
          addBtn.disabled = true;
          addBtn.style.background = "#ccc";
          addBtn.style.color = "#555";

          showToast();
      };
  }

  modalDescription.insertAdjacentElement("afterend", addBtn);

  // Main image
  modalMainImage.src = item.images[0];

  // Thumbnails
  modalThumbs.innerHTML = "";
  item.images.forEach((src, index) => {
    const t = document.createElement("img");
    t.src = src;
    if (index === 0) t.classList.add("active");

    t.onclick = () => {
      modalMainImage.src = src;
      modalThumbs.querySelectorAll("img").forEach(i => i.classList.remove("active"));
      t.classList.add("active");
    };

    modalThumbs.appendChild(t);
  });

  modal.hidden = false;
});

function addItemToInquiry(item) {
  let list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");

  // No duplicates
  if (!list.some(x => x.name === item.name)) {
    list.push(item);
  }

  localStorage.setItem("inquiryItems", JSON.stringify(list));
}



// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  setupRentals();
  setupPhotography();
  setupEvents();
  setupReviewCarousel();
  
  document.querySelectorAll(".wwd-card[data-bg]").forEach(card => {
    card.style.backgroundImage = `url('${card.dataset.bg}')`;
  });


  // ---------------------------
  // INQUIRY CART SYSTEM
  // ---------------------------

  function loadInquiry() {
      return JSON.parse(localStorage.getItem("inquiryItems") || "[]");
  }

  function saveInquiry(list) {
      localStorage.setItem("inquiryItems", JSON.stringify(list));
  }

  function addToInquiry(item) {
      let list = loadInquiry();

      // Prevent duplicates
      if (!list.some(i => i.name === item.name)) {
          list.push(item);
          saveInquiry(list);
          showToast("Added to inquiry");
      } else {
          showToast("Already in inquiry");
      }
  }

  function showToast(msg) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.hidden = false;
      t.classList.add("show");

      setTimeout(() => {
          t.classList.remove("show");
          t.hidden = true;
      }, 2000);
  }

  const addBtn = document.getElementById("addToInquiryBtn");
  if (addBtn) {
      addBtn.addEventListener("click", () => {
          if (window.currentModalItem) {
              addToInquiry(window.currentModalItem);
          }
      });
  }

});


// ADD TO INQUIRY BUTTON HANDLER (modal)
document.addEventListener("click", (e) => {
    if (e.target.id === "addToInquiryBtn") {

        if (!window.currentModalItem) return;

        const item = window.currentModalItem;

        const newItem = {
            sku: item.name.replace(/\s+/g, "_"),
            name: item.name,
            category: item.category,
            image: item.images[0]
        };

        let list = JSON.parse(localStorage.getItem("inquiryItems") || "[]");

        if (!list.find(i => i.sku === newItem.sku)) {
            list.push(newItem);
            localStorage.setItem("inquiryItems", JSON.stringify(list));
        }

        e.target.textContent = "Added!";
        e.target.style.background = "#b98b5a";
        e.target.style.color = "#fff";

        setTimeout(() => {
            e.target.textContent = "Add to Inquiry";
            e.target.style.background = "";
            e.target.style.color = "";
        }, 1200);
    }
});


// ================================
// POPULATE MOBILE CATEGORY DROPDOWN
// ================================

function populateMobileCategories(categories) {
    const select = document.getElementById("mobileCategorySelect");
    if (!select) return;

    select.innerHTML = ""; // reset dropdown

    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });

    // 🔥 FIXED: Mobile dropdown instantly filters without refresh
    select.addEventListener("change", () => {
        currentCategory = select.value;
        currentPage = 1;
        renderRentals();  // Now works because renderRentals is global
    });
}

// ================================
// FULLSCREEN MOBILE MENU (WORKS WITH include.js)
// ================================

function initMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    const openBtn = document.querySelector(".nav-toggle");
    const closeBtn = document.querySelector(".mobile-menu-close");

    if (!menu || !openBtn || !closeBtn) return;

    openBtn.addEventListener("click", () => {
        menu.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    closeBtn.addEventListener("click", () => {
        menu.classList.remove("show");
        document.body.style.overflow = "";
    });
}

// Header is injected → wait a moment before binding
/*document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initMobileMenu, 50);
});*/

