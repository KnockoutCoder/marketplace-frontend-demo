// API Base URL
const API_BASE = 'https://kc-mart-api.onrender.com';

// Current state
let currentRole = '';
let currentUserId = null;
let users = {
    buyer: null, // Currently logged in buyer (for backward compatibility)
    buyers: [], // Array to store all buyers
    admin: null,
    sellers: [] // Array to store all sellers dynamically
};

// Cart for buyers
let cart = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on dashboard page or storefront page
    const isDashboardPage = document.getElementById('sidebar') !== null;
    const isStorefrontPage = document.getElementById('storefrontView') !== null;
    
    if (isDashboardPage) {
        // Dashboard page initialization
        await initializeUsers();
        setupEventListeners();
        await populateRoleDropdown();
        // Don't show any section by default - wait for role selection
    } else if (isStorefrontPage) {
        // Storefront page initialization
        await initializeUsers();
        setupStorefrontEventListeners();
        initializeStorefrontProfileMenu();
        await loadStorefront();
        showStorefrontBuyerSections();
    }
});

// Initialize users (fetch from database only)
async function initializeUsers() {
    try {
        // Try to fetch existing users
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        let existingUsers = await response.json();
        
        // Ensure existingUsers is an array
        if (!Array.isArray(existingUsers)) {
            console.warn('API returned non-array response, using empty array');
            existingUsers = [];
        }
        
        // Find users from database only (no auto-creation)
        let buyer = existingUsers.find(u => u.role === 'buyer');
        let admin = existingUsers.find(u => u.role === 'admin');

        users.buyer = buyer; // Keep for backward compatibility
        users.admin = admin;
        
        // Get all buyers from database
        const allBuyers = existingUsers.filter(u => u.role === 'buyer');
        users.buyers = allBuyers;
        
        // Get all sellers from database
        const allSellers = existingUsers.filter(u => u.role === 'seller');
        users.sellers = allSellers;
    } catch (error) {
        console.error('Error initializing users:', error);
        alert('Failed to initialize users. Make sure the API is running.');
    }
}

// Create a user
async function createUser(name, email, role) {
    const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role })
    });
    if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('hide');
        });
    }

    // Sidebar menu items
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');
    allSideMenu.forEach(item => {
        const li = item.parentElement;
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = li.getAttribute('data-section');
            if (sectionId) {
                // Remove active from all menu items
                allSideMenu.forEach(i => {
                    i.parentElement.classList.remove('active');
                });
                // Add active to clicked item
                li.classList.add('active');
                // Show the corresponding section
                showSection(sectionId);
                
                // Load appropriate data based on section and role
                if (sectionId === 'sellerSection' && currentRole.startsWith('seller_')) {
                    // Note: Buyer section removed - buyers use storefront
                    // Load seller-specific data
                    loadSellerProducts();
                    // Show products section by default
                    const productsSection = document.getElementById('seller-products');
                    const ordersSection = document.getElementById('seller-orders');
                    const createSection = document.getElementById('seller-create');
                    if (productsSection) productsSection.classList.add('active');
                    if (ordersSection) ordersSection.classList.remove('active');
                    if (createSection) createSection.classList.remove('active');
                    
                    // Set active tab button
                    const productsTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-products"]');
                    const ordersTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-orders"]');
                    const createTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-create"]');
                    if (productsTabBtn) productsTabBtn.classList.add('active');
                    if (ordersTabBtn) ordersTabBtn.classList.remove('active');
                    if (createTabBtn) createTabBtn.classList.remove('active');
                } else if (sectionId === 'adminDashboard' && currentRole === 'admin') {
                    // Load admin dashboard data
                    loadAdminDashboard();
                } else if (sectionId === 'adminSection' && currentRole === 'admin') {
                    // Load admin tools data
                    loadAdminProducts();
                    loadAdminOrders();
                    loadAdminUsers();
                    switchAdminTab('admin-users');
                    // All Users section is shown by default in switchAdminTab
                }
            }
        });
    });

    // Dark mode toggle
    const switchMode = document.getElementById('switch-mode');
    if (switchMode) {
        if (localStorage.getItem('dark-mode') === 'enabled') {
            document.body.classList.add('dark');
            switchMode.checked = true;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark');
            switchMode.checked = true;
        }
        switchMode.addEventListener('change', function () {
            if (this.checked) {
                document.body.classList.add('dark');
                localStorage.setItem('dark-mode', 'enabled');
            } else {
                document.body.classList.remove('dark');
                localStorage.setItem('dark-mode', 'disabled');
            }
        });
    }

    // Categories menu toggle
    const categoriesLink = document.getElementById('categoriesLink');
    const categoriesMenu = document.getElementById('categoriesMenu');
    if (categoriesLink && categoriesMenu) {
        categoriesLink.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            categoriesMenu.classList.toggle('show');
            document.querySelector('.profile-menu')?.classList.remove('show');
            document.querySelector('.role-select-menu')?.classList.remove('show');
        });
    }

    // Profile menu toggle
    const profileIcon = document.getElementById('profileIcon');
    const profileMenu = document.getElementById('profileMenu');
    if (profileIcon && profileMenu) {
        profileIcon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            const willOpen = !profileMenu.classList.contains('show');
            
            if (willOpen) {
                const iconRect = profileIcon.getBoundingClientRect();
                profileMenu.style.position = 'fixed';
                profileMenu.style.top = `${iconRect.bottom + 8}px`;
                profileMenu.style.right = `${window.innerWidth - iconRect.right}px`;
            }
            
            profileMenu.classList.toggle('show');
            
            document.querySelector('.categories-menu')?.classList.remove('show');
            document.querySelector('.role-select-menu')?.classList.remove('show');
        });
    }

    // Profile modal
    const profileLink = document.getElementById('profileLink');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileModal = document.getElementById('cancelProfileModal');
    const profileModalForm = document.getElementById('profileModalForm');

    if (profileLink) {
        profileLink.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector('.profile-menu')?.classList.remove('show');
            openProfileModal();
        });
    }

    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', closeProfileModalFunc);
    }

    if (cancelProfileModal) {
        cancelProfileModal.addEventListener('click', closeProfileModalFunc);
    }

    // Close modal when clicking outside
    if (profileModal) {
        profileModal.addEventListener('click', function (e) {
            if (e.target === profileModal) {
                closeProfileModalFunc();
            }
        });
    }

    if (profileModalForm) {
        profileModalForm.addEventListener('submit', handleProfileModalSubmit);
    }
    
    // Edit Product Modal
    const editProductModal = document.getElementById('editProductModal');
    const closeEditProductModal = document.getElementById('closeEditProductModal');
    const cancelEditProductModal = document.getElementById('cancelEditProductModal');
    const editProductModalForm = document.getElementById('editProductModalForm');
    
    if (closeEditProductModal) {
        closeEditProductModal.addEventListener('click', function() {
            editProductModal.classList.remove('show');
        });
    }
    
    if (cancelEditProductModal) {
        cancelEditProductModal.addEventListener('click', function() {
            editProductModal.classList.remove('show');
        });
    }
    
    if (editProductModalForm) {
        editProductModalForm.addEventListener('submit', handleEditProductSubmit);
    }
    
    // Edit product image preview handlers
    const editProductImageFile = document.getElementById('editProductImageFile');
    const editProductImageUrl = document.getElementById('editProductImageUrl');
    const editProductImagePreview = document.getElementById('editProductImagePreview');
    const editProductImagePreviewImg = document.getElementById('editProductImagePreviewImg');
    
    if (editProductImageFile) {
        editProductImageFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    editProductImagePreviewImg.src = event.target.result;
                    editProductImagePreview.style.display = 'block';
                    // Clear URL input when file is selected
                    if (editProductImageUrl) editProductImageUrl.value = '';
                };
                reader.readAsDataURL(file);
            } else {
                editProductImagePreview.style.display = 'none';
            }
        });
    }
    
    if (editProductImageUrl) {
        editProductImageUrl.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                editProductImagePreviewImg.src = url;
                editProductImagePreview.style.display = 'block';
                // Clear file input when URL is entered
                if (editProductImageFile) editProductImageFile.value = '';
            } else {
                editProductImagePreview.style.display = 'none';
            }
        });
    }

    // Close modal when clicking outside (edit product modal)
    if (editProductModal) {
        editProductModal.addEventListener('click', function (e) {
            if (e.target === editProductModal) {
                editProductModal.classList.remove('show');
            }
        });
    }
    
    // Close modal with ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const profileModal = document.getElementById('profileModal');
            if (profileModal && profileModal.classList.contains('show')) {
                closeProfileModalFunc();
            }
            const editProductModal = document.getElementById('editProductModal');
            if (editProductModal && editProductModal.classList.contains('show')) {
                editProductModal.classList.remove('show');
            }
        }
    });

    // Seller Categories Link
    const sellerCategoriesLink = document.getElementById('sellerCategoriesLink');
    const sellerCategoriesMenu = document.getElementById('sellerCategoriesMenu');
    if (sellerCategoriesLink && sellerCategoriesMenu) {
        sellerCategoriesLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sellerCategoriesMenu.classList.toggle('show');
        });
    }

    // Admin Categories Link
    const adminCategoriesLink = document.getElementById('adminCategoriesLink');
    const adminCategoriesMenu = document.getElementById('adminCategoriesMenu');
    if (adminCategoriesLink && adminCategoriesMenu) {
        adminCategoriesLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            adminCategoriesMenu.classList.toggle('show');
        });
    }

        // Close menus when clicking outside
        window.addEventListener('click', function (e) {
            if (!e.target.closest('#sellerCategoriesLink') && !e.target.closest('#sellerCategoriesMenu')) {
                document.querySelector('#sellerCategoriesMenu')?.classList.remove('show');
            }
            if (!e.target.closest('#adminCategoriesLink') && !e.target.closest('#adminCategoriesMenu')) {
                document.querySelector('#adminCategoriesMenu')?.classList.remove('show');
            }
            if (!e.target.closest('#profileIcon') && !e.target.closest('.profile-menu')) {
                document.querySelector('.profile-menu')?.classList.remove('show');
            }
            if (!e.target.closest('#roleSelectLink') && !e.target.closest('.role-select-menu')) {
                document.querySelector('.role-select-menu')?.classList.remove('show');
            }
        });

    // Seller Search form
    const sellerSearchForm = document.getElementById('sellerSearchForm');
    const sellerProductSearchInput = document.getElementById('sellerProductSearch');
    if (sellerSearchForm && sellerProductSearchInput) {
        sellerSearchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const searchTerm = sellerProductSearchInput.value.trim();
            currentSearchTerm = searchTerm;
            loadSellerProducts();
        });
        
        // Real-time search as user types (with debounce)
        let sellerSearchTimeout;
        sellerProductSearchInput.addEventListener('input', function () {
            clearTimeout(sellerSearchTimeout);
            sellerSearchTimeout = setTimeout(() => {
                const searchTerm = this.value.trim();
                currentSearchTerm = searchTerm;
                loadSellerProducts();
            }, 300); // Wait 300ms after user stops typing
        });
        
        // Clear search when input is cleared
        sellerProductSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                this.value = '';
                currentSearchTerm = '';
                loadSellerProducts();
            }
        });
    }
    
    // Admin Search form
    const adminSearchForm = document.getElementById('adminSearchForm');
    const adminProductSearchInput = document.getElementById('adminProductSearch');
    if (adminSearchForm && adminProductSearchInput) {
        adminSearchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const searchTerm = adminProductSearchInput.value.trim();
            currentSearchTerm = searchTerm;
            loadAdminProducts();
        });
        
        // Real-time search as user types (with debounce)
        let adminSearchTimeout;
        adminProductSearchInput.addEventListener('input', function () {
            clearTimeout(adminSearchTimeout);
            adminSearchTimeout = setTimeout(() => {
                const searchTerm = this.value.trim();
                currentSearchTerm = searchTerm;
                loadAdminProducts();
            }, 300); // Wait 300ms after user stops typing
        });
        
        // Clear search when input is cleared
        adminProductSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                this.value = '';
                currentSearchTerm = '';
                loadAdminProducts();
            }
        });
    }

    // Role selector dropdown
    const roleSelectLink = document.getElementById('roleSelectLink');
    const roleSelectMenu = document.getElementById('roleSelectMenu');
    
    if (roleSelectLink && roleSelectMenu) {
        roleSelectLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const willOpen = !roleSelectMenu.classList.contains('show');
            
            if (willOpen) {
                const linkRect = roleSelectLink.getBoundingClientRect();
                roleSelectMenu.style.position = 'fixed';
                roleSelectMenu.style.top = `${linkRect.bottom + 8}px`;
                roleSelectMenu.style.right = `${window.innerWidth - linkRect.right}px`;
                roleSelectMenu.style.left = 'auto';
                void roleSelectMenu.offsetHeight; // Force reflow to apply position before showing
            } else {
                roleSelectMenu.style.top = '-9999px';
                roleSelectMenu.style.right = '-9999px';
                roleSelectMenu.style.left = 'auto';
            }
            
            roleSelectMenu.classList.toggle('show');
            
            // Close other menus when role selector opens
            document.querySelector('.categories-menu')?.classList.remove('show');
            document.querySelector('.profile-menu')?.classList.remove('show');
            document.querySelector('.notification-menu')?.classList.remove('show');
        });
    }
    
    // Product catalogue
    
    // Seller tools
    const createProductForm = document.getElementById('createProductForm');
    if (createProductForm) {
        createProductForm.addEventListener('submit', handleCreateProduct);
    }
    
    const refreshSellerProducts = document.getElementById('refreshSellerProducts');
    if (refreshSellerProducts) {
        refreshSellerProducts.addEventListener('click', loadSellerProducts);
    }
    
    // Refresh buttons for admin
    const refreshAllProducts = document.getElementById('refreshAllProducts');
    if (refreshAllProducts) {
        refreshAllProducts.addEventListener('click', loadAdminProducts);
    }
    
    // All Products button in admin toolbar
    const adminAllProductsBtn = document.getElementById('adminAllProductsBtn');
    if (adminAllProductsBtn) {
        adminAllProductsBtn.addEventListener('click', function() {
            // Show products section and hide other tabs
            const productsSection = document.getElementById('admin-products');
            const usersSection = document.getElementById('admin-users');
            const ordersSection = document.getElementById('admin-orders');
            
            if (productsSection) productsSection.classList.add('active');
            if (usersSection) usersSection.classList.remove('active');
            if (ordersSection) ordersSection.classList.remove('active');
            
            // Remove active from tab buttons
            document.querySelectorAll('#adminSection .tab-btn[data-tab]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show toolbar
            const adminToolbar = document.getElementById('adminToolbar');
            if (adminToolbar) {
                adminToolbar.style.display = 'flex';
            }
            
            // Load products
            loadAdminProducts();
            populateAdminCategories();
        });
    }
    
    // All Users button in admin users toolbar
    const adminAllUsersBtn = document.getElementById('adminAllUsersBtn');
    if (adminAllUsersBtn) {
        adminAllUsersBtn.addEventListener('click', function() {
            // Show All Users section and hide Create User section
            const usersListSection = document.getElementById('users-list');
            const usersCreateSection = document.getElementById('users-create');
            
            if (usersListSection) usersListSection.classList.add('active');
            if (usersCreateSection) usersCreateSection.classList.remove('active');
            
            // Load users
            loadAdminUsers();
        });
    }
    
    // Create User button in admin users toolbar
    const adminCreateUserBtn = document.getElementById('adminCreateUserBtn');
    if (adminCreateUserBtn) {
        adminCreateUserBtn.addEventListener('click', function() {
            // Show Create User section and hide All Users section
            const usersListSection = document.getElementById('users-list');
            const usersCreateSection = document.getElementById('users-create');
            
            if (usersListSection) usersListSection.classList.remove('active');
            if (usersCreateSection) usersCreateSection.classList.add('active');
        });
    }
    
    // All Orders button in admin orders toolbar
    const adminAllOrdersBtn = document.getElementById('adminAllOrdersBtn');
    if (adminAllOrdersBtn) {
        adminAllOrdersBtn.addEventListener('click', function() {
            // Load orders
            loadAdminOrders();
        });
    }
    
    // My Products button in toolbar
    const sellerMyProductsBtn = document.getElementById('sellerMyProductsBtn');
    if (sellerMyProductsBtn) {
        sellerMyProductsBtn.addEventListener('click', function() {
            // Show products section and hide create form
            const productsSection = document.getElementById('seller-products');
            const createSection = document.getElementById('seller-create');
            if (productsSection) productsSection.classList.add('active');
            if (createSection) createSection.classList.remove('active');
            
            // Remove active from create tab button
            const createTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-create"]');
            if (createTabBtn) createTabBtn.classList.remove('active');
            
            // Load products
            loadSellerProducts();
        });
    }
    
    // Seller tabs
    document.querySelectorAll('#sellerSection .tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchSellerTab(tabId);
        });
    });
    
    // Buyer tools (removed from dashboard - buyers use storefront)
    // These elements no longer exist in dashboard.html
        
        // Logout buttons (redirect to storefront)
        document.querySelectorAll('.logout').forEach(logoutBtn => {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        });
        
        // Back to Store button
        document.querySelectorAll('.back-to-store').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        });
        
        // Product image preview handlers
        const productImageFile = document.getElementById('productImageFile');
        const productImageUrl = document.getElementById('productImageUrl');
        const productImagePreview = document.getElementById('productImagePreview');
        const productImagePreviewImg = document.getElementById('productImagePreviewImg');
        
        if (productImageFile) {
            productImageFile.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        productImagePreviewImg.src = event.target.result;
                        productImagePreview.style.display = 'block';
                        // Clear URL input when file is selected
                        if (productImageUrl) productImageUrl.value = '';
                    };
                    reader.readAsDataURL(file);
                } else {
                    productImagePreview.style.display = 'none';
                }
            });
        }
        
        if (productImageUrl) {
            productImageUrl.addEventListener('input', function(e) {
                const url = e.target.value.trim();
                if (url) {
                    productImagePreviewImg.src = url;
                    productImagePreview.style.display = 'block';
                    // Clear file input when URL is entered
                    if (productImageFile) productImageFile.value = '';
                } else {
                    productImagePreview.style.display = 'none';
                }
            });
        }
    
    // Admin tools
    // Refresh buttons are handled above in the setupEventListeners function
    // document.getElementById('refreshAllProducts').addEventListener('click', loadAdminProducts);
    const refreshAllOrders = document.getElementById('refreshAllOrders');
    if (refreshAllOrders) {
        refreshAllOrders.addEventListener('click', loadAdminOrders);
    }
    const refreshAllUsers = document.getElementById('refreshAllUsers');
    if (refreshAllUsers) {
        refreshAllUsers.addEventListener('click', loadAdminUsers);
    }
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    
    // Admin tabs
    document.querySelectorAll('#adminSection .tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchAdminTab(tabId);
        });
    });
    
    // Admin subtabs (within User Management)
    document.querySelectorAll('#adminSection .tab-btn[data-subtab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const subtabId = this.getAttribute('data-subtab');
            switchAdminSubtab(subtabId);
        });
    });
    
    // Recent Orders filters
    const searchOrderUser = document.getElementById('searchOrderUser');
    const filterOrderStatus = document.getElementById('filterOrderStatus');
    if (searchOrderUser) {
        searchOrderUser.addEventListener('input', filterRecentOrders);
    }
    if (filterOrderStatus) {
        filterOrderStatus.addEventListener('change', filterRecentOrders);
    }
}

