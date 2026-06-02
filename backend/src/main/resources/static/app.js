// ==========================================
// SROS FRONTEND CONTROLLER LOGIC (VANILLA JS)
// ==========================================

// Global state
let stompClient = null;
let currentTable = null;      // Table number for Customer
let currentSeat = null;       // Seat number (1-4) for Customer
let currentCustomer = null;   // Authenticated Customer object
let currentOrder = null;      // Customer's active order
let authenticatedRole = null; // Waiter, Sabji, Roti, Billing, Manager, Owner
let menuItems = [];
let activeOrders = [];
let tableList = [];
let assistanceRequests = [];
let pendingReservations = [];
let cart = [];                // cart items: { menuItem, quantity, specialInstructions, seatNumber, customerName }
let pinBuffer = "";           // PIN pad input buffer

// Audio Synthesizer
let audioCtx = null;
function playChime(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        if (type === 'waiter') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.35);
            
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime);
                gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                osc2.start(audioCtx.currentTime);
                osc2.stop(audioCtx.currentTime + 0.45);
            }, 150);
        } else if (type === 'priority') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.linearRampToValueAtTime(659.25, now + 0.2);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.65);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, now);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.45);
        }
    } catch (e) {
        console.warn("Audio Context failed: ", e);
    }
}

// REST helper
function apiRequest(url, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Content-Type'] = 'application/json';
    return fetch(url, options).then(res => {
        if (!res.ok) {
            return res.text().then(text => { throw new Error(text || 'API Error'); });
        }
        return res.json();
    });
}

// Initializer
document.addEventListener("DOMContentLoaded", () => {
    initSrosApp();
    connectWebSocket();
    loadMenu();
    refreshSystemData();
});

function initSrosApp() {
    // 3D Parallax Scroll Listener
    window.addEventListener("scroll", () => {
        const scrolled = window.scrollY;
        const bgLayer = document.querySelector(".parallax-layer.bg-layer");
        if (bgLayer) {
            // Translate background layer slowly down to create 3D depth
            bgLayer.style.transform = `translate3d(0, ${scrolled * 0.4}px, -1px) scale(2)`;
        }
    });

    // Landing Screen -> Portal selection trigger
    document.getElementById("btn-enter-portal-gateway").addEventListener("click", () => {
        document.getElementById("public-home-page").classList.remove("active");
        document.getElementById("portal-login-gate").classList.add("active");
        window.scrollTo(0,0);
    });

    document.getElementById("btn-login-back-home").addEventListener("click", () => {
        document.getElementById("portal-login-gate").classList.remove("active");
        document.getElementById("public-home-page").classList.add("active");
        window.scrollTo(0,0);
    });

    // Portal role buttons on enter screen
    document.querySelectorAll(".login-role-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".login-role-btn").forEach(b => b.classList.remove("active"));
            e.currentTarget.classList.add("active");
            
            const role = e.currentTarget.getAttribute("data-role");
            setupRoleLoginForm(role);
        });
    });

    // PIN pad digits click
    document.querySelectorAll(".pin-key:not(.pin-clear):not(.pin-submit)").forEach(key => {
        key.addEventListener("click", (e) => {
            if (pinBuffer.length < 4) {
                pinBuffer += e.target.innerText;
                document.getElementById("staff-pin-input").value = pinBuffer;
            }
        });
    });

    document.querySelector(".pin-clear").addEventListener("click", () => {
        pinBuffer = "";
        document.getElementById("staff-pin-input").value = "";
    });

    document.querySelector(".pin-submit").addEventListener("click", validateStaffLoginPin);

    // Customer login form checkin submit
    document.getElementById("gate-customer-login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        submitCustomerCheckIn();
    });

    // Logout from portals
    document.getElementById("btn-sros-logout").addEventListener("click", logoutPortalUser);

    // Customer Menu tabs
    document.querySelectorAll(".menu-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".menu-tab").forEach(t => t.classList.remove("active"));
            e.target.classList.add("active");
            renderCustomerMenu();
        });
    });
    document.getElementById("menu-search").addEventListener("input", renderCustomerMenu);

    // Customer calls
    document.getElementById("btn-call-waiter").addEventListener("click", () => triggerCallAssistance("WAITER"));
    document.getElementById("btn-request-water").addEventListener("click", () => triggerCallAssistance("WATER"));
    document.getElementById("btn-request-bill").addEventListener("click", () => triggerCallAssistance("BILL"));

    // Cart checkout orders
    document.getElementById("btn-place-order").addEventListener("click", submitCustomerCartOrder);
    document.getElementById("order-priority").addEventListener("change", updateCartTotalDisplay);

    // Waiter inspector tools
    document.getElementById("btn-close-inspector").addEventListener("click", () => {
        document.getElementById("waiter-table-inspector").classList.add("hidden");
    });
    document.getElementById("btn-waiter-mark-available").addEventListener("click", () => waiterChangeTableStatus("AVAILABLE"));
    document.getElementById("btn-waiter-mark-cleaning").addEventListener("click", () => waiterChangeTableStatus("CLEANING_REQUIRED"));
    document.getElementById("btn-waiter-start-cleaning").addEventListener("click", waiterStartCleaningTable);
    document.getElementById("btn-waiter-complete-cleaning").addEventListener("click", waiterCompleteCleaningTable);
    document.getElementById("btn-waiter-add-comp-item").addEventListener("click", () => {
        document.getElementById("complimentary-item-modal").classList.remove("hidden");
    });
    document.getElementById("btn-close-comp-modal").addEventListener("click", () => {
        document.getElementById("complimentary-item-modal").classList.add("hidden");
    });
    document.getElementById("btn-submit-comp-item").addEventListener("click", waiterSubmitCompItem);

    // Billing Invoice panel tabs
    document.getElementById("btn-bill-combined").addEventListener("click", (e) => {
        document.querySelectorAll(".billing-tab").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById("billing-receipt-card").classList.remove("hidden");
        document.getElementById("billing-split-receipt-card").classList.add("hidden");
    });
    document.getElementById("btn-bill-split").addEventListener("click", (e) => {
        document.querySelectorAll(".billing-tab").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById("billing-receipt-card").classList.add("hidden");
        document.getElementById("billing-split-receipt-card").classList.remove("hidden");
    });
    document.getElementById("btn-process-checkout").addEventListener("click", executeCheckoutBillCombined);

    // Manager reservation simulate form
    document.getElementById("manager-booking-sim-form").addEventListener("submit", (e) => {
        e.preventDefault();
        simulateManagerReservation();
    });

    // Check session log caches
    const cachedRole = sessionStorage.getItem("sros_role");
    const cachedCustomer = sessionStorage.getItem("sros_customer");
    const cachedTable = sessionStorage.getItem("sros_table");
    const cachedSeat = sessionStorage.getItem("sros_seat");

    if (cachedRole) {
        if (cachedRole === 'customer' && cachedCustomer) {
            currentCustomer = JSON.parse(cachedCustomer);
            currentTable = parseInt(cachedTable);
            currentSeat = parseInt(cachedSeat);
            enterCustomerPortal();
        } else {
            enterStaffPortal(cachedRole);
        }
    }
}

