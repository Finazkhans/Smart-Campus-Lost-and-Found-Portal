
const API_BASE = "http://localhost:5000/api";
const SERVER_URL = "http://localhost:5000";

const TOKEN_KEY = "campusfind_token";
const USER_KEY = "campusfind_user";

// =====================================
// COMMON FUNCTIONS
// =====================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
        return null;
    }
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getImageUrl(url) {
    if (!url) return "";

    try {
        return new URL(String(url).trim(), SERVER_URL + "/").href;
    } catch {
        return "";
    }
}

function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "green" : "crimson";
}

// =====================================
// API FUNCTION
// =====================================

async function api(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (getToken()) {
        headers.Authorization = `Bearer ${getToken()}`;
    }

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(API_BASE + endpoint, {
            ...options,
            headers
        });
    } catch {
        throw new Error(
            "Cannot connect to backend. Check server and network."
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `Server error: ${response.status}`
        );
    }

    return data;
}

// =====================================
// ADMIN NAVIGATION
// =====================================

function addAdminOption() {
    const user = getUser();

    if (!user || user.role !== "admin") return;

    if (document.getElementById("adminNavLink")) return;

    const nav =
        document.querySelector(".nav-links") ||
        document.querySelector("nav ul") ||
        document.querySelector("nav");

    if (!nav) return;

    const link = document.createElement("a");

    link.id = "adminNavLink";
    link.href = "admin.html";
    link.textContent = "Admin";

    nav.appendChild(link);
}

// =====================================
// LOGOUT
// =====================================

function setupLogout() {
    const button = document.getElementById("logoutBtn");

    if (!button) return;

    button.addEventListener("click", () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = "login.html";
    });
}

// =====================================
// LOGIN
// =====================================

function setupLogin() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const message = document.getElementById("formMessage");
        const formData = new FormData(form);

        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: formData.get("email"),
                    password: formData.get("password")
                })
            });

            if (!data.token) {
                throw new Error("Login token missing.");
            }

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user || {})
            );

            window.location.href = "dashboard.html";

        } catch (error) {
            showMessage(message, error.message);
        }
    });
}

// =====================================
// REGISTER
// =====================================

function setupRegister() {
    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const message = document.getElementById("formMessage");
        const formData = new FormData(form);

        try {
            const data = await api("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    password: formData.get("password"),
                    studentId: formData.get("studentId")
                })
            });

            showMessage(
                message,
                data.message || "Registration successful!",
                true
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            showMessage(message, error.message);
        }
    });
}

// =====================================
// REPORT LOST / FOUND
// =====================================

function setupReports() {
    const forms = [
        document.getElementById("lostForm"),
        document.getElementById("foundForm")
    ];

    forms.forEach(form => {
        if (!form) return;

        form.addEventListener("submit", async event => {
            event.preventDefault();

            const message = form.querySelector("#formMessage");

            if (!getToken()) {
                alert("Please login first.");
                window.location.href = "login.html";
                return;
            }

            try {
                const formData = new FormData(form);
                formData.set("type", form.dataset.type);

                const data = await api("/items", {
                    method: "POST",
                    body: formData
                });

                showMessage(
                    message,
                    data.message || "Report submitted successfully!",
                    true
                );

                form.reset();

            } catch (error) {
                showMessage(message, error.message);
            }
        });
    });
}

// =====================================
// IMAGE DISPLAY
// =====================================

function createItemImage(imageUrl, title) {
    if (!imageUrl) {
        return "<div class='item-image-placeholder'>No image uploaded</div>";
    }

    const image = getImageUrl(imageUrl);

    return `
        <div class="item-image-container">
            <a href="${escapeHTML(image)}"
               target="_blank"
               rel="noopener noreferrer">
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(title)}"
                    style="width:100%;height:250px;object-fit:contain;background:#f3f4f8;border-radius:14px;"
                >
            </a>
        </div>
    `;
}

// =====================================
// DISPLAY ITEMS
// =====================================

function renderItems(items) {
    const list = document.getElementById("itemsList");

    if (!list) return;

    if (!Array.isArray(items) || items.length === 0) {
        list.innerHTML = "<p>No approved reports found.</p>";
        return;
    }

    list.innerHTML = items.map(item => `
        <article class="item-card">

            ${createItemImage(item.imageUrl, item.title)}

            <span>${escapeHTML(item.type)}</span>

            <h3>${escapeHTML(item.title)}</h3>

            <p>${escapeHTML(item.description)}</p>

            <p>
                ${escapeHTML(item.category)}
                ·
                ${escapeHTML(item.location)}
            </p>

            <p>
                ${item.itemDate
                    ? new Date(item.itemDate).toLocaleDateString()
                    : ""}
            </p>

            ${item.type === "found" && item.status === "approved" ? `
                <button class="btn claim-btn"
                    data-item-id="${escapeHTML(item._id)}">
                    Claim Item
                </button>
            ` : ""}

        </article>
    `).join("");
}