// Populate role dropdown dynamically
async function populateRoleDropdown() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        let allUsers = await response.json();
        
        // Ensure allUsers is an array
        if (!Array.isArray(allUsers)) {
            console.warn('API returned non-array response, using empty array');
            allUsers = [];
        }
        
        const roleSelectOptions = document.getElementById('roleSelectOptions');
        const roleSelectLink = document.getElementById('roleSelectLink');
        const roleSelectMenu = document.getElementById('roleSelectMenu');
        if (!roleSelectOptions || !roleSelectLink || !roleSelectMenu) {
            console.error('Role selector elements not found in populateRoleDropdown', {
                roleSelectOptions: !!roleSelectOptions,
                roleSelectLink: !!roleSelectLink,
                roleSelectMenu: !!roleSelectMenu
            });
            return;
        }
        
        const currentValue = roleSelectLink.dataset.value || ''; // Preserve current selection
        
        // Clear existing options
        roleSelectOptions.innerHTML = '';
        
        // Add "Select Role..." option
        const defaultOption = document.createElement('li');
        const defaultLink = document.createElement('a');
        defaultLink.href = '#';
        defaultLink.innerHTML = '<i class=\'bx bxs-grid-alt\'></i>Select Role...';
        defaultLink.dataset.value = '';
        defaultLink.addEventListener('click', function(e) {
            e.preventDefault();
            selectRole('');
            roleSelectMenu.classList.remove('show');
            roleSelectMenu.style.top = '-9999px';
            roleSelectMenu.style.right = '-9999px';
            roleSelectMenu.style.left = 'auto';
        });
        defaultOption.appendChild(defaultLink);
        roleSelectOptions.appendChild(defaultOption);
        
        // Note: Buyer role removed from dashboard - buyers use storefront instead
        
        // Add all sellers dynamically
        const sellers = allUsers.filter(u => u.role === 'seller');
        sellers.forEach(seller => {
            const option = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.innerHTML = `<i class='bx bxs-store'></i>${escapeHtml(seller.name || `Seller (${seller._id.slice(-8)})`)}`;
            link.dataset.value = `seller_${seller._id}`;
            link.addEventListener('click', function(e) {
                e.preventDefault();
                selectRole(`seller_${seller._id}`);
                roleSelectMenu.classList.remove('show');
                roleSelectMenu.style.top = '-9999px';
                roleSelectMenu.style.right = '-9999px';
                roleSelectMenu.style.left = 'auto';
            });
            option.appendChild(link);
            roleSelectOptions.appendChild(option);
        });
        
        // Add admin (get from allUsers, not users.admin which might not be set yet)
        const admin = allUsers.find(u => u.role === 'admin');
        if (admin) {
            const option = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.innerHTML = `<i class='bx bxs-user-badge'></i>${escapeHtml(admin.name || 'Admin')}`;
            link.dataset.value = 'admin';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                selectRole('admin');
                roleSelectMenu.classList.remove('show');
                roleSelectMenu.style.top = '-9999px';
                roleSelectMenu.style.right = '-9999px';
                roleSelectMenu.style.left = 'auto';
            });
            option.appendChild(link);
            roleSelectOptions.appendChild(option);
        }
        
        // Restore previous selection if it still exists
        if (currentValue) {
            selectRole(currentValue, true); // Silent update
        }
        
        // Update sellers array
        users.sellers = sellers;
    } catch (error) {
        console.error('Error populating role dropdown:', error);
    }
}

// Select a role from the custom dropdown (make it global for onclick handlers)
window.selectRole = function(roleValue, silent = false) {
    const roleSelectLink = document.getElementById('roleSelectLink');
    const roleSelectOptions = document.getElementById('roleSelectOptions');
    
    if (!roleSelectLink || !roleSelectOptions) return;
    
    // Update link text
    const selectedLink = roleSelectOptions.querySelector(`a[data-value="${roleValue}"]`);
    if (selectedLink) {
        // Get the text content (excluding icon)
        const textContent = selectedLink.textContent.trim();
        roleSelectLink.textContent = textContent;
        roleSelectLink.dataset.value = roleValue;
    } else if (roleValue === '') {
        roleSelectLink.textContent = 'View As';
        roleSelectLink.dataset.value = '';
    }
    
    // Handle role change (unless silent)
    if (!silent) {
        handleRoleChange(roleValue);
    }
};

