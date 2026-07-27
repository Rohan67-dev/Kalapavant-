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
let pendingAuthData = null;   // Pending OTP registration/login data
let otpTimer = null;          // Interval ID for OTP countdown

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
        
        if (type === 'CALL_WAITER' || type === 'waiter') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.35);
            
            setTimeout(() => {
                if (!audioCtx) return;
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
        } else if (type === 'REQUEST_WATER') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.35);
            
            const frequencies = [800, 600, 400];
            frequencies.forEach((freq, idx) => {
                setTimeout(() => {
                    if (!audioCtx) return;
                    const oscNode = audioCtx.createOscillator();
                    const gainN = audioCtx.createGain();
                    oscNode.connect(gainN);
                    gainN.connect(audioCtx.destination);
                    oscNode.type = 'sine';
                    oscNode.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    gainN.gain.setValueAtTime(0.12, audioCtx.currentTime);
                    gainN.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
                    oscNode.start(audioCtx.currentTime);
                    oscNode.stop(audioCtx.currentTime + 0.3);
                }, (idx + 1) * 100);
            });
        } else if (type === 'REQUEST_BILL') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, now);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.45);
            
            setTimeout(() => {
                if (!audioCtx) return;
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1750, audioCtx.currentTime);
                gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                osc2.start(audioCtx.currentTime);
                osc2.stop(audioCtx.currentTime + 0.45);
            }, 100);
        } else if (type === 'CLEAN_TABLE') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            osc.start(now);
            osc.stop(now + 0.6);
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

function setupDateTimePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const minStr = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 7);
    const maxYear = maxDate.getFullYear();
    const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDay = String(maxDate.getDate()).padStart(2, '0');
    const maxStr = `${maxYear}-${maxMonth}-${maxDay}T23:59`;
    
    input.min = minStr;
    input.max = maxStr;
    
    if (!input.value) {
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 2);
        defaultDate.setMinutes(0);
        const defYear = defaultDate.getFullYear();
        const defMonth = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const defDay = String(defaultDate.getDate()).padStart(2, '0');
        const defHours = String(defaultDate.getHours()).padStart(2, '0');
        const defMinutes = String(defaultDate.getMinutes()).padStart(2, '0');
        input.value = `${defYear}-${defMonth}-${defDay}T${defHours}:${defMinutes}`;
    }
}

function setupInputValidation(inputId, type, isOptional = false) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let msg = input.parentElement.querySelector(".validation-msg");
    if (!msg) {
        msg = document.createElement("div");
        msg.className = "validation-msg";
        input.parentElement.appendChild(msg);
    }
    
    function validate() {
        const val = input.value;
        let isValid = true;
        let errorMsg = "";
        
        if (isOptional && !val) {
            msg.style.display = "none";
            input.style.borderColor = "";
            return true;
        }
        
        if (type === "name") {
            if (!val || val.trim().isEmpty) {
                isValid = false;
                errorMsg = "Name cannot be empty.";
            } else if (!/^[a-zA-Z\s]+$/.test(val)) {
                isValid = false;
                errorMsg = "Name must only contain alphabetic characters and spaces.";
            }
        } else if (type === "mobile") {
            if (!val) {
                isValid = false;
                errorMsg = "Mobile number cannot be empty.";
            } else if (!/^\d{10}$/.test(val)) {
                isValid = false;
                errorMsg = "Mobile number must be exactly 10 digits.";
            }
        } else if (type === "date") {
            if (!val) {
                isValid = false;
                errorMsg = "Date and time is required.";
            } else {
                const bookingDate = new Date(val);
                const today = new Date();
                today.setHours(0,0,0,0);
                const maxAllowed = new Date();
                maxAllowed.setDate(today.getDate() + 7);
                maxAllowed.setHours(23,59,59,999);
                
                if (bookingDate < today) {
                    isValid = false;
                    errorMsg = "Reservation date cannot be in the past.";
                } else if (bookingDate > maxAllowed) {
                    isValid = false;
                    errorMsg = "Reservation can only be made up to 7 days in advance.";
                }
            }
        }
        
        if (!isValid) {
            msg.innerText = errorMsg;
            msg.style.display = "block";
            input.style.borderColor = "#f43f5e";
        } else {
            msg.style.display = "none";
            input.style.borderColor = "";
        }
        return isValid;
    }
    
    input.addEventListener("input", validate);
    input.addEventListener("change", validate);
    input.validateField = validate;
}

function validateFormInputs(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;
    let isFormValid = true;
    const inputs = form.querySelectorAll("input");
    inputs.forEach(input => {
        if (typeof input.validateField === "function") {
            if (!input.validateField()) {
                isFormValid = false;
            }
        }
    });
    return isFormValid;
}