// Connect STOMP WebSocket channels
function connectWebSocket() {
    const connDot = document.getElementById("conn-dot");
    const connText = document.getElementById("conn-text");
    
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    
    stompClient.connect({}, (frame) => {
        connDot.className = "status-dot online";
        connText.innerText = "Connected";
        
        stompClient.subscribe('/topic/restaurant', (message) => {
            const event = JSON.parse(message.body);
            handleIncomingSrosEvent(event);
        });
    }, (error) => {
        connDot.className = "status-dot offline";
        connText.innerText = "Disconnected (Re-trying...)";
        setTimeout(connectWebSocket, 5000);
    });
}

function handleIncomingSrosEvent(event) {
    const { type, payload } = event;
    console.log("SROS Event:", type, payload);

    if (type === "ASSISTANCE_REQUEST") {
        playChime('waiter');
        refreshAssistanceRequests();
    } else if (type === "ORDER_CREATED") {
        if (payload.priority) playChime('priority');
        else playChime('notif');
        refreshKitchenQueues();
    } else if (type === "ORDER_UPDATE") {
        refreshKitchenQueues();
        // If customer has this order, refresh tracking details
        if (currentOrder && currentOrder.id === payload.id) {
            currentOrder = payload;
            renderCustomerTracker();
        }
    } else if (type === "ORDER_CANCELLED") {
        refreshKitchenQueues();
        if (currentOrder && currentOrder.id === payload) {
            currentOrder = null;
            renderCustomerTracker();
            alert("Your order ticket has been cancelled.");
        }
    } else if (type === "TABLE_UPDATE") {
        refreshTablesMatrix();
        refreshBillingTables();
        if (authenticatedRole === 'manager') refreshManagerDashboard();
        
        // If customer checked out
        if (currentTable && payload.tableNumber === currentTable) {
            if (payload.status === "AVAILABLE" || payload.status === "CLEANING_REQUIRED") {
                alert("Your table bill has been settled. Thank you!");
                logoutPortalUser();
            }
        }
    } else if (type === "ASSISTANCE_RESOLVED") {
        refreshAssistanceRequests();
    } else if (type === "RESERVATION_CREATED" || type === "RESERVATION_UPDATED") {
        if (authenticatedRole === 'manager') refreshManagerDashboard();
    } else if (type === "SEAT_UPDATE") {
        if (authenticatedRole === 'waiter' && inspectedTableNum) {
            inspectTableDetails(inspectedTableNum);
        }
    }
}

// Refresh portal data helpers
function refreshSystemData() {
    refreshTablesMatrix();
    refreshKitchenQueues();
    refreshAssistanceRequests();
    refreshBillingTables();
    if (authenticatedRole === 'manager') refreshManagerDashboard();
    if (authenticatedRole === 'owner') renderOwnerPortal();
}

// Setup Role Forms on Entry Gate
function setupRoleLoginForm(role) {
    pinBuffer = "";
    document.getElementById("staff-pin-input").value = "";
    
    if (role === 'customer') {
        document.getElementById("login-customer-setup").classList.remove("hidden");
        document.getElementById("login-staff-setup").classList.add("hidden");
    } else {
        document.getElementById("login-customer-setup").classList.add("hidden");
        document.getElementById("login-staff-setup").classList.remove("hidden");
        document.getElementById("staff-login-role-label").innerText = role.toUpperCase();
    }
}

// PIN Validation for staff
function validateStaffLoginPin() {
    const role = document.querySelector(".login-role-btn.active").getAttribute("data-role");
    const pin = pinBuffer;
    
    const pins = {
        waiter: "1111",
        "sabji-cook": "2222",
        "roti-cook": "3333",
        billing: "4444",
        owner: "5555",
        manager: "8888"
    };
    
    if (pins[role] && pins[role] === pin) {
        // Success
        sessionStorage.setItem("sros_role", role);
        enterStaffPortal(role);
    } else {
        alert("Incorrect operational passcode. Try again!");
        pinBuffer = "";
        document.getElementById("staff-pin-input").value = "";
    }
}

// Enter Staff View
function enterStaffPortal(role) {
    authenticatedRole = role;
    
    document.getElementById("portal-login-gate").classList.remove("active");
    document.getElementById("sros-portal-header").classList.remove("hidden");
    document.getElementById("sros-active-role-tag").innerText = role.toUpperCase();
    
    // Hide all view blocks and open active role view
    document.querySelectorAll(".portal-view").forEach(v => v.classList.remove("active"));
    document.getElementById(`portal-${role}`).classList.add("active");
    
    refreshSystemData();
}

// Customer Check-in Submit
function submitCustomerCheckIn() {
    const name = document.getElementById("gate-cust-name").value;
    const mobile = document.getElementById("gate-cust-mobile").value;
    const tableNum = parseInt(document.getElementById("gate-cust-table").value);
    const seatNum = parseInt(document.getElementById("gate-cust-seat").value);
    const referrer = document.getElementById("gate-cust-referrer").value;
    
    // First request checkin
    apiRequest(`/api/tables/${tableNum}/checkin`, {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            mobileNumber: mobile,
            referrerMobile: referrer
        })
    }).then(table => {
        currentCustomer = table.currentCustomer;
        currentTable = tableNum;
        currentSeat = seatNum;
        
        // Save in session
        sessionStorage.setItem("sros_role", "customer");
        sessionStorage.setItem("sros_customer", JSON.stringify(currentCustomer));
        sessionStorage.setItem("sros_table", tableNum.toString());
        sessionStorage.setItem("sros_seat", seatNum.toString());
        
        // Also assign member seat automatically on backend
        return apiRequest(`/api/tables/${table.id}/seats/${seatNum}/assign`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                mobileNumber: mobile
            })
        });
    }).then(() => {
        enterCustomerPortal();
    }).catch(err => {
        alert("Check-in blocked: " + err.message);
    });
}

function enterCustomerPortal() {
    authenticatedRole = 'customer';
    
    document.getElementById("portal-login-gate").classList.remove("active");
    document.getElementById("sros-portal-header").classList.remove("hidden");
    document.getElementById("sros-active-role-tag").innerText = `Table ${currentTable} - Seat ${currentSeat}`;
    
    document.querySelectorAll(".portal-view").forEach(v => v.classList.remove("active"));
    document.getElementById("portal-customer").classList.add("active");
    
    // Load Customer UI
    document.getElementById("cart-active-seat-label").innerText = currentSeat;
    document.getElementById("profile-name").innerText = currentCustomer.name;
    document.getElementById("profile-mobile").innerText = currentCustomer.mobileNumber;
    document.getElementById("profile-table-num").innerText = currentTable;
    document.getElementById("profile-seat-num").innerText = currentSeat;
    document.getElementById("profile-tier").innerText = currentCustomer.loyaltyTier;
    document.getElementById("profile-tier").className = `badge ${currentCustomer.loyaltyTier === 'PREMIUM' ? 'badge-accent' : 'badge-success'}`;
    document.getElementById("profile-discount").innerText = `${currentCustomer.discountsEarned}%`;
    
    renderCustomerMenu();
    renderCart();
    fetchCustomerActiveOrders();
}