// Setup storefront-specific event listeners
function setupStorefrontEventListeners() {
    // Storefront navigation menu toggle
    const storefrontNavToggle = document.getElementById('storefrontNavToggle');
    const storefrontNavMenu = document.getElementById('storefrontNavMenu');
    const storefrontNavClose = document.getElementById('storefrontNavClose');
    
    if (storefrontNavToggle) {
        storefrontNavToggle.addEventListener('click', () => {
            if (storefrontNavMenu) storefrontNavMenu.classList.add('show-menu');
        });
    }
    
    if (storefrontNavClose) {
        storefrontNavClose.addEventListener('click', () => {
            if (storefrontNavMenu) storefrontNavMenu.classList.remove('show-menu');
        });
    }
    
    // Storefront profile menu toggle
    const storefrontProfileIcon = document.getElementById('storefrontProfileIcon');
    const storefrontProfileMenu = document.getElementById('storefrontProfileMenu');
    if (storefrontProfileIcon && storefrontProfileMenu) {
        storefrontProfileIcon.addEventListener('click', function(e) {
            e.preventDefault();
            storefrontProfileMenu.classList.toggle('show');
        });
    }
    
    // Close profile menu when clicking outside
    // Use a flag to prevent immediate closing when programmatically opening
    let isProgrammaticallyOpening = false;
    window.addEventListener('click', function(e) {
        // Don't close if we just programmatically opened it
        if (isProgrammaticallyOpening) {
            isProgrammaticallyOpening = false;
            return;
        }
        if (storefrontProfileMenu && !e.target.closest('#storefrontProfileIcon') && !e.target.closest('.storefront-profile-menu')) {
            storefrontProfileMenu.classList.remove('show');
        }
    });
    
    // Expose flag for programmatic opening
    window.openStorefrontProfileMenu = function() {
        isProgrammaticallyOpening = true;
        if (storefrontProfileMenu) {
            storefrontProfileMenu.classList.add('show');
        }
    };
    
    // Buyer login handler
    const storefrontLoginBuyer = document.getElementById('storefrontLoginBuyer');
    if (storefrontLoginBuyer) {
        storefrontLoginBuyer.addEventListener('click', function(e) {
            e.preventDefault();
            handleBuyerLogin();
            storefrontProfileMenu.classList.remove('show');
        });
    }
    
    // Cart icon click handler
    const storefrontCartShop = document.getElementById('storefrontCartShop');
    if (storefrontCartShop) {
        storefrontCartShop.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentRole === 'buyer' && currentUserId) {
                document.getElementById('storefrontBuyerCart')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Place order button
    const storefrontPlaceOrderBtn = document.getElementById('storefrontPlaceOrderBtn');
    if (storefrontPlaceOrderBtn) {
        storefrontPlaceOrderBtn.addEventListener('click', handleStorefrontPlaceOrder);
    }
    
    // Storefront scroll up
    function scrollUp() {
        const storefrontScrollUp = document.getElementById('storefrontScrollUp');
        if (storefrontScrollUp) {
            if (window.scrollY >= 350) {
                storefrontScrollUp.classList.add('show-scroll');
            } else {
                storefrontScrollUp.classList.remove('show-scroll');
            }
        }
    }
    window.addEventListener('scroll', scrollUp);
    
    // Storefront scroll header
    function scrollHeader() {
        const header = document.getElementById('storefrontHeader');
        if (header) {
            if (window.scrollY >= 50) {
                header.classList.add('scroll-header');
            } else {
                header.classList.remove('scroll-header');
            }
        }
    }
    window.addEventListener('scroll', scrollHeader);
    
    // Storefront discount button
    const storefrontDiscountBtn = document.getElementById('storefrontDiscountBtn');
    if (storefrontDiscountBtn) {
        storefrontDiscountBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleShopNavigation();
        });
    }
    
    // Storefront Shop link in navigation
    const storefrontShopLink = document.getElementById('storefrontShopLink');
    if (storefrontShopLink) {
        storefrontShopLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleShopNavigation();
        });
    }
    
    // Storefront Categories menu toggle
    const storefrontCategoriesLink = document.getElementById('storefrontCategoriesLink');
    const storefrontCategoriesMenu = document.getElementById('storefrontCategoriesMenu');
    if (storefrontCategoriesLink && storefrontCategoriesMenu) {
        storefrontCategoriesLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            storefrontCategoriesMenu.classList.toggle('show');
            // Close profile menu if open
            if (storefrontProfileMenu) {
                storefrontProfileMenu.classList.remove('show');
            }
        });
    }
    
    // Close categories menu when clicking outside
    window.addEventListener('click', function(e) {
        if (storefrontCategoriesMenu && !e.target.closest('#storefrontCategoriesLink') && !e.target.closest('.storefront-categories-menu')) {
            storefrontCategoriesMenu.classList.remove('show');
        }
    });
    
    // Populate categories on load
    populateStorefrontCategories();
}

// Handle role change
function handleRoleChange(roleValue) {
    console.log('handleRoleChange called with value:', roleValue);
    currentRole = roleValue;
    
    // If no role selected, clear selection
    if (!currentRole || currentRole === '') {
        currentUserId = null;
        const roleSelectLink = document.getElementById('roleSelectLink');
        if (roleSelectLink) {
            roleSelectLink.textContent = 'View As';
            roleSelectLink.dataset.value = '';
        }
        // Show products catalogue by default
        showSection('productsCatalogue');
        updateSidebarMenu('productsCatalogue');
        loadProducts();
        return;
    }
    
    // Note: Buyer role is not handled in dashboard - buyers use storefront
    if (currentRole === 'buyer') {
        alert('Buyers should use the storefront. Please go to the storefront and log in as a buyer there.');
        // Reset to no role
        const roleSelectText = document.getElementById('roleSelectText');
        if (roleSelectText) {
            roleSelectText.textContent = 'Select Role...';
            roleSelectText.dataset.value = '';
        }
        currentRole = '';
        currentUserId = null;
        // No role selected - clear everything
        return;
    }
    
    // Set current user ID based on role
    if (currentRole.startsWith('seller_')) {
        // Extract seller ID from role value (format: seller_<id>)
        const sellerId = currentRole.replace('seller_', '');
        currentUserId = sellerId;
    } else if (currentRole === 'admin') {
        currentUserId = users.admin?._id;
    } else {
        currentUserId = null;
    }

    // Show/hide sections
    showHideSections();
    
    // Load role-specific data
    if (currentRole.startsWith('seller_')) {
        loadSellerProducts();
        populateSellerCategories();
        // Show products section by default (it's always visible, just make sure create is hidden)
        const productsSection = document.getElementById('seller-products');
        const createSection = document.getElementById('seller-create');
        if (productsSection) productsSection.classList.add('active');
        if (createSection) createSection.classList.remove('active');
        
        // Remove active from create tab button
        const createTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-create"]');
        if (createTabBtn) createTabBtn.classList.remove('active');
    } else if (currentRole === 'admin') {
        loadAdminDashboard();
        loadAdminProducts();
        populateAdminCategories();
        loadAdminOrders();
        loadAdminUsers();
        // Update sidebar to show admin dashboard by default
        updateSidebarMenu('adminDashboard');
        // Show admin tools with default tab
        switchAdminTab('admin-users');
        // Show All Users section by default
        const usersListSection = document.getElementById('users-list');
        const usersCreateSection = document.getElementById('users-create');
        if (usersListSection) usersListSection.classList.add('active');
        if (usersCreateSection) usersCreateSection.classList.remove('active');
    }
}

// Show a specific section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the requested section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
    }
}

// Show/hide sections based on role
function showHideSections() {
    const welcomeSection = document.getElementById('welcomeSection');
    const sellerSection = document.getElementById('sellerSection');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminSection = document.getElementById('adminSection');

    // Hide all sections first
    if (welcomeSection) welcomeSection.classList.add('hidden');
    if (sellerSection) sellerSection.classList.add('hidden');
    if (adminDashboard) adminDashboard.classList.add('hidden');
    if (adminSection) adminSection.classList.add('hidden');

    // Show appropriate section based on role
    // Note: Buyers use storefront, not dashboard
    if (currentRole.startsWith('seller_')) {
        if (sellerSection) sellerSection.classList.remove('hidden');
        // Update sidebar menu
        updateSidebarMenu('sellerSection');
        // Show products tab by default
        switchSellerTab('seller-products');
        // Load seller products and populate categories
        loadSellerProducts();
        populateSellerCategories();
    } else if (currentRole === 'admin') {
        if (adminDashboard) adminDashboard.classList.remove('hidden');
        // Update sidebar menu
        updateSidebarMenu('adminDashboard');
        // Load admin dashboard data
        loadAdminDashboard();
    } else {
        // No role selected - show welcome screen
        if (welcomeSection) welcomeSection.classList.remove('hidden');
    }
}

// Update sidebar menu active state and visibility
function updateSidebarMenu(activeSection) {
    // Update active menu item
    document.querySelectorAll('#sidebar .side-menu.top li').forEach(li => {
        li.classList.remove('active');
        if (li.getAttribute('data-section') === activeSection) {
            li.classList.add('active');
        }
    });

    // Show/hide role-specific menu items
    // Note: Buyers use storefront, not dashboard
    const sellerItems = document.querySelectorAll('.seller-only');
    const adminItems = document.querySelectorAll('.admin-only');

    if (currentRole.startsWith('seller_')) {
        sellerItems.forEach(item => item.classList.remove('hidden'));
        adminItems.forEach(item => item.classList.add('hidden'));
    } else if (currentRole === 'admin') {
        sellerItems.forEach(item => item.classList.add('hidden'));
        adminItems.forEach(item => item.classList.remove('hidden'));
    } else {
        sellerItems.forEach(item => item.classList.add('hidden'));
        adminItems.forEach(item => item.classList.add('hidden'));
    }
}

// Current selected category (stored in memory)
let currentCategory = '';
// Current search term (stored in memory)
let currentSearchTerm = '';