function initSrosApp() {
    // Setup inputs validation
    setupInputValidation("login-mobile", "mobile");
    setupInputValidation("signup-name", "name");
    setupInputValidation("signup-mobile", "mobile");
    setupInputValidation("seating-cust-name", "name");
    setupInputValidation("seating-cust-mobile", "mobile");
    setupInputValidation("seating-cust-referrer", "mobile", true);
    setupInputValidation("staff-reg-name", "name");
    setupInputValidation("staff-reg-mobile", "mobile");
    setupInputValidation("sim-book-name", "name");
    setupInputValidation("sim-book-mobile", "mobile");
    setupInputValidation("sim-book-time", "date");
    setupInputValidation("waiter-book-name", "name");
    setupInputValidation("waiter-book-mobile", "mobile");
    setupInputValidation("waiter-book-time", "date");
    
    setupDateTimePicker("sim-book-time");
    setupDateTimePicker("waiter-book-time");

    // 3D Parallax Scroll Listener
    window.addEventListener("scroll", () => {
        const scrolled = window.scrollY;
        const bgLayer = document.querySelector(".parallax-layer.bg-layer");
        if (bgLayer) {
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

    // Tab switching for unified SROS login card
    const tabBtnLogin = document.getElementById("tab-btn-login");
    const tabBtnSignup = document.getElementById("tab-btn-signup");
    const loginFormWrapper = document.getElementById("login-form-wrapper");
    const signupFormWrapper = document.getElementById("signup-form-wrapper");

    if (tabBtnLogin && tabBtnSignup) {
        tabBtnLogin.addEventListener("click", () => {
            tabBtnLogin.classList.add("active");
            tabBtnSignup.classList.remove("active");
            loginFormWrapper.classList.remove("hidden");
            signupFormWrapper.classList.add("hidden");
        });

        tabBtnSignup.addEventListener("click", () => {
            tabBtnSignup.classList.add("active");
            tabBtnLogin.classList.remove("active");
            signupFormWrapper.classList.remove("hidden");
            loginFormWrapper.classList.add("hidden");
        });
    }

    // Submit listeners for unified login and signup forms
    document.getElementById("unified-login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validateFormInputs("unified-login-form")) return;
        submitUnifiedLogin();
    });

    document.getElementById("unified-signup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validateFormInputs("unified-signup-form")) return;
        submitUnifiedSignUp();
    });

    const seatingForm = document.getElementById("unified-seating-form");
    if (seatingForm) {
        seatingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!validateFormInputs("unified-seating-form")) return;
            submitCustomerSeating();
        });
    }

    const addStaffForm = document.getElementById("owner-add-staff-form");
    if (addStaffForm) {
        addStaffForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!validateFormInputs("owner-add-staff-form")) return;
            registerNewStaff();
        });
    }

    // Theme toggle listeners
    document.querySelectorAll(".btn-theme-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
            const body = document.body;
            body.classList.toggle("light-theme");
            const isLight = body.classList.contains("light-theme");
            localStorage.setItem("sros_theme", isLight ? "light" : "dark");
            
            // Update icons for all theme toggle buttons
            document.querySelectorAll(".btn-theme-toggle i").forEach(i => {
                i.className = isLight ? "fa-solid fa-sun" : "fa-solid fa-moon";
            });
        });
    });
    
    // Load cached theme
    const cachedTheme = localStorage.getItem("sros_theme");
    if (cachedTheme === "light") {
        document.body.classList.add("light-theme");
        document.querySelectorAll(".btn-theme-toggle i").forEach(i => {
            i.className = "fa-solid fa-sun";
        });
    }

    // Logout from portals
    document.getElementById("btn-sros-logout").addEventListener("click", logoutPortalUser);

    // OTP Modal listeners
    const otpForm = document.getElementById("otp-verification-form");
    if (otpForm) {
        otpForm.addEventListener("submit", (e) => {
            e.preventDefault();
            verifyOtpCode();
        });
    }

    const btnResendOtp = document.getElementById("btn-resend-otp");
    if (btnResendOtp) {
        btnResendOtp.addEventListener("click", () => {
            resendOtpCode();
        });
    }

    const btnCancelOtp = document.getElementById("btn-cancel-otp");
    if (btnCancelOtp) {
        btnCancelOtp.addEventListener("click", () => {
            closeOtpModal();
        });
    }

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
    document.getElementById("btn-waiter-place-order-assisted").addEventListener("click", openWaiterAssistedOrderModal);
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
        if (!validateFormInputs("manager-booking-sim-form")) return;
        simulateManagerReservation();
    });

    // Waiter reservations portal listeners
    const waiterResForm = document.getElementById("waiter-reservation-form");
    if (waiterResForm) {
        waiterResForm.addEventListener("submit", submitWaiterReservation);
    }
    const btnWaiterCancelEdit = document.getElementById("btn-waiter-cancel-edit-booking");
    if (btnWaiterCancelEdit) {
        btnWaiterCancelEdit.addEventListener("click", cancelWaiterEditBooking);
    }
    
    // Waiter assisted ordering listeners
    const waiterMenuSearch = document.getElementById("waiter-menu-search");
    if (waiterMenuSearch) {
        waiterMenuSearch.addEventListener("input", renderWaiterMenu);
    }
    const btnCloseWaiterOrderModal = document.getElementById("btn-close-waiter-order-modal");
    if (btnCloseWaiterOrderModal) {
        btnCloseWaiterOrderModal.addEventListener("click", () => {
            document.getElementById("waiter-order-modal").classList.add("hidden");
        });
    }
    const btnWaiterSubmitOrder = document.getElementById("btn-waiter-submit-order");
    if (btnWaiterSubmitOrder) {
        btnWaiterSubmitOrder.addEventListener("click", submitWaiterAssistedOrder);
    }

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

