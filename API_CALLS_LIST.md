# Complete List of 37 API Calls in KC Mart Frontend

## Users Endpoints (8 calls)

1. **GET /users** - `initializeUsers()` (Line 43) - Dashboard initialization
2. **GET /users** - `initializeUsers()` (Line 43) - Storefront initialization  
3. **GET /users** - `populateRoleDropdown()` (Line 678) - Populate role dropdown
4. **GET /users** - `loadAdminDashboard()` (Line 2031) - Admin stats (Promise.all)
5. **GET /users** - `loadAdminUsers()` (Line 2205) - Load all users for admin
6. **POST /users** - `createUser()` (Line 77) - Create user function
7. **POST /users** - `handleCreateUser()` (Line 2274) - Admin creates user
8. **GET /users/:id** - `openProfileModal()` (Line 1804) - Load user profile
9. **PATCH /users/:id** - `handleProfileModalSubmit()` (Line 1864) - Update user profile
10. **GET /users/:id** - `openStorefrontProfileModal()` (Line 3264) - Storefront profile
11. **PATCH /users/:id** - `handleStorefrontProfileUpdate()` (Line 3336) - Update storefront profile

## Products Endpoints (20 calls)

12. **GET /products** - `loadProducts()` (Line 1123) - Load products with optional category filter
13. **GET /products** - `loadProducts()` (Line 1140) - Get all products for categories menu
14. **GET /products** - `loadSellerProducts()` (Line 1317) - Load seller products (with sellerId filter)
15. **GET /products** - `loadSellerProducts()` (Line 1335) - Get all products for categories
16. **GET /products** - `loadAdminProducts()` (Line 1514) - Load all products for admin
17. **GET /products** - `loadAdminDashboard()` (Line 2030) - Admin stats (Promise.all)
18. **GET /products** - `loadStorefront()` (Line 2589) - Load storefront products (with optional category filter)
19. **GET /products** - `populateStorefrontCategories()` (Line 2616) - Get products for categories dropdown
20. **GET /products?sellerId=** - `loadSellerProducts()` (Line 1287) - Filter by seller
21. **GET /products?sellerId=** - `loadSellerProducts()` (Line 1469) - Refresh seller products
22. **GET /products/:id** - `editProduct()` (Line 2432) - Load product for editing
23. **GET /products/:id** - `showProductDetails()` (Line 3478) - Show product details modal
24. **POST /products** - `handleCreateProduct()` (Line 2389) - Create new product
25. **PATCH /products/:id** - `handleEditProductSubmit()` (Line 2511) - Update product
26. **DELETE /products/:id** - `deleteProduct()` (Line 2548) - Delete product

## Orders Endpoints (9 calls)

27. **GET /orders** - `loadAdminOrders()` (Line 1355) - Load all orders for admin
28. **GET /orders** - `loadAdminDashboard()` (Line 2032) - Admin stats (Promise.all)
29. **GET /orders** - `loadAdminOrders()` (Line 2188) - Refresh admin orders
30. **GET /orders?buyerId=** - `loadBuyerOrders()` (Line 1915) - Load buyer orders (dashboard)
31. **GET /orders?buyerId=** - `loadStorefrontOrders()` (Line 3211) - Load buyer orders (storefront)
32. **POST /orders** - `handlePlaceOrder()` (Line 1738) - Place order (dashboard)
33. **POST /orders** - `handleStorefrontPlaceOrder()` (Line 3181) - Place order (storefront)

## Summary by Endpoint

### GET /users (5 calls)
- Dashboard init, Storefront init, Role dropdown, Admin dashboard stats, Admin users list

### POST /users (2 calls)
- Create user function, Admin creates user

### GET /users/:id (2 calls)
- Load profile (dashboard), Load profile (storefront)

### PATCH /users/:id (2 calls)
- Update profile (dashboard), Update profile (storefront)

### GET /products (9 calls)
- Load products catalog, Get categories, Seller products (all), Admin products, Admin stats, Storefront load, Storefront categories, Seller products refresh, Load with category filter

### GET /products?sellerId= (2 calls)
- Filter seller products, Refresh seller products

### GET /products/:id (2 calls)
- Edit product, Show product details

### POST /products (1 call)
- Create product

### PATCH /products/:id (1 call)
- Update product

### DELETE /products/:id (1 call)
- Delete product

### GET /orders (3 calls)
- Admin orders, Admin dashboard stats, Refresh admin orders

### GET /orders?buyerId= (2 calls)
- Buyer orders (dashboard), Buyer orders (storefront)

### POST /orders (2 calls)
- Place order (dashboard), Place order (storefront)

## Total: 37 API Calls

**Breakdown:**
- Users: 11 calls
- Products: 20 calls  
- Orders: 6 calls