// Load products (for catalogue)
async function loadProducts() {
    try {
        let url = `${API_BASE}/products`;
        const queryParams = [];
        
        if (currentCategory) {
            queryParams.push(`category=${encodeURIComponent(currentCategory)}`);
        }
        
        const response = await fetch(url);
        let products = await response.json();
        
        // Apply client-side search filtering if search term exists
        if (currentSearchTerm) {
            const searchLower = currentSearchTerm.toLowerCase();
            products = products.filter(product => {
                const title = (product.title || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                return title.includes(searchLower) || 
                       description.includes(searchLower) || 
                       category.includes(searchLower);
            });
        }
        
        // Get all unique categories from all products (not filtered ones) for the menu
        const allProductsResponse = await fetch(`${API_BASE}/products`);
        const allProducts = await allProductsResponse.json();
        const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
        
        // Populate categories menu in navbar
        const categoryMenuList = document.getElementById('categoryMenuList');
        if (categoryMenuList) {
            categoryMenuList.innerHTML = '';
            
            // Add "All Categories" option
            const allLi = document.createElement('li');
            allLi.innerHTML = `<a href="#" data-category=""><i class='bx bxs-grid-alt'></i>All Categories</a>`;
            allLi.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                currentCategory = '';
                loadProducts();
                document.getElementById('categoriesMenu').classList.remove('show');
                updateCategoryLinkText('Categories');
            });
            categoryMenuList.appendChild(allLi);
            
            // Add each category
            categories.forEach(cat => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" data-category="${cat}"><i class='bx bxs-tag'></i>${cat}</a>`;
                li.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    currentCategory = cat;
                    loadProducts();
                    document.getElementById('categoriesMenu').classList.remove('show');
                    updateCategoryLinkText(cat);
                });
                categoryMenuList.appendChild(li);
            });
        }
        
        // Update search input placeholder to show active search
        const productSearchInput = document.getElementById('productSearch');
        if (productSearchInput) {
            if (currentSearchTerm) {
                productSearchInput.placeholder = `Searching: "${currentSearchTerm}"`;
            } else {
                productSearchInput.placeholder = 'Search products...';
            }
        }
        
        // Determine if we should show Add to Cart buttons (for buyers viewing products catalogue)
        const showAddToCart = currentRole === 'buyer';
        renderProducts(products, 'productsList', showAddToCart);
        
        // Show search results count if searching
        if (currentSearchTerm) {
            const productsList = document.getElementById('productsList');
            if (productsList && products.length === 0) {
                productsList.innerHTML = `<p class="empty-message">No products found matching "${currentSearchTerm}"</p>`;
            } else if (productsList && products.length > 0) {
                // Add search results indicator
                const existingIndicator = document.querySelector('.search-results-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                const indicator = document.createElement('div');
                indicator.className = 'search-results-indicator';
                indicator.style.cssText = 'margin-bottom: 15px; padding: 10px; background: var(--light-blue); border-radius: 8px; color: var(--dark);';
                indicator.innerHTML = `<i class='bx bx-search'></i> Found ${products.length} product${products.length !== 1 ? 's' : ''} matching "${currentSearchTerm}" <button onclick="clearSearch()" style="margin-left: 10px; padding: 4px 12px; background: var(--blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Clear</button>`;
                productsList.parentNode.insertBefore(indicator, productsList);
            }
        } else {
            // Remove search indicator if no search term
            const existingIndicator = document.querySelector('.search-results-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('productsList', 'Failed to load products');
    }
}

// Clear search function (global for button onclick)
window.clearSearch = function() {
    currentSearchTerm = '';
    const productSearchInput = document.getElementById('productSearch');
    if (productSearchInput) {
        productSearchInput.value = '';
        productSearchInput.placeholder = 'Search products...';
    }
    loadProducts();
};

// Update the category link text to show selected category
function updateCategoryLinkText(category) {
    const categoriesLink = document.getElementById('categoriesLink');
    if (categoriesLink) {
        if (category && category !== '') {
            categoriesLink.textContent = `Categories: ${category}`;
        } else {
            categoriesLink.textContent = 'Categories';
        }
    }
}

// Switch seller tabs
function switchSellerTab(tabId) {
    // Only switch tabs if we're in seller section
    if (!currentRole.startsWith('seller_')) return;
    
    // Hide all tab contents in seller section
    document.querySelectorAll('#sellerSection .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all tab buttons in seller section
    document.querySelectorAll('#sellerSection .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate corresponding tab button
    const selectedBtn = document.querySelector(`#sellerSection .tab-btn[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load data based on selected tab
    if (tabId === 'seller-products') {
        loadSellerProducts();
    } else if (tabId === 'seller-orders') {
        loadSellerOrders();
    }
}

// Load seller products
async function loadSellerProducts() {
    if (!currentUserId) return;

    try {
        let url = `${API_BASE}/products?sellerId=${currentUserId}`;
        if (currentCategory) {
            url += `&category=${encodeURIComponent(currentCategory)}`;
        }
        const response = await fetch(url);
        let products = await response.json();
        
        // Apply client-side search filtering if search term exists
        if (currentSearchTerm) {
            const searchLower = currentSearchTerm.toLowerCase();
            products = products.filter(product => {
                const title = (product.title || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                return title.includes(searchLower) || 
                       description.includes(searchLower) || 
                       category.includes(searchLower);
            });
        }
        
        renderProducts(products, 'sellerProductsList', false);
    } catch (error) {
        console.error('Error loading seller products:', error);
        showError('sellerProductsList', 'Failed to load your products');
    }
}

// Load admin products
async function loadAdminProducts() {
    try {
        let url = `${API_BASE}/products`;
        if (currentCategory) {
            url += `?category=${encodeURIComponent(currentCategory)}`;
        }
        const response = await fetch(url);
        let products = await response.json();
        
        // Apply client-side search filtering if search term exists
        if (currentSearchTerm) {
            const searchLower = currentSearchTerm.toLowerCase();
            products = products.filter(product => {
                const title = (product.title || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                return title.includes(searchLower) || 
                       description.includes(searchLower) || 
                       category.includes(searchLower);
            });
        }
        
        renderProducts(products, 'adminProductsList', false);
        // Update admin stats (use all products, not filtered)
        const allProductsResponse = await fetch(`${API_BASE}/products`);
        const allProducts = await allProductsResponse.json();
        const totalProductsEl = document.getElementById('totalProducts');
        if (totalProductsEl) {
            totalProductsEl.textContent = allProducts.length;
        }
    } catch (error) {
        console.error('Error loading admin products:', error);
        showError('adminProductsList', 'Failed to load products');
    }
}

// Load seller orders (only orders containing seller's products)
async function loadSellerOrders() {
    if (!currentUserId) {
        return;
    }

    try {
        // Fetch all orders
        const response = await fetch(`${API_BASE}/orders`);
        const allOrders = await response.json();
        
        // Filter orders to only include those with seller's products
        const sellerOrders = allOrders
            .map(order => {
                // Filter items to only include products from this seller
                const sellerItems = order.items.filter(item => {
                    if (!item.productId || !item.productId.sellerId) return false;
                    
                    // Handle both populated (object with _id) and unpopulated (string) sellerId
                    const sellerId = item.productId.sellerId;
                    const productSellerId = sellerId?._id || sellerId;
                    
                    if (!productSellerId) return false;
                    
                    // Convert to string for comparison (handles ObjectId and string IDs)
                    const currentSellerIdStr = String(currentUserId);
                    const productSellerIdStr = String(productSellerId);
                    
                    return productSellerIdStr === currentSellerIdStr;
                });
                
                // If order has items from this seller, include it
                if (sellerItems.length > 0) {
                    // Calculate seller's portion of the total
                    const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.subtotal, 0);
                    
                    return {
                        ...order,
                        sellerItems, // Only items from this seller
                        sellerSubtotal, // Seller's portion of order total
                        originalOrderTotal: order.totalAmount, // Keep track of full order total
                        sellerItemsCount: sellerItems.length,
                        totalItemsCount: order.items.length
                    };
                }
                return null;
            })
            .filter(order => order !== null); // Remove orders without seller's products
        
        // Render seller orders
        renderSellerOrders(sellerOrders);
    } catch (error) {
        console.error('Error loading seller orders:', error);
        showError('sellerOrdersList', 'Failed to load orders');
    }
}

// Render seller orders (only showing items that belong to the seller)
function renderSellerOrders(orders) {
    const container = document.getElementById('sellerOrdersList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-message">No orders found for your products</p>';
        return;
    }
    
    // Sort by date (most recent first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = orders.map(order => {
        const buyerName = order.buyerId?.name || 'Unknown Buyer';
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const status = order.status || 'pending';
        const statusClass = status === 'paid' ? 'completed' : status === 'cancelled' ? 'pending' : 'process';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        
        // Render only seller's items
        const itemsHtml = order.sellerItems.map(item => {
            const productName = item.productId?.title || 'Unknown Product';
            return `
                <div class="order-item">
                    <span>${escapeHtml(productName)}</span>
                    <span>Qty: ${item.quantity}</span>
                    <span>$${item.unitPrice.toFixed(2)} each</span>
                    <span>Subtotal: $${item.subtotal.toFixed(2)}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <h4>Order #${order._id.slice(-6)}</h4>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <p class="order-buyer">Buyer: ${escapeHtml(buyerName)}</p>
                <div class="order-items">${itemsHtml}</div>
                <div class="order-total">Your Products Total: $${order.sellerSubtotal.toFixed(2)}</div>
                ${order.sellerItemsCount < order.totalItemsCount ? 
                    `<div style="color: var(--dark-grey); font-size: 0.85em; margin-top: 5px; padding: 8px; background: var(--grey); border-radius: 5px; border-left: 3px solid var(--blue);">
                        <strong>Multi-seller order:</strong> This order contains ${order.totalItemsCount - order.sellerItemsCount} other item(s) from different sellers (Full order total: $${order.originalOrderTotal.toFixed(2)})
                    </div>` : ''
                }
                <div class="order-date">Date: ${orderDate}</div>
            </div>
        `;
    }).join('');
}

// Populate seller categories dropdown
async function populateSellerCategories() {
    try {
        if (!currentUserId) {
            return;
        }
        const response = await fetch(`${API_BASE}/products?sellerId=${currentUserId}`);
        const products = await response.json();
        
        // Get unique categories from seller's products
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        
        const categoryMenuList = document.getElementById('sellerCategoryMenuList');
        if (!categoryMenuList) {
            console.error('sellerCategoryMenuList not found');
            return;
        }
        
        categoryMenuList.innerHTML = '';
        
        // Add "All Categories" option
        const allLi = document.createElement('li');
        allLi.innerHTML = `<a href="#" data-category=""><i class='bx bxs-grid-alt'></i>All Categories</a>`;
        allLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentCategory = '';
            loadSellerProducts();
            document.getElementById('sellerCategoriesMenu').classList.remove('show');
        });
        categoryMenuList.appendChild(allLi);
        
        // Add each category
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-category="${escapeHtml(cat)}"><i class='bx bxs-package'></i>${escapeHtml(cat)}</a>`;
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                currentCategory = cat;
                loadSellerProducts();
                document.getElementById('sellerCategoriesMenu').classList.remove('show');
            });
            categoryMenuList.appendChild(li);
        });
    } catch (error) {
        console.error('Error populating seller categories:', error);
    }
}

// Populate admin categories dropdown
async function populateAdminCategories() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        
        // Get unique categories from all products
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        
        const categoryMenuList = document.getElementById('adminCategoryMenuList');
        if (!categoryMenuList) {
            console.error('adminCategoryMenuList not found');
            return;
        }
        
        categoryMenuList.innerHTML = '';
        
        // Add "All Categories" option
        const allLi = document.createElement('li');
        allLi.innerHTML = `<a href="#" data-category=""><i class='bx bxs-grid-alt'></i>All Categories</a>`;
        allLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentCategory = '';
            loadAdminProducts();
            document.getElementById('adminCategoriesMenu').classList.remove('show');
        });
        categoryMenuList.appendChild(allLi);
        
        // Add each category
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-category="${escapeHtml(cat)}"><i class='bx bxs-package'></i>${escapeHtml(cat)}</a>`;
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                currentCategory = cat;
                loadAdminProducts();
                document.getElementById('adminCategoriesMenu').classList.remove('show');
            });
            categoryMenuList.appendChild(li);
        });
    } catch (error) {
        console.error('Error populating admin categories:', error);
    }
}

// Render products
function renderProducts(products, containerId, showAddToCart = false) {
    const container = document.getElementById(containerId);
    
    if (products.length === 0) {
        container.innerHTML = '<p class="empty-message">No products found</p>';
        return;
    }

    container.innerHTML = products.map(product => {
        const sellerName = product.sellerId?.name || 'Unknown Seller';
        // Check if product belongs to current seller (handle both object and string sellerId)
        const productSellerId = product.sellerId?._id || product.sellerId;
        const isMyProduct = currentRole.startsWith('seller_') && 
                           currentUserId && 
                           productSellerId === currentUserId;
        
        const productImage = product.image || '';
        const imageHtml = productImage 
            ? `<div class="product-image-container"><img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.title)}" class="product-image" onerror="this.style.display='none'"></div>`
            : `<div class="product-image-placeholder"><i class='bx bxs-package' style="font-size: 3rem; color: var(--blue);"></i></div>`;
        
        return `
            <div class="product-card">
                ${imageHtml}
                <h4>${escapeHtml(product.title)}</h4>
                <p class="product-description">${escapeHtml(product.description || 'No description')}</p>
                <div class="product-info">
                    <span class="price">$${product.price.toFixed(2)}</span>
                    <span class="stock">Stock: ${product.stock}</span>
                    <span class="category">${escapeHtml(product.category)}</span>
                </div>
                <p class="seller"><strong>Seller:</strong> ${escapeHtml(sellerName)}</p>
                ${showAddToCart && currentRole === 'buyer' ? `
                    <div class="add-to-cart">
                        <input type="number" min="1" max="${product.stock}" value="1" 
                               id="qty-${product._id}" class="quantity-input"
                               onchange="validateQuantity('${product._id}', ${product.stock})">
                        <button onclick="addToCart('${product._id}', '${escapeHtml(product.title)}', ${product.price}, ${product.stock})" 
                                class="add-to-cart-btn"
                                ${product.stock === 0 ? 'disabled' : ''}>
                            <i class='bx bx-cart-add'></i>
                            <span>Add to Cart</span>
                        </button>
                    </div>
                    ${product.stock === 0 ? '<p style="color: var(--red); font-size: 0.85em; margin-top: 8px; text-align: center;">Out of Stock</p>' : ''}
                ` : ''}
                ${!showAddToCart && isMyProduct ? `
                    <div class="product-actions">
                        <button onclick="editProduct('${product._id}')">Edit</button>
                        <button onclick="deleteProduct('${product._id}')" class="delete-btn">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Validate quantity input
window.validateQuantity = function(productId, maxStock) {
    const quantityInput = document.getElementById(`qty-${productId}`);
    let quantity = parseInt(quantityInput.value) || 1;
    
    if (quantity < 1) {
        quantity = 1;
    } else if (quantity > maxStock) {
        quantity = maxStock;
        alert(`Only ${maxStock} items available in stock.`);
    }
    
    quantityInput.value = quantity;
};