function logoutPortalUser() {
    // Clear log session caches
    sessionStorage.removeItem("sros_role");
    sessionStorage.removeItem("sros_customer");
    sessionStorage.removeItem("sros_table");
    sessionStorage.removeItem("sros_seat");
    
    currentCustomer = null;
    currentTable = null;
    currentSeat = null;
    currentOrder = null;
    authenticatedRole = null;
    cart = [];
    
    // Reset forms
    document.getElementById("gate-customer-login-form").reset();
    document.getElementById("staff-pin-input").value = "";
    pinBuffer = "";
    
    document.getElementById("sros-portal-header").classList.add("hidden");
    document.querySelectorAll(".portal-view").forEach(v => v.classList.remove("active"));
    document.getElementById("portal-login-gate").classList.add("active");
    
    // Re-active selects
    document.querySelectorAll(".login-role-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("login-customer-setup").classList.add("hidden");
    document.getElementById("login-staff-setup").classList.add("hidden");
}

// ----------------------------------------------------
// A. CUSTOMER PORTAL - MENU, CART, & ITEM CANCEL
// ----------------------------------------------------

function loadMenu() {
    loadCompDropdown();
}

function renderCustomerMenu() {
    const container = document.getElementById("customer-menu-items");
    container.innerHTML = "<p class='empty-message'>Loading menu...</p>";
    
    const activeCategory = document.querySelector(".menu-tab.active").getAttribute("data-category");
    const searchVal = document.getElementById("menu-search").value.toLowerCase().trim();
    
    let url = "/api/menu";
    if (activeCategory) url += `?category=${activeCategory}`;
    
    fetch(url)
        .then(res => res.json())
        .then(items => {
            menuItems = items;
            const filtered = items.filter(item => item.name.toLowerCase().includes(searchVal));
            
            if (filtered.length === 0) {
                container.innerHTML = "<p class='empty-message'>No items found.</p>";
                return;
            }
            
            container.innerHTML = "";
            filtered.forEach(item => {
                const card = document.createElement("div");
                card.className = "menu-card";
                card.innerHTML = `
                    <div class="menu-item-details">
                        <h4>${item.name}</h4>
                        <span class="menu-item-desc">${item.category} station</span>
                    </div>
                    <div class="menu-item-footer">
                        <span class="menu-item-price">${item.chargeable ? '₹' + item.price : 'FREE'}</span>
                        <button class="btn btn-primary btn-sm" onclick="addItemToSeatCart(${item.id})"><i class="fa-solid fa-plus"></i> Add</button>
                    </div>
                `;
                container.appendChild(card);
            });
        });
}

function addItemToSeatCart(itemId) {
    const dish = menuItems.find(i => i.id === itemId);
    if (!dish) return;
    
    const existing = cart.find(c => c.menuItem.id === itemId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            menuItem: dish,
            quantity: 1,
            specialInstructions: "",
            seatNumber: currentSeat,
            customerName: currentCustomer.name
        });
    }
    
    renderCart();
    playChime('notif');
}

function removeItemFromSeatCart(itemId) {
    const existing = cart.find(c => c.menuItem.id === itemId);
    if (existing) {
        existing.quantity -= 1;
        if (existing.quantity <= 0) {
            cart = cart.filter(c => c.menuItem.id !== itemId);
        }
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById("cart-items-container");
    const placeBtn = document.getElementById("btn-place-order");
    
    if (cart.length === 0) {
        container.innerHTML = "<p class='empty-message'>Your cart is empty.</p>";
        placeBtn.disabled = true;
        updateCartTotalDisplay();
        return;
    }
    
    placeBtn.disabled = false;
    container.innerHTML = "";
    
    cart.forEach(c => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${c.menuItem.name}</span>
                <div class="cart-item-price">${c.menuItem.chargeable ? '₹' + (c.menuItem.price * c.quantity) : 'FREE'}</div>
                <input type="text" class="form-control cart-item-instructions" placeholder="Note: e.g. Less Spicy" value="${c.specialInstructions || ''}" onchange="updateCartItemInstructions(${c.menuItem.id}, this.value)">
            </div>
            <div class="cart-qty-ctrl">
                <button class="cart-qty-btn" onclick="removeItemFromSeatCart(${c.menuItem.id})"><i class="fa-solid fa-minus"></i></button>
                <span class="cart-qty-val">${c.quantity}</span>
                <button class="cart-qty-btn" onclick="addItemToSeatCart(${c.menuItem.id})"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        container.appendChild(row);
    });
    
    updateCartTotalDisplay();
}

function updateCartItemInstructions(itemId, val) {
    const target = cart.find(c => c.menuItem.id === itemId);
    if (target) target.specialInstructions = val;
}

function updateCartTotalDisplay() {
    let subtotal = 0;
    cart.forEach(c => {
        if (c.menuItem.chargeable) {
            subtotal += (c.menuItem.price * c.quantity);
        }
    });
    
    const discPerc = currentCustomer ? currentCustomer.discountsEarned : 0;
    const discVal = subtotal * (discPerc / 100.0);
    const total = subtotal - discVal;
    
    document.getElementById("cart-subtotal").innerText = subtotal.toFixed(2);
    
    const discDiv = document.getElementById("cart-discount-container");
    if (discPerc > 0) {
        document.getElementById("cart-discount-label").innerText = `Loyalty Discount (${discPerc}%):`;
        document.getElementById("cart-discount").innerText = discVal.toFixed(2);
        discDiv.classList.remove("hidden");
    } else {
        discDiv.classList.add("hidden");
    }
    
    document.getElementById("cart-total").innerText = total.toFixed(2);
}

function triggerCallAssistance(type) {
    apiRequest('/api/assistance', {
        method: 'POST',
        body: JSON.stringify({
            tableNumber: currentTable.toString(),
            type: type
        })
    }).then(res => {
        alert(`${type} request has been alert to waiter portal.`);
    });
}

function submitCustomerCartOrder() {
    const isPriority = document.getElementById("order-priority").checked;
    
    const requestItems = cart.map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        specialInstructions: c.specialInstructions,
        seatNumber: c.seatNumber,
        customerName: c.customerName
    }));
    
    apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            tableId: currentTable,
            customerId: currentCustomer.id,
            isPriority: isPriority,
            items: requestItems
        })
    }).then(order => {
        currentOrder = order;
        cart = [];
        renderCart();
        document.getElementById("order-priority").checked = false;
        
        document.getElementById("customer-cart-box").classList.add("hidden");
        document.getElementById("customer-tracker-box").classList.remove("hidden");
        
        renderCustomerTracker();
    }).catch(err => {
        alert("Order placement failed: " + err.message);
    });
}

function fetchCustomerActiveOrders() {
    fetch(`/api/orders/table/${currentTable}`)
        .then(res => res.json())
        .then(orders => {
            if (orders && orders.length > 0) {
                currentOrder = orders[orders.length - 1];
                document.getElementById("customer-cart-box").classList.add("hidden");
                document.getElementById("customer-tracker-box").classList.remove("hidden");
                renderCustomerTracker();
            } else {
                currentOrder = null;
                document.getElementById("customer-cart-box").classList.remove("hidden");
                document.getElementById("customer-tracker-box").classList.add("hidden");
            }
        });
}