// =====================================
// LOAD ITEMS
// =====================================

async function loadItems() {
    const list = document.getElementById("itemsList");

    if (!list) return;

    try {
        list.innerHTML = "<p>Loading items...</p>";

        const data = await api("/items");

        renderItems(data.items);

    } catch (error) {
        list.textContent = error.message;
    }
}

// =====================================
// SEARCH ITEMS
// =====================================

function setupSearch() {
    const form = document.getElementById("searchForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const formData = new FormData(form);
        const params = new URLSearchParams();

        if (formData.get("q")) {
            params.set("q", formData.get("q"));
        }

        if (formData.get("type")) {
            params.set("type", formData.get("type"));
        }

        const list = document.getElementById("itemsList");

        try {
            if (list) list.innerHTML = "<p>Searching...</p>";

            const data = await api("/items?" + params.toString());

            renderItems(data.items);

        } catch (error) {
            if (list) list.textContent = error.message;
        }
    });
}

// =====================================
// STUDENT SUBMITS CLAIM
// =====================================

function setupClaimButtons() {
    document.addEventListener("click", async event => {
        const button = event.target.closest(".claim-btn");

        if (!button) return;

        if (!getToken()) {
            alert("Please login first.");
            window.location.href = "login.html";
            return;
        }

        const message = prompt(
            "Explain why this item belongs to you:"
        );

        if (!message || message.trim().length < 5) {
            alert("Enter at least 5 characters.");
            return;
        }

        try {
            button.disabled = true;

            const data = await api("/claims", {
                method: "POST",
                body: JSON.stringify({
                    itemId: button.dataset.itemId,
                    message: message.trim()
                })
            });

            alert(data.message || "Claim submitted successfully!");

        } catch (error) {
            alert(error.message);
        } finally {
            button.disabled = false;
        }
    });
}

// =====================================
// STUDENT - MY CLAIMS
// =====================================

async function loadMyClaims() {
    const list = document.getElementById("claimsList");

    if (!list) return;

    try {
        list.innerHTML = "<p>Loading your claims...</p>";

        const data = await api("/claims/mine");

        if (!Array.isArray(data.claims) || !data.claims.length) {
            list.innerHTML = "<p>You have not submitted any claims yet.</p>";
            return;
        }

        list.innerHTML = data.claims.map(claim => `
            <article class="item-card">

                ${claim.item
                    ? createItemImage(
                        claim.item.imageUrl,
                        claim.item.title
                    )
                    : ""
                }

                <h3>${escapeHTML(claim.item?.title || "Item unavailable")}</h3>

                <p>${escapeHTML(claim.message)}</p>

                <p>
                    Claim ID: ${escapeHTML(claim._id)}
                </p>

                <p>
                    Status: ${escapeHTML(claim.status)}
                </p>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = error.message;
    }
}

// =====================================
// ADMIN - PENDING ITEM REPORTS
// =====================================

async function loadAdminReports() {
    const list = document.getElementById("adminList");

    if (!list) return;

    const user = getUser();

    if (!getToken() || !user || user.role !== "admin") {
        list.innerHTML = "<p>Admin access required.</p>";
        return;
    }

    try {
        list.innerHTML = "<p>Loading pending reports...</p>";

        const data = await api("/items/admin/pending");

        if (!Array.isArray(data.items) || !data.items.length) {
            list.innerHTML = "<p>No pending reports.</p>";
            return;
        }

        list.innerHTML = data.items.map(item => `
            <article class="item-card">

                ${createItemImage(item.imageUrl, item.title)}

                <h3>${escapeHTML(item.title)}</h3>

                <p>${escapeHTML(item.description)}</p>

                <p>Type: ${escapeHTML(item.type)}</p>
                <p>Category: ${escapeHTML(item.category)}</p>
                <p>Location: ${escapeHTML(item.location)}</p>

                <button class="btn approve-btn"
                    data-id="${escapeHTML(item._id)}">
                    Approve
                </button>

                <button class="btn reject-btn"
                    data-id="${escapeHTML(item._id)}">
                    Reject
                </button>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = error.message;
    }
}

// =====================================
// ADMIN - APPROVE / REJECT REPORTS
// =====================================

function setupAdminReview() {
    document.addEventListener("click", async event => {
        const approve = event.target.closest(".approve-btn");
        const reject = event.target.closest(".reject-btn");

        if (!approve && !reject) return;

        const button = approve || reject;
        const decision = approve ? "approved" : "rejected";

        try {
            button.disabled = true;

            const data = await api(
                `/items/${button.dataset.id}/review`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ decision })
                }
            );

            alert(data.message || `Report ${decision}.`);

            await loadAdminReports();

        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    });
}