// Add to cart (global function for onclick)
window.addToCart = function(productId, title, price, maxStock) {
    const quantityInput = document.getElementById(`qty-${productId}`);
    let quantity = parseInt(quantityInput.value) || 1;
    
    // Validate quantity
    if (quantity < 1) {
        quantity = 1;
    } else if (quantity > maxStock) {
        quantity = maxStock;
        alert(`Only ${maxStock} items available in stock.`);
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > maxStock) {
            alert(`Cannot add more. You already have ${existingItem.quantity} in cart, and only ${maxStock} available in stock.`);
            return;
        }
        existingItem.quantity = newQuantity;
    } else {
        cart.push({ productId, title, price, quantity });
    }
    
    updateCart();
    quantityInput.value = 1;
    
    // Show success feedback
    const btn = quantityInput.nextElementSibling;
    if (btn) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bx bx-check"></i><span>Added!</span>';
        btn.style.background = '#2ecc71';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 1500);
    }
};

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const cartBadge = document.getElementById('cartBadge');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-message">Your cart is empty. Add products from the catalogue!</p>';
        cartTotal.textContent = 'Total: $0.00';
        placeOrderBtn.disabled = true;
        if (cartBadge) {
            cartBadge.style.display = 'none';
        }
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    placeOrderBtn.disabled = false;

    // Update cart badge
    if (cartBadge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = totalItems;
        cartBadge.style.display = 'inline-block';
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <span>${escapeHtml(item.title)}</span>
            <span>Qty: ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
            <button onclick="removeFromCart(${index})">Remove</button>
        </div>
    `).join('');
}

// Remove from cart (global function)
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCart();
};

// Place order
async function handlePlaceOrder() {
    if (!currentUserId) {
        alert('Error: Buyer ID not set. Please select Buyer role again.');
        console.error('currentUserId is null:', currentUserId);
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty. Add products before placing an order.');
        return;
    }

    try {
        const items = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));

        const requestBody = {
            buyerId: currentUserId,
            items
        };

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Order API error:', responseData);
            throw new Error(responseData.message || `Failed to place order (${response.status})`);
        }

        alert(`Order placed successfully! Order ID: ${responseData._id.slice(-6)}`);
        
        // Clear cart
        cart = [];
        updateCart();
        loadBuyerOrders();
    } catch (error) {
        console.error('Error placing order:', error);
        console.error('Error details:', {
            currentUserId,
            cart,
            errorMessage: error.message
        });
        alert('Failed to place order: ' + error.message);
    }
}

// Switch buyer tabs
function switchBuyerTab(tabId) {
    // Only switch tabs if we're in buyer section
    if (currentRole !== 'buyer') return;
    
    // Hide all tab contents in buyer section
    document.querySelectorAll('#buyerSection .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all tab buttons in buyer section
    document.querySelectorAll('#buyerSection .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate corresponding tab button
    const selectedBtn = document.querySelector(`#buyerSection .tab-btn[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Open profile modal
async function openProfileModal() {
    if (!currentUserId) {
        alert('Please select a role first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${currentUserId}`);
        const user = await response.json();
        
        const profileInfo = document.getElementById('profileModalInfo');
        if (profileInfo) {
            const roleBadge = user.role === 'admin' ? 'admin-badge' : 
                            user.role === 'seller' ? 'seller-badge' : 'buyer-badge';
            
            profileInfo.innerHTML = `
                <div class="profile-display">
                    <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(user.email || 'Not provided')}</p>
                    <p><strong>Role:</strong> <span class="role-badge ${roleBadge}">${escapeHtml(user.role)}</span></p>
                    <p><strong>Member Since:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
            `;
            
            // Populate form
            document.getElementById('modalUserName').value = user.name;
            if (user.email) {
                document.getElementById('modalUserEmail').value = user.email;
            } else {
                document.getElementById('modalUserEmail').value = '';
            }
        }
        
        // Show modal
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            profileModal.classList.add('show');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile. Please try again.');
    }
}

// Close profile modal
function closeProfileModalFunc() {
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.classList.remove('show');
    }
}

// Handle profile modal form submission
async function handleProfileModalSubmit(e) {
    e.preventDefault();
    if (!currentUserId) return;

    try {
        const updateData = {
            name: document.getElementById('modalUserName').value,
        };
        
        const email = document.getElementById('modalUserEmail').value.trim();
        if (email) {
            updateData.email = email;
        }

        const response = await fetch(`${API_BASE}/users/${currentUserId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        alert('Profile updated successfully!');
        
        // Update the users object
        if (currentRole === 'buyer') {
            users.buyer = updatedUser;
            // Also update in buyers array
            const buyerIndex = users.buyers.findIndex(b => b._id === updatedUser._id);
            if (buyerIndex !== -1) {
                users.buyers[buyerIndex] = updatedUser;
            }
        } else if (currentRole.startsWith('seller_')) {
            const sellerIndex = users.sellers.findIndex(s => s._id === updatedUser._id);
            if (sellerIndex !== -1) {
                users.sellers[sellerIndex] = updatedUser;
            }
        } else if (currentRole === 'admin') {
            users.admin = updatedUser;
        }
        
        // Reload profile display in modal
        await openProfileModal();
        
        // Update dropdown if seller name changed
        if (currentRole.startsWith('seller_')) {
            await populateRoleDropdown();
            // Restore selection (will be handled by populateRoleDropdown)
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
    }
}


// Load buyer orders
async function loadBuyerOrders() {
    if (!currentUserId) return;

    try {
        const response = await fetch(`${API_BASE}/orders?buyerId=${currentUserId}`);
        const orders = await response.json();
        renderOrders(orders, 'ordersList');
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('ordersList', 'Failed to load orders');
    }
}

// Switch admin tabs
function switchAdminTab(tabId) {
    // Show/hide admin toolbar based on active tab
    const adminToolbar = document.getElementById('adminToolbar');
    if (adminToolbar) {
        if (tabId === 'admin-products') {
            adminToolbar.style.display = 'flex';
        } else {
            adminToolbar.style.display = 'none';
        }
    }
    
    // Show/hide admin users toolbar based on active tab
    const adminUsersToolbar = document.getElementById('adminUsersToolbar');
    if (adminUsersToolbar) {
        if (tabId === 'admin-users') {
            adminUsersToolbar.style.display = 'flex';
        } else {
            adminUsersToolbar.style.display = 'none';
        }
    }
    
    // Show/hide admin orders toolbar based on active tab
    const adminOrdersToolbar = document.getElementById('adminOrdersToolbar');
    if (adminOrdersToolbar) {
        if (tabId === 'admin-orders') {
            adminOrdersToolbar.style.display = 'flex';
        } else {
            adminOrdersToolbar.style.display = 'none';
        }
    }
    
    // Only switch tabs if we're in admin section
    if (currentRole !== 'admin') return;
    
    // Hide all tab contents in admin section
    document.querySelectorAll('#adminSection .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all tab buttons in admin section
    document.querySelectorAll('#adminSection .tab-btn[data-tab]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate corresponding tab button
    const selectedBtn = document.querySelector(`#adminSection .tab-btn[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load data for the selected tab
    if (tabId === 'admin-users') {
        // Show All Users by default
        const usersListSection = document.getElementById('users-list');
        const usersCreateSection = document.getElementById('users-create');
        if (usersListSection) usersListSection.classList.add('active');
        if (usersCreateSection) usersCreateSection.classList.remove('active');
        loadAdminUsers();
    } else if (tabId === 'admin-products') {
        loadAdminProducts();
        populateAdminCategories();
    } else if (tabId === 'admin-orders') {
        loadAdminOrders();
    }
}

// Switch admin subtabs (within User Management tab)
function switchAdminSubtab(subtabId) {
    // Only switch subtabs if we're in admin section and User Management tab
    if (currentRole !== 'admin') return;
    
    // Hide all subtab contents
    document.querySelectorAll('#adminSection .subtab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all subtab buttons
    document.querySelectorAll('#adminSection .tab-btn[data-subtab]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected subtab content
    const selectedSubtab = document.getElementById(subtabId);
    if (selectedSubtab) {
        selectedSubtab.classList.add('active');
    }
    
    // Activate corresponding subtab button
    const selectedBtn = document.querySelector(`#adminSection .tab-btn[data-subtab="${subtabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Load admin dashboard (stats)
async function loadAdminDashboard() {
    try {
        // Load all data to get stats
        const [productsRes, usersRes, ordersRes] = await Promise.all([
            fetch(`${API_BASE}/products`),
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/orders`)
        ]);
        
        const products = await productsRes.json();
        const users = await usersRes.json();
        const orders = await ordersRes.json();
        
        // Update stats
        const totalProductsEl = document.getElementById('totalProducts');
        const totalUsersEl = document.getElementById('totalUsers');
        const totalOrdersEl = document.getElementById('totalOrders');
        
        if (totalProductsEl) totalProductsEl.textContent = products.length;
        if (totalUsersEl) totalUsersEl.textContent = users.length;
        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
        
        // Populate Recent Orders
        populateRecentOrders(orders);
        
        // Populate Recently Added Users
        populateRecentUsers(users);
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

// Populate Recent Orders table
function populateRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTableBody');
    if (!tbody) return;
    
    // Sort orders by date (most recent first) and take top 5
    const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--dark-grey);">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentOrders.map(order => {
        const buyerName = order.buyerId?.name || 'Unknown Buyer';
        const buyerEmail = order.buyerId?.email || '';
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        });
        const status = order.status || 'pending';
        const statusClass = status === 'paid' ? 'completed' : status === 'cancelled' ? 'pending' : 'process';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        
        // Get first letter of buyer name for avatar
        const avatarLetter = buyerName.charAt(0).toUpperCase();
        
        return `
            <tr>
                <td>
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--blue); color: var(--light); display: flex; align-items: center; justify-content: center; font-weight: 600;">
                        ${escapeHtml(avatarLetter)}
                    </div>
                </td>
                <td>
                    <span>${escapeHtml(buyerName)}</span>
                    <p style="color: var(--dark-grey); font-size: 12px; margin: 0;">${escapeHtml(buyerEmail)}</p>
                </td>
                <td>${orderDate}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// Populate Recently Added Users list
function populateRecentUsers(users) {
    const userList = document.getElementById('recentUsersList');
    if (!userList) return;
    
    // Sort users by date (most recent first) and take top 5
    const recentUsers = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentUsers.length === 0) {
        userList.innerHTML = '<li style="text-align: center; padding: 20px; color: var(--dark-grey);">No users found</li>';
        return;
    }
    
    userList.innerHTML = recentUsers.map(user => {
        const role = user.role || 'buyer';
        const roleClass = role === 'buyer' ? 'completed' : role === 'seller' ? 'pending' : 'not-completed';
        const userDate = new Date(user.createdAt).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        });
        
        return `
            <li class="${roleClass}" data-role="${role}">
                <p>${escapeHtml(user.name)} - ${escapeHtml(user.email || 'No email')}</p>
                <span style="font-size: 12px; color: var(--dark-grey);">${userDate}</span>
            </li>
        `;
    }).join('');
}

// Filter Recent Orders
function filterRecentOrders() {
    const searchText = document.getElementById('searchOrderUser')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterOrderStatus')?.value || 'all';
    
    const rows = document.querySelectorAll('#recentOrdersTableBody tr');
    rows.forEach(row => {
        const userCell = row.querySelector('td:nth-child(2)');
        const statusCell = row.querySelector('td:nth-child(4) .status');
        
        if (!userCell || !statusCell) return;
        
        const userName = userCell.querySelector('span')?.textContent.toLowerCase() || '';
        const userEmail = userCell.querySelector('p')?.textContent.toLowerCase() || '';
        const statusText = statusCell.textContent.toLowerCase();
        
        // Map status text to filter value
        let statusValue = statusText;
        if (statusText === 'paid') statusValue = 'paid';
        else if (statusText === 'pending') statusValue = 'pending';
        else if (statusText === 'cancelled') statusValue = 'cancelled';
        
        const matchesSearch = userName.includes(searchText) || userEmail.includes(searchText);
        const matchesStatus = statusFilter === 'all' || statusValue === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter Recent Users
window.filterRecentUsers = function(role) {
    const userItems = document.querySelectorAll('#recentUsersList li');
    userItems.forEach(item => {
        const itemRole = item.getAttribute('data-role');
        if (role === 'all' || itemRole === role) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Load admin orders
async function loadAdminOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`);
        const orders = await response.json();
        renderOrders(orders, 'adminOrdersList');
        // Update admin stats
        const totalOrdersEl = document.getElementById('totalOrders');
        if (totalOrdersEl) {
            totalOrdersEl.textContent = orders.length;
        }
    } catch (error) {
        console.error('Error loading admin orders:', error);
        showError('adminOrdersList', 'Failed to load orders');
    }
}

// Load admin users
async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const allUsers = await response.json();
        renderUsers(allUsers, 'adminUsersList');
        
        // Update admin stats
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) {
            totalUsersEl.textContent = allUsers.length;
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
        showError('adminUsersList', 'Failed to load users');
    }
}

// Render users (for admin view)
function renderUsers(usersList, containerId) {
    const container = document.getElementById(containerId);
    
    if (usersList.length === 0) {
        container.innerHTML = '<p class="empty-message">No users found</p>';
        return;
    }

    // Group users by role
    const buyers = usersList.filter(u => u.role === 'buyer');
    const sellers = usersList.filter(u => u.role === 'seller');
    const admins = usersList.filter(u => u.role === 'admin');

    container.innerHTML = `
        <div class="users-summary">
            <div class="user-count"><strong>Total:</strong> ${usersList.length} users</div>
            <div class="user-count"><strong>Buyers:</strong> ${buyers.length}</div>
            <div class="user-count"><strong>Sellers:</strong> ${sellers.length}</div>
            <div class="user-count"><strong>Admins:</strong> ${admins.length}</div>
        </div>
        ${usersList.map(user => {
            const roleBadge = user.role === 'admin' ? 'admin-badge' : 
                            user.role === 'seller' ? 'seller-badge' : 'buyer-badge';
            return `
                <div class="user-card">
                    <div class="user-header">
                        <h4>${escapeHtml(user.name)}</h4>
                        <span class="role-badge ${roleBadge}">${escapeHtml(user.role)}</span>
                    </div>
                    <p class="user-email">${escapeHtml(user.email || 'No email')}</p>
                    <p class="user-id">ID: ${user._id.slice(-8)}</p>
                    <p class="user-date">Created: ${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
            `;
        }).join('')}
    `;
}

// Create user (admin function)
async function handleCreateUser(e) {
    e.preventDefault();

    try {
        const userData = {
            name: document.getElementById('newUserName').value,
            role: document.getElementById('newUserRole').value,
        };
        
        const email = document.getElementById('newUserEmail').value.trim();
        if (email) {
            userData.email = email;
        }

        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create user');
        }

        const newUser = await response.json();
        alert(`User created successfully! ${newUser.name} (${newUser.role})`);
        
        // Reset form
        e.target.reset();
        
        // If a new seller was created, update the role dropdown
        if (newUser.role === 'seller') {
            await populateRoleDropdown();
        }
        
        // Reload users list and dashboard stats
        loadAdminUsers();
        loadAdminDashboard();
        
        // Switch to All Users subtab to see the new user
        // Show All Users section by default
        const usersListSection = document.getElementById('users-list');
        const usersCreateSection = document.getElementById('users-create');
        if (usersListSection) usersListSection.classList.add('active');
        if (usersCreateSection) usersCreateSection.classList.remove('active');
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user: ' + error.message);
    }
}