function showToastNotification(req) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = "toast-card shadow";
    
    const seatStr = req.seatNumber ? ` - Seat ${req.seatNumber}` : "";
    const typeLabel = req.type ? req.type.replace(/_/g, " ") : "ASSISTANCE";
    
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title"><i class="fa-solid fa-circle-exclamation"></i> Assistance Requested</span>
            <button class="btn-close" style="font-size:12px; opacity:0.6; background:none; border:none; color:inherit; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="toast-body">
            <strong>Table ${req.tableNumber}${seatStr}</strong> is requesting <strong>${typeLabel}</strong>.
        </div>
        <button class="btn btn-success btn-sm btn-block" style="margin-top:5px;"><i class="fa-solid fa-check"></i> Resolve Request</button>
    `;
    
    toast.querySelector(".toast-header button").onclick = () => {
        toast.remove();
    };
    
    toast.querySelector(".btn-success").onclick = () => {
        apiRequest(`/api/assistance/${req.id}/resolve`, { method: 'POST' })
            .then(() => {
                toast.remove();
                refreshAssistanceRequests();
            })
            .catch(err => alert("Failed to resolve: " + err.message));
    };
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 20000);
}

function handleIncomingSrosEvent(event) {
    const { type, payload } = event;
    console.log("SROS Event:", type, payload);

    if (type === "ASSISTANCE_REQUEST") {
        playChime(payload.type);
        refreshAssistanceRequests();
        if (authenticatedRole === 'waiter') {
            showToastNotification(payload);
        }
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
        if (authenticatedRole === 'waiter') loadWaiterReservations();
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
    if (authenticatedRole === 'waiter') {
        loadWaiterReservations();
        populateWaiterTableDropdown();
    }
    if (authenticatedRole === 'manager') refreshManagerDashboard();
    if (authenticatedRole === 'owner') renderOwnerPortal();
}

// Unified Portal login handler
function submitUnifiedLogin() {
    const mobile = document.getElementById("login-mobile").value.trim();
    const password = document.getElementById("login-password").value.trim();

    // First try staff authentication on backend
    fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile, password: password })
    }).then(res => {
        if (res.ok) {
            return res.json().then(staff => {
                const cleanRole = staff.role.toLowerCase().replace('_', '-');
                sessionStorage.setItem("sros_role", cleanRole);
                enterStaffPortal(cleanRole);
            });
        } else {
            return res.text().then(errorMessage => {
                if (errorMessage.includes("Incorrect passcode")) {
                    throw new Error(errorMessage);
                } else {
                    // Try customer login
                    return apiRequest('/api/customers/login', {
                        method: 'POST',
                        body: JSON.stringify({ mobileNumber: mobile, password: password })
                    }).then(response => {
                        if (response.status === "OTP_VERIFICATION_PENDING") {
                            pendingAuthData = {
                                type: 'login',
                                mobileNumber: mobile,
                                email: response.email
                            };
                            openOtpModal(response.message);
                        } else {
                            currentCustomer = response;
                            // Hide login panels
                            document.getElementById("login-form-wrapper").classList.add("hidden");
                            document.querySelector(".login-tabs").style.display = "none";
                            // Show seating step
                            document.getElementById("seating-step-wrapper").classList.remove("hidden");
                        }
                    });
                }
            });
        }
    }).catch(err => {
        alert("Authentication failed: " + err.message);
    });
}

// Unified Portal registration handler
function submitUnifiedSignUp() {
    const name = document.getElementById("signup-name").value.trim();
    const mobile = document.getElementById("signup-mobile").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    apiRequest('/api/customers/register', {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            mobileNumber: mobile,
            email: email,
            password: password
        })
    }).then(response => {
        if (response.status === "OTP_VERIFICATION_PENDING") {
            pendingAuthData = {
                type: 'register',
                name: name,
                mobileNumber: mobile,
                email: email,
                password: password
            };
            openOtpModal(response.message);
        } else {
            currentCustomer = response;
            // Hide signup panels
            document.getElementById("signup-form-wrapper").classList.add("hidden");
            document.querySelector(".login-tabs").style.display = "none";
            // Show seating step
            document.getElementById("seating-step-wrapper").classList.remove("hidden");
        }
    }).catch(err => {
        alert("Registration failed: " + err.message);
    });
}

// OTP modal control & action helpers
function openOtpModal(message) {
    document.getElementById("otp-message").innerText = message;
    document.getElementById("otp-input-code").value = "";
    document.getElementById("otp-verification-modal").classList.remove("hidden");
    startOtpCountdown();
}

function closeOtpModal() {
    document.getElementById("otp-verification-modal").classList.add("hidden");
    clearInterval(otpTimer);
    pendingAuthData = null;
}

function startOtpCountdown() {
    let countdown = 60;
    const timerText = document.getElementById("otp-countdown");
    const timerWrapper = document.getElementById("otp-timer-wrapper");
    const resendBtn = document.getElementById("btn-resend-otp");

    timerWrapper.classList.remove("hidden");
    resendBtn.classList.add("hidden");
    timerText.innerText = countdown;

    clearInterval(otpTimer);
    otpTimer = setInterval(() => {
        countdown--;
        timerText.innerText = countdown;
        if (countdown <= 0) {
            clearInterval(otpTimer);
            timerWrapper.classList.add("hidden");
            resendBtn.classList.remove("hidden");
        }
    }, 1000);
}

function verifyOtpCode() {
    if (!pendingAuthData) return;
    const otpCode = document.getElementById("otp-input-code").value.trim();
    if (otpCode.length !== 6) {
        alert("Please enter a valid 6-digit OTP");
        return;
    }

    const payload = {
        type: pendingAuthData.type,
        otpCode: otpCode,
        mobileNumber: pendingAuthData.mobileNumber,
        email: pendingAuthData.email,
        name: pendingAuthData.name,
        password: pendingAuthData.password
    };

    apiRequest('/api/customers/verify-otp', {
        method: 'POST',
        body: JSON.stringify(payload)
    }).then(customer => {
        currentCustomer = customer;
        closeOtpModal();
        
        // Hide login and signup forms
        document.getElementById("login-form-wrapper").classList.add("hidden");
        document.getElementById("signup-form-wrapper").classList.add("hidden");
        document.querySelector(".login-tabs").style.display = "none";
        
        // Show seating step
        document.getElementById("seating-step-wrapper").classList.remove("hidden");
        
        alert("Authentication successful!");
    }).catch(err => {
        alert("Verification failed: " + err.message);
    });
}

function resendOtpCode() {
    if (!pendingAuthData) return;

    apiRequest('/api/customers/resend-otp', {
        method: 'POST',
        body: JSON.stringify({
            mobileNumber: pendingAuthData.mobileNumber,
            email: pendingAuthData.email
        })
    }).then(response => {
        alert("A new OTP has been sent successfully!");
        startOtpCountdown();
    }).catch(err => {
        alert("Failed to resend OTP: " + err.message);
    });
}

// Intermediate Customer Seating step
function submitCustomerSeating() {
    if (!currentCustomer) return;
    const tableNum = parseInt(document.getElementById("seating-cust-table").value);
    const seatNum = parseInt(document.getElementById("seating-cust-seat").value);
    const referrer = document.getElementById("seating-cust-referrer").value.trim();

    currentTable = tableNum;
    currentSeat = seatNum;

    // Seating check-in
    apiRequest(`/api/tables/${tableNum}/checkin`, {
        method: 'POST',
        body: JSON.stringify({
            name: currentCustomer.name,
            mobileNumber: currentCustomer.mobileNumber,
            password: currentCustomer.password,
            referrerMobile: referrer
        })
    }).then(table => {
        // Seat assignment
        return apiRequest(`/api/tables/${table.id}/seats/${seatNum}/assign`, {
            method: 'POST',
            body: JSON.stringify({
                name: currentCustomer.name,
                mobileNumber: currentCustomer.mobileNumber
            })
        });
    }).then(() => {
        // Save in session
        sessionStorage.setItem("sros_role", "customer");
        sessionStorage.setItem("sros_customer", JSON.stringify(currentCustomer));
        sessionStorage.setItem("sros_table", currentTable.toString());
        sessionStorage.setItem("sros_seat", currentSeat.toString());

        // Hide seating step and restore layout for future logouts
        document.getElementById("seating-step-wrapper").classList.add("hidden");
        document.getElementById("login-form-wrapper").classList.remove("hidden");
        document.querySelector(".login-tabs").style.display = "flex";

        enterCustomerPortal();
    }).catch(err => {
        alert("Table check-in failed: " + err.message);
    });
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
    
    // Clear active tracker UI
    const trackerContainer = document.getElementById("tracker-order-items-container");
    if (trackerContainer) trackerContainer.innerHTML = "";
    const activeLabel = document.getElementById("active-order-id-label");
    if (activeLabel) activeLabel.innerText = "";
    
    // Reset forms
    const loginForm = document.getElementById("unified-login-form");
    if (loginForm) loginForm.reset();
    const signupForm = document.getElementById("unified-signup-form");
    if (signupForm) signupForm.reset();
    const seatingForm = document.getElementById("unified-seating-form");
    if (seatingForm) seatingForm.reset();
    
    document.getElementById("sros-portal-header").classList.add("hidden");
    document.querySelectorAll(".portal-view").forEach(v => v.classList.remove("active"));
    document.getElementById("portal-login-gate").classList.add("active");
    
    // Reset seating step visibility
    document.getElementById("seating-step-wrapper").classList.add("hidden");
    document.querySelector(".login-tabs").style.display = "flex";
    
    // Select default tab
    const tabBtnLogin = document.getElementById("tab-btn-login");
    const tabBtnSignup = document.getElementById("tab-btn-signup");
    const loginFormWrapper = document.getElementById("login-form-wrapper");
    const signupFormWrapper = document.getElementById("signup-form-wrapper");
    if (tabBtnLogin && tabBtnSignup) {
        tabBtnLogin.classList.add("active");
        tabBtnSignup.classList.remove("active");
        loginFormWrapper.classList.remove("hidden");
        signupFormWrapper.classList.add("hidden");
    }
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
    if (!currentCustomer) return;
    fetch(`/api/orders/customer/${currentCustomer.id}`)
        .then(res => res.json())
        .then(orders => {
            const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
            if (activeOrders && activeOrders.length > 0) {
                currentOrder = activeOrders[activeOrders.length - 1];
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

let waiterReservationsList = [];
let waiterCart = [];

function populateWaiterTableDropdown() {
    const select = document.getElementById("waiter-book-table");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = "";
    tableList.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.tableNumber;
        opt.innerText = `Table ${t.tableNumber} (${t.status.replace(/_/g, " ")})`;
        select.appendChild(opt);
    });
    if (currentVal) {
        select.value = currentVal;
    }
}

function loadWaiterReservations() {
    fetch('/api/reservations')
        .then(res => res.json())
        .then(resList => {
            waiterReservationsList = resList;
            const body = document.getElementById("waiter-reservations-list-body");
            if (!body) return;
            body.innerHTML = "";
            
            if (resList.length === 0) {
                body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px;" class="text-muted">No reservations booked.</td></tr>`;
                return;
            }
            
            resList.forEach(r => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid rgba(255, 255, 255, 0.05)";
                
                const timeFormatted = r.time ? r.time.replace('T', ' ').substring(0, 16) : "";
                
                let actionBtns = "";
                if (r.status === 'PENDING') {
                    actionBtns += `<button class="btn btn-success btn-sm" onclick="confirmWaiterBooking(${r.id})" style="margin-right: 5px;"><i class="fa-solid fa-check"></i> Confirm</button>`;
                }
                actionBtns += `<button class="btn btn-primary btn-sm" onclick="editWaiterBooking(${r.id})" style="margin-right: 5px;"><i class="fa-solid fa-pen"></i> Edit</button>`;
                actionBtns += `<button class="btn btn-danger btn-sm" onclick="cancelWaiterBooking(${r.id})"><i class="fa-solid fa-trash"></i> Cancel</button>`;
                
                tr.innerHTML = `
                    <td style="padding: 10px 5px; font-weight:700;">Table ${r.tableNumber}</td>
                    <td style="padding: 10px 5px;">${r.customerName}</td>
                    <td style="padding: 10px 5px;">${r.customerMobile}</td>
                    <td style="padding: 10px 5px;">${timeFormatted}</td>
                    <td style="padding: 10px 5px;"><span class="badge badge-${r.status === 'CONFIRMED' ? 'success' : (r.status === 'PENDING' ? 'warning' : 'danger')}">${r.status}</span></td>
                    <td style="padding: 10px 5px; display:flex;">${actionBtns}</td>
                `;
                body.appendChild(tr);
            });
        });
}