// Renders SROS live status trackers with true item-level cancellation locks
function renderCustomerTracker() {
    const container = document.getElementById("customer-tracker-box");
    if (!currentOrder) {
        container.classList.add("hidden");
        document.getElementById("customer-cart-box").classList.remove("hidden");
        return;
    }
    
    container.classList.remove("hidden");
    document.getElementById("active-order-id-label").innerText = `Order #${currentOrder.id}`;
    
    const itemContainer = document.getElementById("tracker-order-items-container");
    itemContainer.innerHTML = "";
    
    currentOrder.items.forEach(item => {
        // Render item status and SROS cancel action locks
        const card = document.createElement("div");
        card.className = "tracker-item-card";
        
        let cancelControl = "";
        
        // SROS Lock rule: locks cancellation if started prep/cooking (IN_PROGRESS or READY)
        if (item.status === 'PENDING') {
            cancelControl = `<button class="btn btn-danger btn-sm" onclick="cancelCustomerOrderItem(${item.id})"><i class="fa-solid fa-xmark"></i> Cancel</button>`;
        } else {
            // Locked
            cancelControl = `<span class="locked-badge"><i class="fa-solid fa-lock"></i> Kitchen Locked</span>`;
        }
        
        card.innerHTML = `
            <div class="tracker-item-left">
                <span class="tracker-item-title">${item.menuItem.name} <strong class="text-cyan">x ${item.quantity}</strong></span>
                <div class="tracker-item-status-row">
                    <span class="badge ${item.status === 'READY' ? 'badge-success' : 'badge-warning'}">${item.status}</span>
                    <small class="text-muted">Seat ${item.seatNumber}</small>
                </div>
            </div>
            <div class="tracker-item-right">
                ${cancelControl}
            </div>
        `;
        itemContainer.appendChild(card);
    });
    
    document.getElementById("tracker-cooking-eta").innerText = currentOrder.estimatedPrepMinutes || "--";
    document.getElementById("tracker-delivery-eta").innerText = currentOrder.estimatedDeliveryMinutes || "--";
}

function cancelCustomerOrderItem(itemId) {
    if (!confirm("Are you sure you want to cancel this specific dish?")) return;
    
    apiRequest(`/api/orders/items/${itemId}/cancel?byCustomer=true`, {
        method: 'POST'
    }).then(res => {
        alert("Dish cancelled successfully.");
        // Fetch fresh order details
        fetchCustomerActiveOrders();
    }).catch(err => {
        alert("Cancellation blocked: " + err.message);
    });
}


// ----------------------------------------------------
// B. WAITER PORTAL - TABLES & SEATS ASSIGNMENTS
// ----------------------------------------------------

let inspectedTableNum = null;

function refreshTablesMatrix(animate = false) {
    if (animate) toggleRefreshSpin("waiter");
    
    fetch('/api/tables')
        .then(res => res.json())
        .then(tables => {
            tableList = tables;
            const container = document.getElementById("waiter-tables-matrix");
            if (!container) return;
            
            container.innerHTML = "";
            tables.forEach(t => {
                const card = document.createElement("div");
                card.className = `table-matrix-card ${t.status.toLowerCase()}`;
                card.onclick = () => inspectTableDetails(t.tableNumber);
                
                const custName = t.currentCustomer ? t.currentCustomer.name : 'Vacant';
                
                card.innerHTML = `
                    <div class="table-matrix-header">
                        <span class="table-matrix-num">Table ${t.tableNumber}</span>
                        <span class="badge">${t.status.replace(/_/g, " ")}</span>
                    </div>
                    <div class="table-matrix-body">
                        <span>Guest: <strong>${custName}</strong></span>
                    </div>
                `;
                container.appendChild(card);
            });
        });
}

function inspectTableDetails(tableNumber) {
    inspectedTableNum = tableNumber;
    const table = tableList.find(t => t.tableNumber === tableNumber);
    if (!table) return;
    
    document.getElementById("inspector-table-number").innerText = tableNumber;
    document.getElementById("inspector-table-status").innerText = table.status;
    document.getElementById("inspector-table-status").className = `badge badge-primary`;
    
    const compBtn = document.getElementById("btn-waiter-add-comp-item");
    compBtn.disabled = !(table.status === 'OCCUPIED' || table.status === 'BILLING_PENDING');
    
    // SROS Seat Guest assignments inspector
    const seatsContainer = document.getElementById("inspector-seats-editor-container");
    seatsContainer.innerHTML = "<small class='text-muted'>Loading seats...</small>";
    
    fetch(`/api/tables/${table.id}/seats`)
        .then(res => res.json())
        .then(assignedSeats => {
            seatsContainer.innerHTML = "";
            for (let seat = 1; seat <= 4; seat++) {
                const row = document.createElement("div");
                row.className = "seat-edit-row";
                
                const member = assignedSeats.find(s => s.seatNumber === seat);
                const guestNameStr = member ? member.name : "Unassigned";
                
                row.innerHTML = `
                    <span class="seat-label-num">Seat ${seat}</span>
                    <span class="seat-guest-name">${guestNameStr}</span>
                    <input type="text" class="seat-assign-input" placeholder="Assign name..." value="${member ? member.name : ''}" onchange="assignSeatMemberName(${table.id}, ${seat}, this.value)">
                `;
                seatsContainer.appendChild(row);
            }
        });

    // Load active ticket items
    const ordersContainer = document.getElementById("inspector-orders-container");
    ordersContainer.innerHTML = "<small class='text-muted'>Loading items...</small>";
    
    fetch(`/api/orders/table/${table.id}`)
        .then(res => res.json())
        .then(orders => {
            if (orders.length === 0) {
                ordersContainer.innerHTML = "<p class='empty-message'>No active items.</p>";
                return;
            }
            
            ordersContainer.innerHTML = "";
            orders.forEach(order => {
                const oDiv = document.createElement("div");
                oDiv.className = "inspector-order-wrapper border-bottom";
                oDiv.innerHTML = `
                    <div class="row-flex justify-between" style="font-weight:bold; margin-bottom:5px;">
                        <span>Order #${order.id} (${order.status})</span>
                        <button class="btn btn-danger btn-sm" onclick="cancelOrderWaiter(${order.id})">Cancel Ticket</button>
                    </div>
                `;
                
                order.items.forEach(item => {
                    const row = document.createElement("div");
                    row.className = "inspector-order-row";
                    const compLabel = item.complimentary ? ' (Comp)' : '';
                    
                    row.innerHTML = `
                        <span>${item.menuItem.name} x ${item.quantity}${compLabel}</span>
                        <div class="row-flex" style="gap:5px;">
                            <span class="badge ${item.status === 'READY' ? 'badge-success' : 'badge-warning'}">${item.status}</span>
                            ${item.status !== 'READY' ? `<button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:10px;" onclick="markItemReadyWaiter(${item.id})">Ready</button>` : ''}
                            ${item.status === 'PENDING' ? `<button class="btn btn-danger btn-sm" style="padding:2px 6px; font-size:10px;" onclick="cancelItemWaiter(${item.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
                        </div>
                    `;
                    oDiv.appendChild(row);
                });
                ordersContainer.appendChild(oDiv);
            });
        });
        
    document.getElementById("waiter-table-inspector").classList.remove("hidden");
}

function assignSeatMemberName(tableId, seatNumber, name) {
    if (!name.trim()) return;
    apiRequest(`/api/tables/${tableId}/seats/${seatNumber}/assign`, {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            mobileNumber: "9999999999" // Dummy SROS filler
        })
    }).then(res => {
        inspectTableDetails(inspectedTableNum);
    });
}