// Render orders
function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-message">No orders found</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const buyerName = order.buyerId?.name || 'Unknown Buyer';
        const itemsHtml = order.items.map(item => {
            const productName = item.productId?.title || 'Unknown Product';
            return `
                <div class="order-item">
                    <span>${escapeHtml(productName)}</span>
                    <span>Qty: ${item.quantity}</span>
                    <span>$${item.unitPrice.toFixed(2)} each</span>
                    <span>Subtotal: $${item.subtotal.toFixed(2)}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="order-card">
                <div class="order-header">
                    <h4>Order #${order._id.slice(-6)}</h4>
                    <span class="order-status">${order.status}</span>
                </div>
                <p class="order-buyer">Buyer: ${escapeHtml(buyerName)}</p>
                <div class="order-items">${itemsHtml}</div>
                <div class="order-total">Total: $${order.totalAmount.toFixed(2)}</div>
                <div class="order-date">Date: ${new Date(order.createdAt).toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

// Create product
async function handleCreateProduct(e) {
    e.preventDefault();
    if (!currentUserId) return;

    try {
        // Get image from file or URL
        let imageData = '';
        const productImageFile = document.getElementById('productImageFile');
        const productImageUrl = document.getElementById('productImageUrl');
        
        if (productImageFile && productImageFile.files && productImageFile.files[0]) {
            // Convert file to base64
            const file = productImageFile.files[0];
            imageData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else if (productImageUrl && productImageUrl.value.trim()) {
            // Use URL
            imageData = productImageUrl.value.trim();
        }
        
        const productData = {
            title: document.getElementById('productTitle').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value,
            sellerId: currentUserId
        };
        
        // Add image if provided
        if (imageData) {
            productData.image = imageData;
        }

        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create product');
        }

        const product = await response.json();
        alert('Product created successfully!');
        
        // Reset form
        e.target.reset();
        const productImagePreview = document.getElementById('productImagePreview');
        if (productImagePreview) {
            productImagePreview.style.display = 'none';
        }
        loadSellerProducts();
        
        // Switch to My Products tab to see the new product
        // Show products section after creating product
        const productsSection = document.getElementById('seller-products');
        const createSection = document.getElementById('seller-create');
        if (productsSection) productsSection.classList.add('active');
        if (createSection) createSection.classList.remove('active');
        
        // Remove active from create tab button
        const createTabBtn = document.querySelector('#sellerSection .tab-btn[data-tab="seller-create"]');
        if (createTabBtn) createTabBtn.classList.remove('active');
        loadProducts();
    } catch (error) {
        console.error('Error creating product:', error);
        alert('Failed to create product: ' + error.message);
    }
}

// Edit product (global function) - Opens edit modal
window.editProduct = async function(productId) {
    try {
        // Fetch product details
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        
        const product = await response.json();
        
        // Populate edit form
        document.getElementById('editProductTitle').value = product.title || '';
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductPrice').value = product.price || '';
        document.getElementById('editProductStock').value = product.stock || '';
        document.getElementById('editProductCategory').value = product.category || '';
        document.getElementById('editProductImageUrl').value = product.image || '';
        
        // Show image preview if exists
        const editProductImagePreview = document.getElementById('editProductImagePreview');
        const editProductImagePreviewImg = document.getElementById('editProductImagePreviewImg');
        if (product.image) {
            editProductImagePreviewImg.src = product.image;
            editProductImagePreview.style.display = 'block';
        } else {
            editProductImagePreview.style.display = 'none';
        }
        
        // Store product ID for form submission
        document.getElementById('editProductModalForm').dataset.productId = productId;
        
        // Open modal
        document.getElementById('editProductModal').classList.add('show');
    } catch (error) {
        console.error('Error loading product for edit:', error);
        alert('Failed to load product details: ' + error.message);
    }
};

// Handle edit product form submission
async function handleEditProductSubmit(e) {
    e.preventDefault();
    const productId = e.target.dataset.productId;
    
    if (!productId) {
        alert('Error: Product ID not found');
        return;
    }
    
    try {
        // Get image from file or URL
        let imageData = '';
        const editProductImageFile = document.getElementById('editProductImageFile');
        const editProductImageUrl = document.getElementById('editProductImageUrl');
        
        if (editProductImageFile && editProductImageFile.files && editProductImageFile.files[0]) {
            // Convert file to base64
            const file = editProductImageFile.files[0];
            imageData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else if (editProductImageUrl && editProductImageUrl.value.trim()) {
            // Use URL
            imageData = editProductImageUrl.value.trim();
        }
        
        const updateData = {
            title: document.getElementById('editProductTitle').value.trim(),
            description: document.getElementById('editProductDescription').value.trim(),
            price: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            category: document.getElementById('editProductCategory').value.trim()
        };
        
        // Add image if provided
        if (imageData) {
            updateData.image = imageData;
        }
        
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update product');
        }

        alert('Product updated successfully!');
        
        // Close modal
        document.getElementById('editProductModal').classList.remove('show');
        
        // Reset form
        e.target.reset();
        const editProductImagePreview = document.getElementById('editProductImagePreview');
        if (editProductImagePreview) {
            editProductImagePreview.style.display = 'none';
        }
        
        // Reload products
        loadSellerProducts();
        loadProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Failed to update product: ' + error.message);
    }
}

// Delete product (global function)
window.deleteProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete product');
        }

        alert('Product deleted successfully!');
        loadSellerProducts();
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product: ' + error.message);
    }
};

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<p class="error-message">${escapeHtml(message)}</p>`;
}

// Storefront category filter
let storefrontCurrentCategory = '';

// Load storefront
async function loadStorefront() {
    try {
        // Load products for storefront
        let url = `${API_BASE}/products`;
        if (storefrontCurrentCategory) {
            url += `?category=${encodeURIComponent(storefrontCurrentCategory)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status}`);
        }
        const products = await response.json();
        
        // Populate hero slides (use first 3 products or create default slides)
        populateHeroSlides(products);
        
        // Populate new arrivals (use first 6 products)
        populateNewArrivals(products.slice(0, 6));
        
        // Populate all products grid
        renderStorefrontProducts(products);
    } catch (error) {
        console.error('Error loading storefront:', error);
        // Show error message to user
        const productsGrid = document.getElementById('storefrontProductsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = `<p style="text-align: center; color: var(--storefront-first-color); padding: 2rem;">Failed to load products. Please refresh the page.</p>`;
        }
    }
}

// Populate storefront categories dropdown
async function populateStorefrontCategories() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        
        // Get unique categories
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        
        const categoryMenuList = document.getElementById('storefrontCategoryMenuList');
        if (!categoryMenuList) {
            console.error('storefrontCategoryMenuList not found');
            return;
        }
        
        // Add "All Categories" option
        categoryMenuList.innerHTML = `
            <li><a href="#" class="storefront-category-link" data-category="">All Categories</a></li>
            ${categories.map(category => `
                <li><a href="#" class="storefront-category-link" data-category="${escapeHtml(category)}">${escapeHtml(category)}</a></li>
            `).join('')}
        `;
        
        // Add click handlers for category links
        const categoryLinks = categoryMenuList.querySelectorAll('.storefront-category-link');
        categoryLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const category = this.getAttribute('data-category');
                storefrontCurrentCategory = category;
                
                // Update active state
                categoryLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Close menu
                const categoriesMenu = document.getElementById('storefrontCategoriesMenu');
                if (categoriesMenu) {
                    categoriesMenu.classList.remove('show');
                }
                
                // Reload products with filter
                loadStorefront();
            });
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Populate hero slides
function populateHeroSlides(products) {
    const heroSlides = document.getElementById('storefrontHeroSlides');
    if (!heroSlides) return;
    
    // Use first 3 products or create default slides
    const slides = products.slice(0, 3).map((product, index) => {
        const slideNumber = index + 1;
        return `
            <section class="swiper-slide">
                <div class="storefront-home-content grid">
                    <div class="storefront-home-group">
                        ${product.image 
                            ? `<div class="storefront-home-img-container" style="height: 420px; overflow: hidden; border-radius: 1rem; transform: translateY(-3rem);"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'height: 100%; background: linear-gradient(135deg, var(--blue), var(--light-blue)); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;\\'><i class=\\'bx bxs-package\\'></i></div>'"></div>`
                            : `<div class="storefront-home-img-placeholder" style="height: 420px; background: linear-gradient(135deg, var(--blue), var(--light-blue)); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; border-radius: 1rem;"><i class='bx bxs-package'></i></div>`
                        }
                        <div class="storefront-home-indicator"></div>
                        <div class="storefront-home-details-img">
                            <h4 class="storefront-home-details-title">${escapeHtml(product.title)}</h4>
                            <span class="storefront-home-details-subtitle">${escapeHtml(product.category)}</span>
                        </div>
                    </div>
                    <div class="storefront-home-data">
                        <h3 class="storefront-home-subtitle">#${slideNumber} TRENDING ITEM</h3>
                        <h1 class="storefront-home-title">${escapeHtml(product.title.toUpperCase())}</h1>
                        <p class="storefront-home-description">${escapeHtml(product.description || 'Discover amazing products at great prices')}</p>
                        <div class="storefront-home-buttons">
                            <button onclick="handleShopNowClick()" class="storefront-button">Shop Now</button>
                            <button onclick="openProductDetailModal('${product._id}')" class="storefront-button-link storefront-button-flex">View Details <i class="bx bx-right-arrow-alt storefront-button-icon"></i></button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }).join('');
    
    heroSlides.innerHTML = slides || `
        <section class="swiper-slide">
            <div class="storefront-home-content grid">
                <div class="storefront-home-group">
                    <div class="storefront-home-img-placeholder" style="height: 420px; background: linear-gradient(135deg, var(--blue), var(--light-blue)); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; border-radius: 1rem;">
                        <i class='bx bxs-shopping-bags'></i>
                    </div>
                </div>
                <div class="storefront-home-data">
                    <h3 class="storefront-home-subtitle">WELCOME TO</h3>
                    <h1 class="storefront-home-title">MARKETPLACE</h1>
                    <p class="storefront-home-description">Discover amazing products from multiple sellers</p>
                    <div class="storefront-home-buttons">
                        <button onclick="handleShopNowClick()" class="storefront-button">Start Shopping</button>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    // Initialize swiper if not already initialized
    if (!window.storefrontHomeSwiper) {
        window.storefrontHomeSwiper = new Swiper(".storefront-home-swiper", {
            spaceBetween: 30,
            loop: true,
            pagination: {
                el: ".storefront-home-swiper .swiper-pagination",
                clickable: true,
            },
        });
    } else {
        window.storefrontHomeSwiper.update();
    }
}

// Populate new arrivals
function populateNewArrivals(products) {
    const newArrivals = document.getElementById('storefrontNewArrivals');
    if (!newArrivals) return;
    
    newArrivals.innerHTML = products.map(product => {
        const productImage = product.image || '';
        const imageHtml = productImage 
            ? `<div class="storefront-new-img-container" style="height: 150px; overflow: hidden; border-radius: 0.5rem; margin-bottom: 1rem;"><img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'height: 100%; background: var(--grey); display: flex; align-items: center; justify-content: center;\\'><i class=\\'bx bxs-package\\' style=\\'font-size: 3rem; color: var(--blue);\\'></i></div>'"></div>`
            : `<div class="storefront-new-img-placeholder" style="height: 150px; background: var(--grey); display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-bottom: 1rem;"><i class='bx bxs-package' style="font-size: 3rem; color: var(--blue);"></i></div>`;
        
        const isBuyerLoggedIn = currentRole === 'buyer' && currentUserId;
        const cartButtonHtml = isBuyerLoggedIn && product.stock > 0
            ? `<button onclick="handleNewArrivalCartClick('${product._id}', '${escapeHtml(product.title)}', ${product.price}, ${product.stock})" class="storefront-button storefront-new-button" title="Add to Cart">
                    <i class="bx bx-cart-alt storefront-new-icon"></i>
                </button>`
            : `<button onclick="handleNewArrivalCartClick('${product._id}', '${escapeHtml(product.title)}', ${product.price}, ${product.stock})" class="storefront-button storefront-new-button" title="${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}">
                    <i class="bx bx-cart-alt storefront-new-icon"></i>
                </button>`;
        
        return `
            <div class="storefront-new-content swiper-slide">
                <div class="storefront-new-tag">New</div>
                ${imageHtml}
                <h3 class="storefront-new-title">${escapeHtml(product.title)}</h3>
                <span class="storefront-new-subtitle">${escapeHtml(product.category)}</span>
                <div class="storefront-new-prices">
                    <span class="storefront-new-price">$${product.price.toFixed(2)}</span>
                </div>
                ${cartButtonHtml}
            </div>
        `;
    }).join('');
    
    // Determine if we should use centeredSlides and loop
    // Only enable if we have more products than the max slidesPerView (3)
    const maxSlidesPerView = 3;
    const shouldCenter = products.length > maxSlidesPerView;
    const shouldLoop = products.length > maxSlidesPerView;
    
    // Initialize or reinitialize swiper
    if (window.storefrontNewSwiper) {
        // Destroy existing swiper if loop setting needs to change
        const currentLoop = window.storefrontNewSwiper.params.loop;
        if (currentLoop !== shouldLoop) {
            window.storefrontNewSwiper.destroy(true, true);
            window.storefrontNewSwiper = null;
        }
    }
    
    if (!window.storefrontNewSwiper) {
        window.storefrontNewSwiper = new Swiper(".storefront-new-swiper", {
            spaceBetween: 16,
            centeredSlides: shouldCenter,
            slidesPerView: 1,
            loop: shouldLoop,
            breakpoints: {
                576: { slidesPerView: 2 },
                776: { slidesPerView: 3 },
            }
        });
    } else {
        // Update existing swiper settings
        window.storefrontNewSwiper.params.centeredSlides = shouldCenter;
        window.storefrontNewSwiper.update();
    }
    
    // Center the swiper wrapper when there are fewer slides than maxSlidesPerView
    const swiperWrapper = document.querySelector('.storefront-new-swiper .swiper-wrapper');
    if (swiperWrapper && products.length <= maxSlidesPerView) {
        swiperWrapper.style.justifyContent = 'center';
    } else if (swiperWrapper) {
        swiperWrapper.style.justifyContent = '';
    }
}