function confirmWaiterBooking(id) {
    apiRequest(`/api/reservations/${id}/confirm`, { method: 'POST' })
        .then(() => {
            loadWaiterReservations();
            refreshTablesMatrix();
            if (authenticatedRole === 'manager') refreshManagerDashboard();
            alert("Reservation confirmed successfully!");
        })
        .catch(err => alert("Confirmation failed: " + err.message));
}

function cancelWaiterBooking(id) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    apiRequest(`/api/reservations/${id}/cancel`, { method: 'POST' })
        .then(() => {
            loadWaiterReservations();
            refreshTablesMatrix();
            if (authenticatedRole === 'manager') refreshManagerDashboard();
            alert("Reservation cancelled successfully!");
        })
        .catch(err => alert("Cancellation failed: " + err.message));
}

function editWaiterBooking(id) {
    const res = waiterReservationsList.find(r => r.id === id);
    if (!res) return;
    
    document.getElementById("waiter-edit-reservation-id").value = res.id;
    document.getElementById("waiter-book-name").value = res.customerName;
    document.getElementById("waiter-book-mobile").value = res.customerMobile;
    document.getElementById("waiter-book-table").value = res.tableNumber;
    
    if (res.time) {
        document.getElementById("waiter-book-time").value = res.time.substring(0, 16);
    }
    
    document.getElementById("waiter-res-form-title").innerText = "Edit Table Reservation";
    document.getElementById("btn-waiter-submit-booking").innerText = "Update Reservation";
    document.getElementById("btn-waiter-cancel-edit-booking").classList.remove("hidden");
    
    const form = document.getElementById("waiter-reservation-form");
    if (form) {
        form.querySelectorAll("input").forEach(i => {
            if (typeof i.validateField === "function") i.validateField();
        });
    }
    
    form.scrollIntoView({ behavior: 'smooth' });
}