function waiterChangeTableStatus(status) {
    if (!inspectedTableNum) return;
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    
    apiRequest(`/api/tables/${table.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: status })
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function waiterStartCleaningTable() {
    if (!inspectedTableNum) return;
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    
    apiRequest(`/api/tables/${table.id}/start-cleaning`, {
        method: 'POST'
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function waiterCompleteCleaningTable() {
    if (!inspectedTableNum) return;
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    
    apiRequest(`/api/tables/${table.id}/complete-cleaning`, {
        method: 'POST'
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function cancelOrderWaiter(orderId) {
    if (!confirm("Cancel this entire ticket?")) return;
    apiRequest(`/api/orders/${orderId}/cancel?byCustomer=false`, {
        method: 'POST'
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function cancelItemWaiter(itemId) {
    if (!confirm("Cancel this dish?")) return;
    apiRequest(`/api/orders/items/${itemId}/cancel?byCustomer=false`, {
        method: 'POST'
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function markItemReadyWaiter(itemId) {
    apiRequest(`/api/orders/items/${itemId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'READY' })
    }).then(() => {
        inspectTableDetails(inspectedTableNum);
    });
}

function loadCompDropdown() {
    const select = document.getElementById("comp-menu-item-select");
    if (!select) return;
    select.innerHTML = "";
    
    fetch('/api/menu')
        .then(res => res.json())
        .then(items => {
            items.forEach(item => {
                if (item.chargeable) {
                    const opt = document.createElement("option");
                    opt.value = item.id;
                    opt.innerText = `${item.name} (₹${item.price})`;
                    select.appendChild(opt);
                }
            });
        });
}

function waiterSubmitCompItem() {
    const menuItemId = document.getElementById("comp-menu-item-select").value;
    const quantity = document.getElementById("comp-quantity-select").value;
    
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    fetch(`/api/orders/table/${table.id}`)
        .then(res => res.json())
        .then(orders => {
            if (orders.length === 0) {
                alert("Table must have an active order first.");
                return;
            }
            
            const activeOrder = orders[0];
            apiRequest(`/api/orders/${activeOrder.id}/complimentary`, {
                method: 'POST',
                body: JSON.stringify({
                    menuItemId: parseInt(menuItemId),
                    quantity: parseInt(quantity)
                })
            }).then(() => {
                document.getElementById("complimentary-item-modal").classList.add("hidden");
                inspectTableDetails(inspectedTableNum);
                alert("Complimentary item added to cooking queue.");
            });
        });
}


// ----------------------------------------------------
// C. SABJI & ROTI COOKS PORTALS
// ----------------------------------------------------

function refreshKitchenQueues(animate = false) {
    if (animate) {
        toggleRefreshSpin("sabji-cook");
        toggleRefreshSpin("roti-cook");
    }
    
    fetch('/api/orders/active')
        .then(res => res.json())
        .then(orders => {
            activeOrders = orders;
            renderSabjiQueue();
            renderRotiQueue();
        });
}

function renderSabjiQueue() {
    const container = document.getElementById("sabji-queue-container");
    if (!container) return;
    
    let itemsCount = 0;
    container.innerHTML = "";
    
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.menuItem.category === 'SABJI' && item.status !== 'READY') {
                itemsCount++;
                const card = document.createElement("div");
                card.className = `queue-card ${order.priority ? 'priority-card' : ''}`;
                
                const instructions = item.specialInstructions ? `<div class="queue-instructions">Note: ${item.specialInstructions}</div>` : '';
                const timeStr = new Date(order.orderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let actionBtn = '';
                if (item.status === 'PENDING') {
                    // Accepts and locks customer modifications/cancellations on DB status change
                    actionBtn = `<button class="btn btn-primary" onclick="changeItemStatus(${item.id}, 'IN_PROGRESS')">Accept & Prep</button>`;
                } else if (item.status === 'IN_PROGRESS') {
                    actionBtn = `<button class="btn btn-warning" onclick="changeItemStatus(${item.id}, 'READY')">Mark Ready</button>`;
                }
                
                card.innerHTML = `
                    <div class="queue-card-left">
                        <div class="queue-card-header">
                            <span class="queue-table-badge">Table ${order.table.tableNumber}</span>
                            <span class="badge badge-accent">Seat ${item.seatNumber}</span>
                            ${order.priority ? '<span class="badge badge-danger">Priority</span>' : ''}
                            <span class="queue-time">${timeStr}</span>
                        </div>
                        <div>
                            <span class="queue-item-name">${item.menuItem.name}</span>
                            <span class="queue-qty">x ${item.quantity}</span>
                        </div>
                        ${instructions}
                    </div>
                    <div class="queue-card-right">
                        <span class="badge ${item.status === 'PENDING' ? 'badge-primary' : 'badge-warning'}">${item.status}</span>
                        ${actionBtn}
                    </div>
                `;
                container.appendChild(card);
            }
        });
    });
    
    if (itemsCount === 0) {
        container.innerHTML = "<p class='empty-message'>No active Sabji orders in queue.</p>";
    }
    renderSabjiPrepGuidance();
}

function renderRotiQueue() {
    const container = document.getElementById("roti-queue-container");
    if (!container) return;
    
    let itemsCount = 0;
    let counts = { "Tandoori Roti": 0, "Butter Roti": 0, "Naan": 0 };
    container.innerHTML = "";
    
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.menuItem.category === 'ROTI' && item.status !== 'READY') {
                itemsCount++;
                
                const rName = item.menuItem.name;
                if (counts[rName] !== undefined) {
                    counts[rName] += item.quantity;
                }
                
                const card = document.createElement("div");
                card.className = `queue-card ${order.priority ? 'priority-card' : ''}`;
                
                const instructions = item.specialInstructions ? `<div class="queue-instructions">Note: ${item.specialInstructions}</div>` : '';
                const timeStr = new Date(order.orderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let actionBtn = '';
                if (item.status === 'PENDING') {
                    actionBtn = `<button class="btn btn-warning" onclick="changeItemStatus(${item.id}, 'READY')">Bake & Ready</button>`;
                }
                
                card.innerHTML = `
                    <div class="queue-card-left">
                        <div class="queue-card-header">
                            <span class="queue-table-badge">Table ${order.table.tableNumber}</span>
                            <span class="badge badge-accent">Seat ${item.seatNumber}</span>
                            ${order.priority ? '<span class="badge badge-danger">Priority</span>' : ''}
                            <span class="queue-time">${timeStr}</span>
                        </div>
                        <div>
                            <span class="queue-item-name">${item.menuItem.name}</span>
                            <span class="queue-qty">x ${item.quantity}</span>
                        </div>
                        ${instructions}
                    </div>
                    <div class="queue-card-right">
                        <span class="badge badge-warning">${item.status}</span>
                        ${actionBtn}
                    </div>
                `;
                container.appendChild(card);
            }
        });
    });
    
    if (itemsCount === 0) {
        container.innerHTML = "<p class='empty-message'>No active Roti orders in queue.</p>";
    }
    
    document.getElementById("roti-val-tandoori").innerText = counts["Tandoori Roti"];
    document.getElementById("roti-val-butter").innerText = counts["Butter Roti"];
    document.getElementById("roti-val-naan").innerText = counts["Naan"];
}