// Handle buyer login on storefront
function handleBuyerLogin(buyerId = null) {
    // If buyerId is provided, use it; otherwise use the first buyer (for backward compatibility)
    let selectedBuyer = null;
    
    if (buyerId) {
        selectedBuyer = users.buyers.find(b => b._id === buyerId);
    } else {
        // Default to first buyer if available
        selectedBuyer = users.buyers.length > 0 ? users.buyers[0] : users.buyer;
    }
    
    if (!selectedBuyer) {
        alert('Buyer user not found. Please refresh the page.');
        return;
    }
    
    currentRole = 'buyer';
    currentUserId = selectedBuyer._id;
    users.buyer = selectedBuyer; // Update for backward compatibility
    
    // Update profile menu
    updateStorefrontProfileMenu();
    
    // Show welcome message with buyer's name
    updateStorefrontWelcomeMessage();
    
    // Reload products to show Add to Cart buttons
    loadStorefront();
    
    // Show buyer sections
    showStorefrontBuyerSections();
    
    // Update cart badge
    updateStorefrontCartBadge();
}

// Update storefront profile menu based on login status
function updateStorefrontProfileMenu() {
    const storefrontProfileMenu = document.getElementById('storefrontProfileMenu');
    if (!storefrontProfileMenu) return;
    
    if (currentRole === 'buyer' && currentUserId) {
        storefrontProfileMenu.innerHTML = `
            <ul>
                <li><a href="#" id="storefrontProfileLink">My Profile</a></li>
                <li><a href="#" id="storefrontCartLink">My Cart</a></li>
                <li><a href="#" id="storefrontOrdersLink">My Orders</a></li>
                <li><a href="#" id="storefrontLogout">Log Out</a></li>
            </ul>
        `;
        
        // Add event listeners
        const profileLink = document.getElementById('storefrontProfileLink');
        const cartLink = document.getElementById('storefrontCartLink');
        const ordersLink = document.getElementById('storefrontOrdersLink');
        const logoutLink = document.getElementById('storefrontLogout');
        
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                openStorefrontProfileModal();
                storefrontProfileMenu.classList.remove('show');
            });
        }
        
        if (cartLink) {
            cartLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('storefrontBuyerCart')?.scrollIntoView({ behavior: 'smooth' });
                storefrontProfileMenu.classList.remove('show');
            });
        }
        
        if (ordersLink) {
            ordersLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('storefrontBuyerOrders')?.scrollIntoView({ behavior: 'smooth' });
                storefrontProfileMenu.classList.remove('show');
            });
        }
        
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleStorefrontLogout();
                storefrontProfileMenu.classList.remove('show');
            });
        }
    } else {
        // Show buyer selection dropdown if there are multiple buyers, otherwise show single login
        let buyerMenuHtml = '';
        if (users.buyers.length > 1) {
            buyerMenuHtml = users.buyers.map(buyer => 
                `<li><a href="#" class="storefront-buyer-option" data-buyer-id="${buyer._id}">${escapeHtml(buyer.name || `Buyer (${buyer._id.slice(-8)})`)}</a></li>`
            ).join('');
        } else {
            buyerMenuHtml = `<li><a href="#" id="storefrontLoginBuyer">Log In as Buyer</a></li>`;
        }
        
        storefrontProfileMenu.innerHTML = `
            <ul>
                ${buyerMenuHtml}
                <li><a href="dashboard.html" id="storefrontLoginSeller">Log In as Seller</a></li>
            </ul>
        `;
        
        // Add event listeners for buyer selection
        if (users.buyers.length > 1) {
            document.querySelectorAll('.storefront-buyer-option').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const buyerId = link.dataset.buyerId;
                    handleBuyerLogin(buyerId);
                    storefrontProfileMenu.classList.remove('show');
                });
            });
        } else {
            // Single buyer login
        const loginBuyer = document.getElementById('storefrontLoginBuyer');
        if (loginBuyer) {
            loginBuyer.addEventListener('click', (e) => {
                e.preventDefault();
                handleBuyerLogin();
                storefrontProfileMenu.classList.remove('show');
            });
            }
        }
    }
}

// Show/hide buyer sections
function showStorefrontBuyerSections() {
    const cartSection = document.getElementById('storefrontBuyerCart');
    const ordersSection = document.getElementById('storefrontBuyerOrders');
    
    if (currentRole === 'buyer' && currentUserId) {
        if (cartSection) cartSection.classList.remove('hidden');
        if (ordersSection) ordersSection.classList.remove('hidden');
        updateStorefrontCart();
        updateStorefrontCartBadge(); // Update cart badge
        loadStorefrontOrders();
    } else {
        if (cartSection) cartSection.classList.add('hidden');
        if (ordersSection) ordersSection.classList.add('hidden');
        updateStorefrontCartBadge(); // Hide cart badge when logged out
    }
}

// Handle storefront logout
function handleStorefrontLogout() {
    currentRole = '';
    currentUserId = null;
    cart = [];
    updateStorefrontProfileMenu();
    updateStorefrontWelcomeMessage(); // Hide welcome message
    loadStorefront();
    showStorefrontBuyerSections();
    updateStorefrontCartBadge();
}

// Update storefront welcome message
function updateStorefrontWelcomeMessage() {
    const welcomeMessage = document.getElementById('storefrontWelcomeMessage');
    const buyerNameSpan = document.getElementById('storefrontBuyerName');
    
    if (!welcomeMessage || !buyerNameSpan) return;
    
    if (currentRole === 'buyer' && currentUserId && users.buyer) {
        // Get buyer's first name (split by space and take first part)
        const buyerName = users.buyer.name || 'Buyer';
        const firstName = buyerName.split(' ')[0];
        buyerNameSpan.textContent = firstName;
        welcomeMessage.style.display = 'block';
    } else {
        welcomeMessage.style.display = 'none';
    }
}

// Render storefront products grid
function renderStorefrontProducts(products) {
    const productsGrid = document.getElementById('storefrontProductsGrid');
    if (!productsGrid) return;
    
    const isBuyerLoggedIn = currentRole === 'buyer' && currentUserId;
    
    // Calculate how many columns would typically fit (assuming min 280px per column)
    const containerWidth = productsGrid.parentElement?.offsetWidth || window.innerWidth;
    const minColumnWidth = 280;
    const gap = 32; // 2rem = 32px
    const maxColumns = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
    
    // Center the grid when there are fewer products than would fill one row
    if (products.length > 0 && products.length < maxColumns) {
        // Set grid to show only the number of columns needed and center the grid container
        productsGrid.style.gridTemplateColumns = `repeat(${products.length}, minmax(280px, 1fr))`;
        productsGrid.style.maxWidth = `${(products.length * minColumnWidth) + ((products.length - 1) * gap)}px`;
        productsGrid.style.margin = '2rem auto';
    } else {
        // Reset to auto-fill grid when there are enough products
        productsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        productsGrid.style.maxWidth = '';
        productsGrid.style.margin = '2rem 0';
    }
    
    productsGrid.innerHTML = products.map(product => {
        const productImage = product.image || '';
        const imageHtml = productImage 
            ? `<div class="storefront-product-img-container" style="height: 200px; overflow: hidden; border-radius: 0.5rem; margin-bottom: 1rem;"><img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<div style=\\'height: 100%; background: var(--grey); display: flex; align-items: center; justify-content: center;\\'><i class=\\'bx bxs-package\\' style=\\'font-size: 3rem; color: var(--blue);\\'></i></div>'"></div>`
            : `<div class="storefront-product-img-placeholder" style="height: 200px; background: var(--grey); display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-bottom: 1rem;"><i class='bx bxs-package' style="font-size: 3rem; color: var(--blue);"></i></div>`;
        
        const addToCartHtml = isBuyerLoggedIn && product.stock > 0 ? `
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center; margin-top: 1rem;">
                <input type="number" min="1" max="${product.stock}" value="1" 
                       id="storefront-qty-${product._id}" 
                       style="width: 60px; padding: 0.5rem; border: 1px solid var(--storefront-body-color); border-radius: 0.25rem; text-align: center;">
                <button onclick="addToStorefrontCart('${product._id}', '${escapeHtml(product.title)}', ${product.price}, ${product.stock})" 
                        class="storefront-button">
                    Add to Cart
                </button>
            </div>
            ${product.stock === 0 ? '<p style="color: var(--storefront-first-color); font-size: 0.85em; margin-top: 8px; text-align: center;">Out of Stock</p>' : ''}
        ` : isBuyerLoggedIn && product.stock === 0 ? '<p style="color: var(--storefront-first-color); font-size: 0.85em; margin-top: 8px; text-align: center;">Out of Stock</p>' : '';
        
        return `
            <div class="storefront-product-card">
                ${imageHtml}
                <h3 class="storefront-product-title">${escapeHtml(product.title)}</h3>
                <p class="storefront-product-description">${escapeHtml(product.description || '')}</p>
                <div class="storefront-product-info">
                    <span class="storefront-product-price">$${product.price.toFixed(2)}</span>
                    <span class="storefront-product-category">${escapeHtml(product.category)}</span>
                </div>
                ${addToCartHtml}
            </div>
        `;
    }).join('');
}

// Add to storefront cart (global function)
window.addToStorefrontCart = function(productId, title, price, stock) {
    if (currentRole !== 'buyer' || !currentUserId) {
        alert('Please log in as a buyer first.');
        return;
    }
    
    const quantityInput = document.getElementById(`storefront-qty-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }
    
    if (quantity > stock) {
        alert(`Only ${stock} items available in stock.`);
        return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
        if (existingItem.quantity > stock) {
            existingItem.quantity = stock;
            alert(`Maximum ${stock} items available. Quantity adjusted.`);
        }
    } else {
        cart.push({
            productId,
            title,
            price,
            quantity,
            stock
        });
    }
    
    updateStorefrontCart();
    updateStorefrontCartBadge();
    alert(`${quantity} ${title} added to cart!`);
};

// Update storefront cart display
function updateStorefrontCart() {
    const cartItems = document.getElementById('storefrontCartItems');
    const cartTotal = document.getElementById('storefrontCartTotal');
    const placeOrderBtn = document.getElementById('storefrontPlaceOrderBtn');
    
    if (!cartItems || !cartTotal || !placeOrderBtn) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: var(--storefront-text-color);">Your cart is empty</p>';
        cartTotal.textContent = 'Total: $0.00';
        placeOrderBtn.disabled = true;
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    placeOrderBtn.disabled = false;
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--storefront-body-color); border-radius: 0.5rem; margin-bottom: 0.5rem;">
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p style="font-size: 0.875rem; color: var(--storefront-text-color); margin-top: 0.25rem;">Qty: ${item.quantity} × $${item.price.toFixed(2)}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-weight: var(--storefront-font-bold);">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeFromStorefrontCart(${index})" style="background: var(--storefront-first-color); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">Remove</button>
            </div>
        </div>
    `).join('');
}

// Remove from storefront cart (global function)
window.removeFromStorefrontCart = function(index) {
    cart.splice(index, 1);
    updateStorefrontCart();
    updateStorefrontCartBadge();
};

// Update storefront cart badge
function updateStorefrontCartBadge() {
    const cartBadge = document.getElementById('storefrontCartBadge');
    if (!cartBadge) return;
    
    // Only show badge if buyer is logged in
    if (currentRole !== 'buyer' || !currentUserId) {
        cartBadge.style.display = 'none';
        return;
    }
    
    const totalItems = cart.reduce((sum, item) => {
        // Ensure quantity is a valid number
        const qty = parseInt(item.quantity) || 0;
        return sum + qty;
    }, 0);
    
    if (totalItems > 0) {
        // Format large numbers (e.g., 99+ for numbers over 99)
        cartBadge.textContent = totalItems > 99 ? '99+' : totalItems.toString();
        cartBadge.style.display = 'flex';
    } else {
        cartBadge.style.display = 'none';
    }
}