function cancelWaiterEditBooking() {
    document.getElementById("waiter-edit-reservation-id").value = "";
    document.getElementById("waiter-reservation-form").reset();
    document.getElementById("waiter-res-form-title").innerText = "Book Table";
    document.getElementById("btn-waiter-submit-booking").innerText = "Create Reservation";
    document.getElementById("btn-waiter-cancel-edit-booking").classList.add("hidden");
    
    const form = document.getElementById("waiter-reservation-form");
    if (form) {
        form.querySelectorAll(".validation-msg").forEach(m => m.style.display = "none");
        form.querySelectorAll("input").forEach(i => i.style.borderColor = "");
    }
}

function submitWaiterReservation(e) {
    e.preventDefault();
    if (!validateFormInputs("waiter-reservation-form")) return;
    
    const id = document.getElementById("waiter-edit-reservation-id").value;
    const name = document.getElementById("waiter-book-name").value.trim();
    const mobile = document.getElementById("waiter-book-mobile").value.trim();
    const table = document.getElementById("waiter-book-table").value;
    const timeVal = document.getElementById("waiter-book-time").value;
    const time = timeVal ? timeVal.replace('T', ' ') : "";
    
    const bodyObj = {
        tableNumber: table,
        customerName: name,
        customerMobile: mobile,
        time: time
    };
    
    const url = id ? `/api/reservations/${id}` : '/api/reservations';
    const method = id ? 'PUT' : 'POST';
    
    apiRequest(url, {
        method: method,
        body: JSON.stringify(bodyObj)
    }).then(() => {
        alert(id ? "Reservation updated successfully!" : "Reservation created successfully!");
        cancelWaiterEditBooking();
        loadWaiterReservations();
        refreshTablesMatrix();
        if (authenticatedRole === 'manager') refreshManagerDashboard();
    }).catch(err => {
        alert("Action failed: " + err.message);
    });
}