// =====================================
// ADMIN - VIEW STUDENT CLAIMS
// =====================================

async function loadAdminClaims() {
    const list = document.getElementById("adminClaimsList");

    if (!list) return;

    const user = getUser();

    if (!user || user.role !== "admin" || !getToken()) {
        list.innerHTML = "<p>Admin access required.</p>";
        return;
    }

    try {
        list.innerHTML = "<p>Loading student claims...</p>";

        const data = await api("/claims/admin/pending");

        if (!Array.isArray(data.claims) || data.claims.length === 0) {
            list.innerHTML = "<p>No pending student claims.</p>";
            return;
        }

        list.innerHTML = data.claims.map(claim => `
            <article class="item-card">

                <h3>${escapeHTML(claim.item?.title || "Unknown item")}</h3>

                ${createItemImage(
                    claim.item?.imageUrl,
                    claim.item?.title || "Item"
                )}

                <p>
                    Student: ${escapeHTML(claim.claimant?.name || "Unknown")}
                </p>

                <p>
                    Student ID: ${escapeHTML(claim.claimant?.studentId || "N/A")}
                </p>

                <p>
                    Email: ${escapeHTML(claim.claimant?.email || "N/A")}
                </p>

                <p>
                    Explanation: ${escapeHTML(claim.message)}
                </p>

                <p>
                    Submitted: ${new Date(claim.createdAt).toLocaleString()}
                </p>

                <p>Status: ${escapeHTML(claim.status)}</p>

                <button
                    class="btn approve-claim-btn"
                    data-id="${escapeHTML(claim._id)}">
                    Approve Claim
                </button>

                <button
                    class="btn reject-claim-btn"
                    data-id="${escapeHTML(claim._id)}">
                    Reject Claim
                </button>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = error.message;
    }
}

// =====================================
// ADMIN - APPROVE / REJECT CLAIMS
// =====================================

function setupClaimReview() {
    document.addEventListener("click", async event => {

        const approve = event.target.closest(".approve-claim-btn");
        const reject = event.target.closest(".reject-claim-btn");

        if (!approve && !reject) return;

        const button = approve || reject;
        const decision = approve ? "approved" : "rejected";

        if (!confirm(`Are you sure you want to ${decision} this claim?`)) {
            return;
        }

        try {
            button.disabled = true;

            const data = await api(
                `/claims/${button.dataset.id}/decision`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ decision })
                }
            );

            alert(data.message || `Claim ${decision} successfully.`);

            await loadAdminClaims();

        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    });
}

// =====================================
// ADMIN - VIEW HANDOVER RECORDS
// =====================================

async function loadHandoverRecords() {
    const list = document.getElementById("handoverList");

    if (!list) return;

    try {
        list.innerHTML = "<p>Loading handover records...</p>";

        const data = await api("/handovers");

        if (!Array.isArray(data.handovers) || data.handovers.length === 0) {
            list.innerHTML = "<p>No handover records found.</p>";
            return;
        }

        list.innerHTML = data.handovers.map(record => `
            <article class="item-card">

                <h3>${escapeHTML(record.item?.title || "Unknown item")}</h3>

                <p>
                    Student: ${escapeHTML(record.owner?.name || "Unknown")}
                </p>

                <p>
                    Student ID: ${escapeHTML(record.owner?.studentId || "N/A")}
                </p>

                <p>
                    Email: ${escapeHTML(record.owner?.email || "N/A")}
                </p>

                <p>
                    Handover Date:
                    ${record.handoverDate
                        ? new Date(record.handoverDate).toLocaleString()
                        : "N/A"}
                </p>

                <p>
                    Remarks: ${escapeHTML(record.remarks || "No remarks")}
                </p>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = error.message;
    }
}

// =====================================
// DASHBOARD WELCOME
// =====================================

function setupWelcome() {
    const welcome = document.getElementById("welcome");

    if (!welcome) return;

    const user = getUser();

    if (user) {
        welcome.textContent = `Welcome, ${user.name}!`;
    }
}

// =====================================
// INITIALIZE ALL PAGES
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    addAdminOption();

    setupLogout();
    setupLogin();
    setupRegister();

    setupReports();
    setupSearch();

    setupClaimButtons();
    setupAdminReview();
    setupClaimReview();

    setupWelcome();

    loadItems();
    loadMyClaims();

    loadAdminReports();
    loadAdminClaims();
    loadHandoverRecords();

});