// Handle storefront place order
async function handleStorefrontPlaceOrder() {
    if (!currentUserId) {
        alert('Error: Buyer ID not set. Please log in as a buyer again.');
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty. Add products before placing an order.');
        return;
    }

    try {
        const items = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));

        const requestBody = {
            buyerId: currentUserId,
            items
        };

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Failed to place order (${response.status})`);
        }

        alert(`Order placed successfully! Order ID: ${responseData._id.slice(-6)}`);
        
        // Clear cart
        cart = [];
        updateStorefrontCart();
        updateStorefrontCartBadge();
        loadStorefrontOrders();
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Failed to place order: ' + error.message);
    }
}

// Load storefront orders
async function loadStorefrontOrders() {
    if (!currentUserId || currentRole !== 'buyer') return;
    
    try {
        const response = await fetch(`${API_BASE}/orders?buyerId=${currentUserId}`);
        const orders = await response.json();
        
        const ordersList = document.getElementById('storefrontOrdersList');
        if (!ordersList) return;
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--storefront-text-color);">No orders yet</p>';
            return;
        }
        
        ordersList.innerHTML = orders.map(order => {
            const statusColor = order.status === 'paid' ? 'green' : order.status === 'cancelled' ? 'red' : 'orange';
            return `
                <div style="background: var(--storefront-body-color); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Order #${order._id.slice(-8)}</h4>
                            <p style="font-size: 0.875rem; color: var(--storefront-text-color);">${new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.875rem; text-transform: uppercase;">${order.status}</span>
                            <p style="font-weight: var(--storefront-font-bold); margin-top: 0.5rem; font-size: 1.25rem;">$${order.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                    <div style="border-top: 1px solid var(--storefront-body-color); padding-top: 1rem;">
                        <p style="font-weight: var(--storefront-font-medium); margin-bottom: 0.5rem;">Items:</p>
                        ${order.items.map(item => `
                            <p style="font-size: 0.875rem; color: var(--storefront-text-color);">
                                ${item.quantity}x ${item.productId?.title || 'Product'} - $${item.subtotal.toFixed(2)}
                            </p>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        const ordersList = document.getElementById('storefrontOrdersList');
        if (ordersList) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--storefront-first-color);">Failed to load orders</p>';
        }
    }
}

// Open storefront profile modal
async function openStorefrontProfileModal() {
    if (!currentUserId || currentRole !== 'buyer') {
        alert('Please log in as a buyer first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${currentUserId}`);
        const user = await response.json();
        
        const profileInfo = document.getElementById('storefrontProfileModalInfo');
        if (profileInfo) {
            profileInfo.innerHTML = `
                <div class="profile-display">
                    <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(user.email || 'Not provided')}</p>
                    <p><strong>Role:</strong> <span class="role-badge buyer-badge">${escapeHtml(user.role)}</span></p>
                    <p><strong>Member Since:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
            `;
            
            // Populate form
            document.getElementById('storefrontModalUserName').value = user.name;
            document.getElementById('storefrontModalUserEmail').value = user.email || '';
        }
        
        // Show modal
        const profileModal = document.getElementById('storefrontProfileModal');
        if (profileModal) {
            profileModal.classList.add('show');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile information');
    }
}

// Setup storefront profile modal
function setupStorefrontProfileModal() {
    const profileModal = document.getElementById('storefrontProfileModal');
    const closeProfileModal = document.getElementById('storefrontCloseProfileModal');
    const cancelProfileModal = document.getElementById('storefrontCancelProfileModal');
    const profileModalForm = document.getElementById('storefrontProfileModalForm');
    
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => {
            if (profileModal) profileModal.classList.remove('show');
        });
    }
    
    if (cancelProfileModal) {
        cancelProfileModal.addEventListener('click', () => {
            if (profileModal) profileModal.classList.remove('show');
        });
    }
    
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('show');
            }
        });
    }
    
    if (profileModalForm) {
        profileModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserId) return;
            
            try {
                const updateData = {
                    name: document.getElementById('storefrontModalUserName').value.trim(),
                };
                
                const email = document.getElementById('storefrontModalUserEmail').value.trim();
                if (email) {
                    updateData.email = email;
                }
                
                const response = await fetch(`${API_BASE}/users/${currentUserId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to update profile');
                }

                alert('Profile updated successfully!');
                profileModal.classList.remove('show');
                await initializeUsers(); // Reload users
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Failed to update profile: ' + error.message);
            }
        });
    }
    
    // Close with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileModal && profileModal.classList.contains('show')) {
            profileModal.classList.remove('show');
        }
    });
}

// Initialize storefront profile menu on load
function initializeStorefrontProfileMenu() {
    updateStorefrontProfileMenu();
    setupStorefrontProfileModal();
}

// Handle New Arrival cart icon click
window.handleNewArrivalCartClick = function(productId, title, price, stock) {
    if (currentRole !== 'buyer' || !currentUserId) {
        // Buyer not logged in, prompt to log in
        const loginConfirmed = confirm('Please log in as a buyer to add items to your cart. Would you like to log in now?');
        if (loginConfirmed) {
            // Use setTimeout to ensure the menu opens after the confirm dialog closes
            setTimeout(() => {
                const profileIcon = document.getElementById('storefrontProfileIcon');
                const profileMenu = document.getElementById('storefrontProfileMenu');
                
                if (profileIcon && profileMenu) {
                    // Use the exposed function if available, otherwise open directly
                    if (window.openStorefrontProfileMenu) {
                        window.openStorefrontProfileMenu();
                    } else {
                        // Fallback: open directly
                        profileMenu.classList.remove('hidden');
                        profileMenu.classList.add('show');
                    }
                    
                    // Force display in case CSS isn't applying
                    if (window.getComputedStyle(profileMenu).display === 'none') {
                        profileMenu.style.display = 'block';
                    }
                    
                    // Scroll to profile icon if needed
                    const rect = profileIcon.getBoundingClientRect();
                    if (rect.top < 0 || rect.bottom > window.innerHeight) {
                        profileIcon.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    // Fallback: trigger buyer login directly
                    console.warn('Profile menu elements not found, logging in directly');
                    handleBuyerLogin();
                }
            }, 150);
        }
        return;
    }
    
    // Buyer is logged in, add to cart
    if (stock === 0) {
        alert('This product is out of stock.');
        return;
    }
    
    // Add to cart with quantity 1
    addToStorefrontCart(productId, title, price, stock);
};

// Handle Shop Navigation (used by Shop Now buttons and Shop link)
function handleShopNavigation() {
    if (currentRole === 'buyer' && currentUserId) {
        // Buyer is logged in, scroll to products section
        const productsSection = document.querySelector('.storefront-new') || document.querySelector('.storefront-products') || document.getElementById('storefrontProductsGrid');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        // Buyer not logged in, prompt to log in
        const loginConfirmed = confirm('Please log in as a buyer to shop. Would you like to log in now?');
        if (loginConfirmed) {
            // Use setTimeout to ensure the menu opens after the confirm dialog closes
            setTimeout(() => {
                const profileIcon = document.getElementById('storefrontProfileIcon');
                const profileMenu = document.getElementById('storefrontProfileMenu');
                
                if (profileIcon && profileMenu) {
                    // Use the exposed function if available, otherwise open directly
                    if (window.openStorefrontProfileMenu) {
                        window.openStorefrontProfileMenu();
                    } else {
                        // Fallback: open directly
                        profileMenu.classList.remove('hidden');
                        profileMenu.classList.add('show');
                    }
                    
                    // Force display in case CSS isn't applying
                    if (window.getComputedStyle(profileMenu).display === 'none') {
                        profileMenu.style.display = 'block';
                    }
                    
                    // Scroll to profile icon if needed (but don't force scroll if already visible)
                    const rect = profileIcon.getBoundingClientRect();
                    if (rect.top < 0 || rect.bottom > window.innerHeight) {
                        profileIcon.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    // Fallback: trigger buyer login directly
                    console.warn('Profile menu elements not found, logging in directly');
                    handleBuyerLogin();
                }
            }, 150); // Small delay to ensure confirm dialog is fully closed and click events are processed
        }
    }
}

// Handle Shop Now button click
window.handleShopNowClick = function() {
    handleShopNavigation();
};

// Open product detail modal
window.openProductDetailModal = async function(productId) {
    try {
        // Fetch product details
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        const product = await response.json();
        
        const modal = document.getElementById('storefrontProductDetailModal');
        const modalBody = document.getElementById('storefrontProductDetailBody');
        const modalTitle = document.getElementById('storefrontProductDetailTitle');
        
        if (!modal || !modalBody || !modalTitle) return;
        
        // Set title
        modalTitle.textContent = escapeHtml(product.title);
        
        // Get seller name if available
        const sellerName = product.sellerId?.name || 'Unknown Seller';
        
        // Check if buyer is logged in
        const isBuyerLoggedIn = currentRole === 'buyer' && currentUserId;
        
        // Build product image HTML
        const productImageHtml = product.image 
            ? `<div style="width: 100%; max-width: 400px; margin: 0 auto 2rem; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" style="width: 100%; height: auto; display: block;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\'%3E%3Crect fill=\\'%23f0f0f0\\' width=\\'400\\' height=\\'400\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' font-size=\\'48\\' fill=\\'%23999\\'%3E%3C/svg%3E'">
            </div>`
            : `<div style="width: 100%; max-width: 400px; height: 400px; margin: 0 auto 2rem; background: var(--storefront-body-color); border-radius: 1rem; display: flex; align-items: center; justify-content: center;">
                <i class='bx bxs-package' style="font-size: 5rem; color: var(--storefront-first-color);"></i>
            </div>`;
        
        // Build add to cart section
        const addToCartHtml = isBuyerLoggedIn && product.stock > 0 ? `
            <div style="display: flex; align-items: center; gap: 1rem; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--storefront-body-color);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <label style="font-weight: var(--storefront-font-bold);">Quantity:</label>
                    <input type="number" min="1" max="${product.stock}" value="1" 
                           id="storefront-product-detail-qty" 
                           style="width: 80px; padding: 0.75rem; border: 2px solid var(--storefront-body-color); border-radius: 0.5rem; text-align: center; font-size: 1rem;">
                </div>
                <button onclick="addProductDetailToCart('${product._id}', '${escapeHtml(product.title)}', ${product.price}, ${product.stock})" 
                        class="storefront-button" style="flex: 1; max-width: 300px; padding: 0.75rem 2rem; font-size: 1rem;">
                    <i class="bx bx-cart-alt" style="margin-right: 0.5rem;"></i>Add to Cart
                </button>
            </div>
        ` : isBuyerLoggedIn && product.stock === 0 ? `
            <div style="margin-top: 2rem; padding: 1rem; background: #fee; border-radius: 0.5rem; text-align: center;">
                <p style="color: var(--storefront-first-color); font-weight: var(--storefront-font-bold);">Out of Stock</p>
            </div>
        ` : '';
        
        // Populate modal body
        modalBody.innerHTML = `
            ${productImageHtml}
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: var(--storefront-font-bold); color: var(--storefront-title-color); margin-bottom: 0.5rem;">${escapeHtml(product.title)}</h3>
                        <p style="color: var(--storefront-text-color); font-size: 0.9rem;">
                            <span style="font-weight: var(--storefront-font-medium);">Category:</span> ${escapeHtml(product.category)}
                        </p>
                        <p style="color: var(--storefront-text-color); font-size: 0.9rem; margin-top: 0.25rem;">
                            <span style="font-weight: var(--storefront-font-medium);">Seller:</span> ${escapeHtml(sellerName)}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 2rem; font-weight: var(--storefront-font-bold); color: var(--storefront-first-color); margin-bottom: 0.5rem;">$${product.price.toFixed(2)}</p>
                        <p style="color: var(--storefront-text-color); font-size: 0.9rem;">
                            <span style="font-weight: var(--storefront-font-medium);">Stock:</span> ${product.stock} available
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-weight: var(--storefront-font-bold); margin-bottom: 0.75rem; color: var(--storefront-title-color);">Description</h4>
                    <p style="color: var(--storefront-text-color); line-height: 1.6;">${escapeHtml(product.description || 'No description available.')}</p>
                </div>
                
                ${addToCartHtml}
            </div>
        `;
        
        // Show modal
        modal.classList.add('show');
        
        // Close modal handlers
        const closeBtn = document.getElementById('storefrontCloseProductDetailModal');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('show');
        }
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
        
        // Close with ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
    } catch (error) {
        console.error('Error loading product details:', error);
        alert('Failed to load product details. Please try again.');
    }
};

// Add product to cart from detail modal
window.addProductDetailToCart = function(productId, title, price, stock) {
    if (currentRole !== 'buyer' || !currentUserId) {
        alert('Please log in as a buyer first.');
        return;
    }
    
    const quantityInput = document.getElementById('storefront-product-detail-qty');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }
    
    if (quantity > stock) {
        alert(`Only ${stock} items available in stock.`);
        return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
        if (existingItem.quantity > stock) {
            existingItem.quantity = stock;
            alert(`Maximum ${stock} items available. Quantity adjusted.`);
        }
    } else {
        cart.push({
            productId,
            title,
            price,
            quantity,
            stock
        });
    }
    
    updateStorefrontCart();
    updateStorefrontCartBadge();
    alert(`${quantity} ${title} added to cart!`);
    
    // Close modal
    const modal = document.getElementById('storefrontProductDetailModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