function openWaiterAssistedOrderModal() {
    if (!inspectedTableNum) return;
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    if (!table) return;
    
    if (table.status !== 'OCCUPIED' && table.status !== 'BILLING_PENDING') {
        alert("Please check in a customer to this table first using Seat Guest Assignments!");
        return;
    }
    
    document.getElementById("waiter-order-table-number").innerText = inspectedTableNum;
    waiterCart = [];
    document.getElementById("waiter-order-priority").checked = false;
    document.getElementById("waiter-order-instructions").value = "";
    document.getElementById("waiter-seat-selector").value = "0";
    
    document.getElementById("waiter-order-modal").classList.remove("hidden");
    
    fetch('/api/menu')
        .then(res => res.json())
        .then(items => {
            menuItems = items;
            
            const categories = [...new Set(items.map(item => item.category))];
            const catContainer = document.getElementById("waiter-menu-categories");
            catContainer.innerHTML = "";
            
            const allTab = document.createElement("button");
            allTab.type = "button";
            allTab.className = "menu-tab active";
            allTab.innerText = "ALL";
            allTab.onclick = () => {
                document.querySelectorAll("#waiter-menu-categories .menu-tab").forEach(t => t.classList.remove("active"));
                allTab.classList.add("active");
                renderWaiterMenu();
            };
            catContainer.appendChild(allTab);
            
            categories.forEach(cat => {
                const tab = document.createElement("button");
                tab.type = "button";
                tab.className = "menu-tab";
                tab.innerText = cat;
                tab.onclick = () => {
                    document.querySelectorAll("#waiter-menu-categories .menu-tab").forEach(t => t.classList.remove("active"));
                    tab.classList.add("active");
                    renderWaiterMenu();
                };
                catContainer.appendChild(tab);
            });
            
            renderWaiterMenu();
            renderWaiterCart();
        });
}