function changeItemStatus(itemId, status) {
    apiRequest(`/api/orders/items/${itemId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: status })
    }).then(() => {
        refreshKitchenQueues();
    });
}

function refreshAssistanceRequests() {
    fetch('/api/assistance/active')
        .then(res => res.json())
        .then(requests => {
            assistanceRequests = requests;
            
            // Badge chimes alerts
            const badge = document.getElementById("waiter-notif-badge");
            if (badge) {
                badge.innerText = requests.length;
                if (requests.length > 0) badge.classList.remove("hidden");
                else badge.classList.add("hidden");
            }
            
            const container = document.getElementById("waiter-alerts-container");
            if (!container) return;
            
            if (requests.length === 0) {
                container.innerHTML = "<p class='empty-message'>No active customer assistance requests.</p>";
                return;
            }
            
            container.innerHTML = "";
            requests.forEach(req => {
                const ticket = document.createElement("div");
                ticket.className = "waiter-alert-ticket";
                
                let icon = 'fa-bell';
                if (req.type === 'WATER') icon = 'fa-glass-water';
                if (req.type === 'BILL') icon = 'fa-file-invoice-dollar';
                
                ticket.innerHTML = `
                    <i class="fa-solid ${icon} text-rose"></i>
                    <span><strong>Table ${req.table.tableNumber}</strong> requested <strong>${req.type}</strong></span>
                    <button class="btn btn-secondary btn-sm" onclick="resolveRequest(${req.id})">Resolve</button>
                `;
                container.appendChild(ticket);
            });
        });
}

function resolveRequest(id) {
    apiRequest(`/api/assistance/${id}/resolve`, {
        method: 'POST'
    }).then(() => {
        refreshAssistanceRequests();
    });
}


// ----------------------------------------------------
// D. BILLING PORTAL - DYNAMIC SPLIT BILLING
// ----------------------------------------------------

let billingSelectedTableId = null;

function refreshBillingTables(animate = false) {
    if (animate) toggleRefreshSpin("billing");
    
    fetch('/api/tables')
        .then(res => res.json())
        .then(tables => {
            const container = document.getElementById("billing-tables-container");
            if (!container) return;
            
            container.innerHTML = "";
            let billingTablesCount = 0;
            
            tables.forEach(t => {
                if (t.status === 'OCCUPIED' || t.status === 'BILLING_PENDING') {
                    billingTablesCount++;
                    const card = document.createElement("div");
                    card.className = `billing-table-card ${billingSelectedTableId === t.id ? 'selected' : ''}`;
                    card.onclick = () => selectBillingTable(t.id);
                    
                    card.innerHTML = `
                        <div class="billing-table-header">
                            <span class="billing-table-num">Table ${t.tableNumber}</span>
                            <span class="badge ${t.status === 'BILLING_PENDING' ? 'badge-danger animate-pulse' : 'badge-primary'}">${t.status}</span>
                        </div>
                        <div>
                            <span>Guest: <strong>${t.currentCustomer.name}</strong></span>
                        </div>
                    `;
                    container.appendChild(card);
                }
            });
            
            if (billingTablesCount === 0) {
                container.innerHTML = "<p class='empty-message'>No occupied tables require checkout billing.</p>";
                document.getElementById("billing-receipt-card").classList.add("hidden");
                document.getElementById("billing-split-receipt-card").classList.add("hidden");
                document.getElementById("billing-type-selection-tabs").classList.add("hidden");
            }
        });
}

function selectBillingTable(tableId) {
    billingSelectedTableId = tableId;
    document.querySelectorAll(".billing-table-card").forEach(c => c.classList.remove("selected"));
    refreshBillingTables();
    
    const table = tableList.find(t => t.id === tableId);
    if (!table) return;
    
    document.getElementById("billing-type-selection-tabs").classList.remove("hidden");
    
    // Load orders and generate both invoice options
    fetch(`/api/orders/table/${table.id}`)
        .then(res => res.json())
        .then(orders => {
            generateCombinedInvoice(table, orders);
            generateSplitInvoice(table, orders);
            
            // Render currently active tab view
            const activeTab = document.querySelector(".billing-tab.active").id;
            if (activeTab === "btn-bill-combined") {
                document.getElementById("billing-receipt-card").classList.remove("hidden");
                document.getElementById("billing-split-receipt-card").classList.add("hidden");
            } else {
                document.getElementById("billing-receipt-card").classList.add("hidden");
                document.getElementById("billing-split-receipt-card").classList.remove("hidden");
            }
        });
}

// Invoice Generator - Combined Table Bill
function generateCombinedInvoice(table, orders) {
    const card = document.getElementById("billing-receipt-card");
    
    let itemsListHtml = "";
    let subtotal = 0;
    
    orders.forEach(order => {
        order.items.forEach(item => {
            const price = item.complimentary ? 0 : item.menuItem.price;
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            
            const compLabel = item.complimentary ? ' (Comp)' : '';
            itemsListHtml += `
                <div class="receipt-item-row">
                    <span>${item.menuItem.name}${compLabel}</span>
                    <span class="text-muted">${item.quantity} x ₹${price} <small>(Seat ${item.seatNumber})</small></span>
                    <span class="receipt-item-total">₹${itemTotal.toFixed(2)}</span>
                </div>
            `;
        });
    });
    
    const discPerc = table.currentCustomer.discountsEarned || 0;
    const discVal = subtotal * (discPerc / 100.0);
    const taxableSub = subtotal - discVal;
    const gst = taxableSub * 0.18;
    const grandTotal = taxableSub + gst;
    
    card.innerHTML = `
        <div class="receipt-header">
            <h4>INVOICE PREVIEW</h4>
            <span class="receipt-table-no">Table ${table.tableNumber}</span>
        </div>
        
        <div class="receipt-body">
            <div class="receipt-row text-muted">
                <span>Customer: <strong id="receipt-cust-name">${table.currentCustomer.name}</strong></span>
                <span id="receipt-cust-mobile">${table.currentCustomer.mobileNumber}</span>
            </div>
            <div class="receipt-row border-bottom">
                <span>Date: ${new Date().toLocaleDateString()}</span>
                <span>Visit Count: ${table.currentCustomer.visitCount + 1}</span>
            </div>

            <div class="receipt-items-list">
                ${itemsListHtml}
            </div>

            <div class="receipt-totals border-top">
                <div class="receipt-row">
                    <span>Subtotal:</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                ${discPerc > 0 ? `
                <div class="receipt-row discount-text text-green">
                    <span>Loyalty Discount (${discPerc}%):</span>
                    <span>-₹${discVal.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="receipt-row text-muted">
                    <span>GST (18%):</span>
                    <span>₹${gst.toFixed(2)}</span>
                </div>
                <div class="receipt-row grand-total border-top">
                    <span>Grand Total:</span>
                    <span>₹${grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="receipt-actions border-top">
            <button class="btn btn-success btn-block" id="btn-process-checkout"><i class="fa-solid fa-circle-dollar-to-slot"></i> Pay Combined Bill & Vacate Table</button>
        </div>
    `;
    
    // Re-attach checkout handler
    document.getElementById("btn-process-checkout").addEventListener("click", executeCheckoutBillCombined);
}

// Invoice Generator - SROS Seating Split Bill
function generateSplitInvoice(table, orders) {
    const card = document.getElementById("billing-split-receipt-card");
    
    // Group order items by seat number
    const seatsData = {};
    for (let seat = 1; seat <= 4; seat++) {
        seatsData[seat] = {
            guestName: "Seat " + seat,
            items: [],
            subtotal: 0
        };
    }
    
    // Query assigned seats names from list
    fetch(`/api/tables/${table.id}/seats`)
        .then(res => res.json())
        .then(assignedSeats => {
            assignedSeats.forEach(as => {
                if (seatsData[as.seatNumber]) {
                    seatsData[as.seatNumber].guestName = as.name;
                }
            });
            
            orders.forEach(order => {
                order.items.forEach(item => {
                    const seatNum = item.seatNumber;
                    if (seatsData[seatNum]) {
                        seatsData[seatNum].items.push(item);
                        const price = item.complimentary ? 0 : item.menuItem.price;
                        seatsData[seatNum].subtotal += (price * item.quantity);
                    }
                });
            });
            
            let splitHtml = "";
            let activeSeatsCount = 0;
            
            for (let seatNum = 1; seatNum <= 4; seatNum++) {
                const sData = seatsData[seatNum];
                if (sData.items.length > 0) {
                    activeSeatsCount++;
                    
                    let seatItemsHtml = "";
                    sData.items.forEach(item => {
                        const price = item.complimentary ? 0 : item.menuItem.price;
                        seatItemsHtml += `
                            <div class="receipt-item-row">
                                <span>${item.menuItem.name}</span>
                                <span class="text-muted">${item.quantity} x ₹${price}</span>
                                <span class="receipt-item-total">₹${(price * item.quantity).toFixed(2)}</span>
                            </div>
                        `;
                    });
                    
                    const sub = sData.subtotal;
                    const discPerc = table.currentCustomer.discountsEarned || 0; // Customers at table share discount
                    const discVal = sub * (discPerc / 100.0);
                    const taxable = sub - discVal;
                    const gst = taxable * 0.18;
                    const total = taxable + gst;
                    
                    splitHtml += `
                        <div class="split-seat-invoice">
                            <div class="split-seat-header flex-row">
                                <h5>Seat ${seatNum}: <strong>${sData.guestName}</strong></h5>
                                <span class="badge badge-primary">Total: ₹${total.toFixed(2)}</span>
                            </div>
                            <div class="receipt-items-list" style="margin: 5px 0;">
                                ${seatItemsHtml}
                            </div>
                            <div class="receipt-totals border-top" style="font-size:11.5px; margin-top:5px; padding-top:5px;">
                                <div class="receipt-row">
                                    <span>Subtotal / GST (18%):</span>
                                    <span>₹${sub.toFixed(2)} / ₹${gst.toFixed(2)}</span>
                                </div>
                                ${discPerc > 0 ? `
                                <div class="receipt-row text-green">
                                    <span>Discount (${discPerc}%):</span>
                                    <span>-₹${discVal.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                <div class="receipt-row font-bold text-success" style="font-size: 13.5px; margin-top: 4px;">
                                    <span>Seat Total:</span>
                                    <span>₹${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
            
            card.innerHTML = `
                <div class="receipt-header">
                    <h4>SPLIT SEAT BILLING</h4>
                    <span class="receipt-table-no">Table ${table.tableNumber}</span>
                </div>
                <div class="receipt-body split-receipts-scroller">
                    ${splitHtml}
                </div>
                <div class="receipt-actions border-top">
                    <button class="btn btn-success btn-block" onclick="executeCheckoutBillCombined()"><i class="fa-solid fa-credit-card"></i> Pay All Split Bills & Clean Table</button>
                </div>
            `;
        });
}

function executeCheckoutBillCombined() {
    if (!billingSelectedTableId) return;
    const table = tableList.find(t => t.id === billingSelectedTableId);
    
    if (!confirm(`Process settlement payment for Table ${table.tableNumber} and mark Cleaning Required?`)) return;
    
    // First increment customer visit count
    fetch(`/api/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: table.currentCustomer.mobileNumber })
    }).then(res => res.json())
    .then(customer => {
        return fetch(`/api/tables/${table.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CLEANING_REQUIRED' })
        });
    }).then(() => {
        // Mark active orders as Delivered
        return fetch(`/api/orders/table/${table.id}`)
            .then(res => res.json())
            .then(orders => {
                const promises = orders.map(order => 
                    fetch(`/api/orders/${order.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'DELIVERED' })
                    })
                );
                return Promise.all(promises);
            });
    }).then(() => {
        alert("checkout processed. Seating locked until cleaned.");
        billingSelectedTableId = null;
        document.getElementById("billing-receipt-card").classList.add("hidden");
        document.getElementById("billing-split-receipt-card").classList.add("hidden");
        document.getElementById("billing-type-selection-tabs").classList.add("hidden");
        
        refreshBillingTables();
        refreshTablesMatrix();
    });
}


// ----------------------------------------------------
// E. MANAGER PORTAL [NEW] - RESERVATIONS & CLEANING
// ----------------------------------------------------

function refreshManagerDashboard(animate = false) {
    if (animate) toggleRefreshSpin("manager");
    
    // 1. Fetch pending reservations
    fetch('/api/reservations/pending')
        .then(res => res.json())
        .then(reservations => {
            pendingReservations = reservations;
            const container = document.getElementById("manager-reservations-container");
            
            if (reservations.length === 0) {
                container.innerHTML = "<p class='empty-message'>No pending reservations.</p>";
                return;
            }
            
            container.innerHTML = "";
            reservations.forEach(res => {
                const ticket = document.createElement("div");
                ticket.className = "reservation-ticket";
                
                const timeStr = new Date(res.reservationTime).toLocaleString();
                
                ticket.innerHTML = `
                    <div class="res-info">
                        <span class="res-guest-name">${res.customer.name}</span>
                        <span class="res-details">Table ${res.table.tableNumber} | ${timeStr} | ${res.customer.mobileNumber}</span>
                    </div>
                    <div class="res-actions">
                        <button class="btn btn-success btn-sm" onclick="confirmManagerBooking(${res.id})"><i class="fa-solid fa-check"></i> Confirm</button>
                        <button class="btn btn-danger btn-sm" onclick="cancelManagerBooking(${res.id})"><i class="fa-solid fa-xmark"></i> Reject</button>
                    </div>
                `;
                container.appendChild(ticket);
            });
        });

    // 2. Fetch tables in cleaning required state
    fetch('/api/tables')
        .then(res => res.json())
        .then(tables => {
            const container = document.getElementById("manager-cleaning-alerts-container");
            container.innerHTML = "";
            
            let cleaningAlertsCount = 0;
            tables.forEach(t => {
                if (t.status === 'CLEANING_REQUIRED' || t.status === 'CLEANING_IN_PROGRESS') {
                    cleaningAlertsCount++;
                    const row = document.createElement("div");
                    row.className = "cleaning-alert-item";
                    
                    let cleanActionBtn = "";
                    if (t.status === 'CLEANING_REQUIRED') {
                        cleanActionBtn = `<button class="btn btn-primary btn-sm" onclick="startTableCleaning(${t.id})"><i class="fa-solid fa-soap"></i> Assign Cleaning</button>`;
                    } else {
                        cleanActionBtn = `<button class="btn btn-success btn-sm" onclick="completeTableCleaning(${t.id})"><i class="fa-solid fa-circle-check"></i> Complete</button>`;
                    }
                    
                    row.innerHTML = `
                        <span><strong>Table ${t.tableNumber}</strong> requires cleaning (${t.status.replace(/_/g, " ")})</span>
                        ${cleanActionBtn}
                    `;
                    container.appendChild(row);
                }
            });
            
            if (cleaningAlertsCount === 0) {
                container.innerHTML = "<p class='empty-message'>No tables in cleaning queue currently.</p>";
            }
        });
}

function simulateManagerReservation() {
    const name = document.getElementById("sim-book-name").value;
    const mobile = document.getElementById("sim-book-mobile").value;
    const table = document.getElementById("sim-book-table").value;
    const time = document.getElementById("sim-book-time").value;
    
    apiRequest('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
            tableNumber: table,
            customerName: name,
            customerMobile: mobile,
            time: time
        })
    }).then(res => {
        alert("Reservation requested added to manager approvals list!");
        document.getElementById("manager-booking-sim-form").reset();
        refreshManagerDashboard();
    }).catch(err => {
        alert("Simulation failed: " + err.message);
    });
}

function confirmManagerBooking(id) {
    apiRequest(`/api/reservations/${id}/confirm`, {
        method: 'POST'
    }).then(() => {
        refreshManagerDashboard();
        alert("Booking confirmed. Table reserved.");
    }).catch(err => {
        alert("Confirmation failed: " + err.message);
    });
}

function cancelManagerBooking(id) {
    if (!confirm("Reject this reservation?")) return;
    apiRequest(`/api/reservations/${id}/cancel`, {
        method: 'POST'
    }).then(() => {
        refreshManagerDashboard();
    });
}

function startTableCleaning(tableId) {
    apiRequest(`/api/tables/${tableId}/start-cleaning`, { method: 'POST' }).then(() => refreshManagerDashboard());
}
function completeTableCleaning(tableId) {
    apiRequest(`/api/tables/${tableId}/complete-cleaning`, { method: 'POST' }).then(() => refreshManagerDashboard());
}


// ----------------------------------------------------
// F. OWNER/ADMIN PORTAL
// ----------------------------------------------------

function renderOwnerPortal() {
    let totalRevenue = 0;
    let activeOrdersCount = 0;
    
    // Calculate table utilization
    fetch('/api/tables')
        .then(res => res.json())
        .then(tables => {
            const occupied = tables.filter(t => t.status === 'OCCUPIED' || t.status === 'BILLING_PENDING').length;
            const util = Math.round((occupied / tables.length) * 100);
            document.getElementById("owner-stat-utilization").innerText = `${util}%`;
        });
        
    // Calculate total orders
    fetch('/api/orders/active')
        .then(res => res.json())
        .then(activeOrd => {
            activeOrdersCount += activeOrd.length;
            document.getElementById("owner-stat-orders").innerText = activeOrdersCount;
        });

    // Populate customer log
    const custBody = document.getElementById("owner-customers-list");
    custBody.innerHTML = "<tr><td colspan='6' class='text-center'>Loading...</td></tr>";
    
    fetch('/api/tables')
        .then(res => res.json())
        .then(tables => {
            custBody.innerHTML = "";
            let custSeen = new Set();
            
            tables.forEach(t => {
                if (t.currentCustomer && !custSeen.has(t.currentCustomer.id)) {
                    custSeen.add(t.currentCustomer.id);
                    const c = t.currentCustomer;
                    const referrals = c.referralHistory ? c.referralHistory.length : 0;
                    
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${c.name}</strong></td>
                        <td><code>${c.mobileNumber}</code></td>
                        <td><span class="badge ${c.loyaltyTier === 'PREMIUM' ? 'badge-accent' : 'badge-success'}">${c.loyaltyTier}</span></td>
                        <td>${c.visitCount}</td>
                        <td>${referrals}</td>
                        <td class="text-green">${c.discountsEarned}% off next bill</td>
                    `;
                    custBody.appendChild(tr);
                }
            });
            
            if (custSeen.size === 0) {
                custBody.innerHTML = "<tr><td colspan='6' class='empty-message'>No customers seated.</td></tr>";
            }
            
            document.getElementById("owner-stat-customers").innerText = custSeen.size;
        });
        
    renderOwnerPeakSvgChart();
}

function renderOwnerPeakSvgChart() {
    const wrapper = document.getElementById("peak-hour-chart-wrapper");
    if (!wrapper) return;
    
    const data = [
        { hour: "11:00", orders: 2 },
        { hour: "12:00", orders: 12 },
        { hour: "13:00", orders: 28 }, 
        { hour: "14:00", orders: 20 },
        { hour: "15:00", orders: 6 },
        { hour: "16:00", orders: 4 },
        { hour: "17:00", orders: 5 },
        { hour: "18:00", orders: 15 },
        { hour: "19:00", orders: 35 }, 
        { hour: "20:00", orders: 45 },
        { hour: "21:00", orders: 48 }, 
        { hour: "22:00", orders: 22 }
    ];
    
    const svgWidth = 600;
    const svgHeight = 200;
    const padding = 30;
    const maxVal = 50;
    
    const getX = (index) => padding + (index * (svgWidth - padding * 2) / (data.length - 1));
    const getY = (val) => svgHeight - padding - (val * (svgHeight - padding * 2) / maxVal);
    
    let pathD = `M ${getX(0)} ${getY(data[0].orders)}`;
    let areaD = `M ${getX(0)} ${svgHeight - padding} L ${getX(0)} ${getY(data[0].orders)}`;
    
    for (let i = 1; i < data.length; i++) {
        pathD += ` L ${getX(i)} ${getY(data[i].orders)}`;
        areaD += ` L ${getX(i)} ${getY(data[i].orders)}`;
    }
    areaD += ` L ${getX(data.length - 1)} ${svgHeight - padding} Z`;
    
    let grids = "";
    let labels = "";
    
    for (let j = 0; j <= 4; j++) {
        const gridVal = j * (maxVal / 4);
        const y = getY(gridVal);
        grids += `<line x1="${padding}" y1="${y}" x2="${svgWidth - padding}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
        labels += `<text x="${padding - 8}" y="${y + 4}" fill="#94a3b8" font-size="9" text-anchor="end">${gridVal}</text>`;
    }
    
    data.forEach((d, idx) => {
        const x = getX(idx);
        labels += `<text x="${x}" y="${svgHeight - 10}" fill="#94a3b8" font-size="9" text-anchor="middle">${d.hour}</text>`;
    });
    
    let dots = "";
    data.forEach((d, idx) => {
        dots += `<circle cx="${getX(idx)}" cy="${getY(d.orders)}" r="4" fill="#06b6d4" stroke="#090d16" stroke-width="2" />`;
    });
    
    wrapper.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            ${grids}
            <path d="${areaD}" fill="url(#chart-area-grad)"/>
            <path d="${pathD}" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
            ${dots}
            ${labels}
        </svg>
    `;
}


// ----------------------------------------------------
// UI Spin Refresh Helpers
// ----------------------------------------------------
function toggleRefreshSpin(portal) {
    // Find refresh button inside active role view
    const view = document.getElementById(`portal-${portal}`);
    if (view) {
        const btn = view.querySelector(".btn-refresh");
        if (btn) {
            btn.classList.add("spinning");
            setTimeout(() => btn.classList.remove("spinning"), 600);
        }
    }
}