function renderWaiterMenu() {
    const grid = document.getElementById("waiter-dishes-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    const activeTab = document.querySelector("#waiter-menu-categories .menu-tab.active");
    const activeCategory = activeTab ? activeTab.innerText : "ALL";
    const searchVal = document.getElementById("waiter-menu-search").value.toLowerCase().trim();
    
    const filtered = menuItems.filter(item => {
        const matchesCategory = (activeCategory === "ALL" || item.category === activeCategory);
        const matchesSearch = item.name.toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `<p class="empty-message" style="grid-column: 1/-1;">No dishes found.</p>`;
        return;
    }
    
    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.justifyContent = "space-between";
        card.style.padding = "10px";
        card.style.borderRadius = "8px";
        card.style.background = "rgba(255, 255, 255, 0.05)";
        card.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        
        const priceLabel = item.chargeable ? `₹${item.price}` : "FREE";
        
        card.innerHTML = `
            <div>
                <strong style="font-size:13px; display:block; color:var(--color-text-main);">${item.name}</strong>
                <span class="text-muted" style="font-size:10px;">Category: ${item.category}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <span style="font-weight:700; color:var(--color-primary); font-size:13px;">${priceLabel}</span>
                <button type="button" class="btn btn-primary btn-sm" onclick="addDishToWaiterCart(${item.id})"><i class="fa-solid fa-plus"></i> Add</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addDishToWaiterCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    const seatSelector = document.getElementById("waiter-seat-selector");
    const seatNumber = parseInt(seatSelector.value);
    
    const existing = waiterCart.find(c => c.menuItem.id === itemId && c.seatNumber === seatNumber);
    if (existing) {
        existing.quantity++;
    } else {
        waiterCart.push({
            menuItem: item,
            quantity: 1,
            seatNumber: seatNumber
        });
    }
    renderWaiterCart();
}

function renderWaiterCart() {
    const list = document.getElementById("waiter-cart-items-list");
    if (!list) return;
    list.innerHTML = "";
    
    if (waiterCart.length === 0) {
        list.innerHTML = `<p class="empty-message">Cart is empty.</p>`;
        document.getElementById("waiter-cart-total").innerText = "₹0.00";
        return;
    }
    
    let total = 0;
    waiterCart.forEach((c, idx) => {
        const itemTotal = c.menuItem.chargeable ? (c.menuItem.price * c.quantity) : 0;
        total += itemTotal;
        
        const seatLabel = c.seatNumber > 0 ? `(Seat ${c.seatNumber})` : `(Table)`;
        
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.gap = "5px";
        div.style.padding = "8px";
        div.style.borderRadius = "6px";
        div.style.background = "rgba(255, 255, 255, 0.03)";
        div.style.border = "1px solid rgba(255, 255, 255, 0.05)";
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; color:var(--color-text-main);">${c.menuItem.name} <small class="text-primary">${seatLabel}</small></span>
                <span style="font-size:13px; font-weight:700; color:var(--color-primary);">${c.menuItem.chargeable ? '₹' + itemTotal.toFixed(2) : 'FREE'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <button type="button" class="cart-qty-btn" onclick="changeWaiterCartQty(${idx}, -1)" style="width:24px; height:24px; font-size:10px;"><i class="fa-solid fa-minus"></i></button>
                    <span style="font-size:13px; font-weight:700;">${c.quantity}</span>
                    <button type="button" class="cart-qty-btn" onclick="changeWaiterCartQty(${idx}, 1)" style="width:24px; height:24px; font-size:10px;"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeWaiterCartItem(${idx})" style="padding: 2px 6px; font-size: 11px;"><i class="fa-solid fa-trash"></i> Remove</button>
            </div>
        `;
        list.appendChild(div);
    });
    
    document.getElementById("waiter-cart-total").innerText = `₹${total.toFixed(2)}`;
}

function changeWaiterCartQty(idx, change) {
    if (waiterCart[idx]) {
        waiterCart[idx].quantity += change;
        if (waiterCart[idx].quantity <= 0) {
            waiterCart.splice(idx, 1);
        }
        renderWaiterCart();
    }
}

function removeWaiterCartItem(idx) {
    waiterCart.splice(idx, 1);
    renderWaiterCart();
}

function submitWaiterAssistedOrder() {
    if (waiterCart.length === 0) {
        alert("Your cart is empty. Please add some dishes first.");
        return;
    }
    const table = tableList.find(t => t.tableNumber === inspectedTableNum);
    if (!table) return;
    if (!table.currentCustomer) {
        alert("No guest is currently assigned to this table. Please seat a guest first.");
        return;
    }
    
    const isPriority = document.getElementById("waiter-order-priority").checked;
    const specialInstructions = document.getElementById("waiter-order-instructions").value;
    
    const requestItems = waiterCart.map(c => {
        return {
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            specialInstructions: specialInstructions,
            seatNumber: c.seatNumber > 0 ? c.seatNumber : null,
            customerName: table.currentCustomer.name
        };
    });
    
    apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            tableId: table.id,
            customerId: table.currentCustomer.id,
            isPriority: isPriority,
            items: requestItems
        })
    }).then(order => {
        alert("Order placed successfully on behalf of guest!");
        document.getElementById("waiter-order-modal").classList.add("hidden");
        waiterCart = [];
        inspectTableDetails(inspectedTableNum);
        refreshKitchenQueues();
    }).catch(err => {
        alert("Assisted order placement failed: " + err.message);
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
                
                let entryTimeStr = "";
                if (member && member.entryTime) {
                    const d = new Date(member.entryTime);
                    const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    entryTimeStr = `<span class="seat-entry-time" style="font-size: 11px; color: var(--color-primary); margin-left: 8px;"><i class="fa-solid fa-clock"></i> ${formattedTime}</span>`;
                }
                
                row.innerHTML = `
                    <span class="seat-label-num">Seat ${seat}</span>
                    <span class="seat-guest-name">${guestNameStr}${entryTimeStr}</span>
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
            const cat = item.menuItem.category;
            if ((cat === 'SABJI' || cat === 'SOUP' || cat === 'STARTER' || cat === 'RICE' || cat === 'COMBO') && item.status !== 'READY') {
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
                counts[rName] = (counts[rName] || 0) + item.quantity;
                
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
    
    document.getElementById("roti-val-tandoori").innerText = (counts["Plain Tandoori Roti"] || 0) + (counts["Butter Tandoori Roti"] || 0) + (counts["Tandoori Roti"] || 0) + (counts["Butter Roti"] || 0);
    document.getElementById("roti-val-butter").innerText = (counts["Plain Chapati"] || 0) + (counts["Butter Chapati"] || 0) + (counts["Plain Chapati Paratha"] || 0) + (counts["Butter Chapati Paratha"] || 0);
    document.getElementById("roti-val-naan").innerText = (counts["Butter Naan"] || 0) + (counts["Plain Naan"] || 0) + (counts["Butter Garlic Naan"] || 0) + (counts["Cheese Naan"] || 0) + (counts["Cheese Garlic Naan"] || 0) + (counts["Cheese Butter Naan"] || 0) + (counts["Naan"] || 0);
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
}

function simulateManagerReservation() {
    const name = document.getElementById("sim-book-name").value;
    const mobile = document.getElementById("sim-book-mobile").value;
    const table = document.getElementById("sim-book-table").value;
    const timeVal = document.getElementById("sim-book-time").value;
    const time = timeVal ? timeVal.replace('T', ' ') : "";
    
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
    loadStaffMembers();
}

function loadStaffMembers() {
    const listBody = document.getElementById("owner-staff-list");
    if (!listBody) return;
    
    listBody.innerHTML = "<tr><td colspan='4' class='text-center'>Loading staff...</td></tr>";
    
    fetch('/api/staff')
        .then(res => res.json())
        .then(staffList => {
            listBody.innerHTML = "";
            staffList.forEach(s => {
                const tr = document.createElement("tr");
                const roleClean = s.role.replace(/_/g, " ").toLowerCase();
                const roleFormatted = roleClean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                let loginTimeStr = "Never";
                if (s.lastLoginTime) {
                    const d = new Date(s.lastLoginTime);
                    loginTimeStr = d.toLocaleString();
                }
                
                tr.innerHTML = `
                    <td><strong>${s.name}</strong></td>
                    <td><span class="badge badge-accent">${roleFormatted}</span></td>
                    <td><code>${s.mobileNumber}</code></td>
                    <td><span class="text-cyan">${loginTimeStr}</span></td>
                `;
                listBody.appendChild(tr);
            });
            
            if (staffList.length === 0) {
                listBody.innerHTML = "<tr><td colspan='4' class='empty-message'>No registered staff members.</td></tr>";
            }
        }).catch(err => {
            console.error("Failed to load staff list", err);
            listBody.innerHTML = "<tr><td colspan='4' class='empty-message text-rose'>Failed to load staff list.</td></tr>";
        });
}

function registerNewStaff() {
    const name = document.getElementById("staff-reg-name").value.trim();
    const mobile = document.getElementById("staff-reg-mobile").value.trim();
    const password = document.getElementById("staff-reg-password").value.trim();
    const role = document.getElementById("staff-reg-role").value;

    fetch('/api/staff/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            mobileNumber: mobile,
            password: password,
            role: role
        })
    }).then(res => {
        if (res.ok) {
            alert("New staff member registered successfully!");
            document.getElementById("owner-add-staff-form").reset();
            loadStaffMembers();
        } else {
            return res.text().then(msg => { throw new Error(msg); });
        }
    }).catch(err => {
        alert("Registration failed: " + err.message);
    });
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

function resetDatabase() {
    if (!confirm("Are you sure you want to completely reset the system? This will delete all orders, customer accounts, and clear all seated guests.")) {
        return;
    }
    
    apiRequest('/api/admin/reset', {
        method: 'POST'
    }).then(res => {
        alert(res.message || "Database successfully reset!");
        location.reload();
    }).catch(err => {
        alert("Failed to reset database: " + err.message);
    });
}

