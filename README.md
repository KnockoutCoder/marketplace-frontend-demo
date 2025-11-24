# KC Mart - Marketplace Frontend

> **Note**: This frontend was built to demonstrate my bootcamp backend API project. It currently uses `https://kc-mart-api.onrender.com` as its API base URL. However, this frontend is completely reusable - you can easily change the API base URL in `frontend/app.js` (line 2) to connect it to any compatible backend API.

A production-ready, decoupled marketplace frontend built with vanilla JavaScript that demonstrates complete RESTful API integration. This frontend is designed to work with any backend that implements the same API contract, making it a reusable storefront solution.

## 🎯 Overview

KC Mart is a full-featured e-commerce marketplace frontend that showcases how a frontend can be completely decoupled from backend implementation. The application features:

- **Zero hardcoded data** - All data comes from API calls
- **Complete CRUD operations** - Users, Products, and Orders
- **Role-based access** - Admin, Seller, and Buyer interfaces
- **Real-time data synchronization** - All changes reflect immediately
- **Production-ready** - Error handling, image uploads, and responsive design

## ✨ Features

### For Buyers
- Browse products with category filtering
- Add products to cart
- Place orders
- View order history
- Update profile information

### For Sellers
- Create, edit, and delete products
- Upload product images (base64 or URL)
- View orders for their products
- Manage store information

### For Admins
- View all users, products, and orders
- Create new users (buyers, sellers, admins)
- View platform-wide statistics
- Manage entire marketplace

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Custom CSS
- **Icons**: Boxicons, Remixicon
- **Carousel**: Swiper.js
- **API Communication**: Fetch API
- **No frameworks or build tools** - Pure web technologies

## 📁 Project Structure

```
KC-Mart-Frontend/
├── frontend/
│   ├── app.js              # Main application logic (all API calls)
│   ├── index.html          # Storefront page
│   ├── dashboard.html      # Admin/Seller dashboard
│   ├── style.css           # Dashboard styles
│   ├── storefront.css      # Storefront styles
│   └── images/             # Logo and assets
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- A web server (or open HTML files directly)
- A backend API implementing the required endpoints (see API Contract below)
- Modern web browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd KC-Mart-Frontend
   ```

2. **Configure API endpoint**
   - Open `frontend/app.js`
   - Update line 2 with your backend API URL:
   ```javascript
   const API_BASE = 'https://your-backend-api.com';
   ```

3. **Open in browser**
   - Open `frontend/index.html` for the storefront
   - Open `frontend/dashboard.html` for the admin/seller dashboard
   - Or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

## 🔌 API Integration

This frontend communicates with the backend through **11 REST endpoints**:

### Users
- `GET /users` - Fetch all users
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user

### Products
- `GET /products` - Fetch all products (supports `?category=` and `?sellerId=` filters)
- `POST /products` - Create product
- `GET /products/:id` - Get product by ID
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Orders
- `GET /orders` - Fetch all orders (supports `?buyerId=` filter)
- `POST /orders` - Create order

> **Note**: The backend API actually has 12 endpoints total, including `GET /orders/:id` to fetch a single order by ID. However, this endpoint was not implemented in the frontend, so the frontend currently uses 11 of the 12 available endpoints.

### Total API Calls
The frontend makes **37 API calls** throughout the application.

## 📋 API Contract

For this frontend to work, your backend must implement the following data structures:

### User Object
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "buyer" | "seller" | "admin",
  "createdAt": "ISO date string"
}
```

### Product Object
```json
{
  "_id": "string",
  "title": "string",
  "description": "string",
  "price": "number",
  "stock": "number",
  "category": "string",
  "sellerId": "string" | { "_id": "string", "name": "string" },
  "image": "string" // base64 or URL
}
```

### Order Object
```json
{
  "_id": "string",
  "buyerId": "string" | { "_id": "string", "name": "string" },
  "items": [
    {
      "productId": "string" | { "_id": "string", "title": "string", "price": "number" },
      "quantity": "number",
      "price": "number"
    }
  ],
  "totalAmount": "number",
  "status": "string",
  "createdAt": "ISO date string"
}
```

## 🎨 Key Features Demonstrated

### 1. Decoupled Architecture
The frontend is completely independent of backend technology. It works with any backend (Node.js, Python, Java, etc.) that implements the same REST API contract.

### 2. Image Handling
- Supports both file uploads (converted to base64) and image URLs
- Handles image loading errors gracefully
- Displays images directly from API responses

### 3. Error Handling
- All API calls wrapped in try-catch blocks
- User-friendly error messages
- Graceful degradation when backend is unavailable

### 4. Dynamic UI Updates
- Single API call powers multiple UI components
- Real-time data synchronization
- Role-based interface changes

### 5. Responsive Design
- Works on desktop and mobile devices
- Adaptive layouts for different screen sizes
- Centered layouts when content is sparse

## 🔍 Usage Examples

### Viewing Products
1. Open `frontend/index.html` in your browser
2. Products are automatically loaded from the backend
3. Use category filters or search to find specific products

### Creating a Product (Seller)
1. Open `frontend/dashboard.html`
2. Select a seller role from "View As" dropdown
3. Navigate to "Create Product"
4. Fill out the form and upload an image
5. Click "Create Product" - it's saved to the backend immediately

### Placing an Order (Buyer)
1. On the storefront, log in as a buyer
2. Add products to cart
3. Click "Place Order"
4. Order is created in the backend and appears in order history

## 🧪 Testing

To test the frontend with your backend:

1. Ensure your backend is running and accessible
2. Update `API_BASE` in `app.js` to point to your backend
3. Open the application in a browser
4. Use browser DevTools Network tab to monitor API calls
5. Test all CRUD operations for users, products, and orders

## 📊 Statistics

- **37 API calls** throughout the application
- **11 unique endpoints** used
- **3 main entities** (Users, Products, Orders)
- **3 user roles** (Admin, Seller, Buyer)
- **2 main pages** (Storefront, Dashboard)
- **Zero dependencies** (except CDN libraries for icons and carousel)

## 🎓 Learning Outcomes

This project demonstrates:
- RESTful API integration patterns
- Decoupled frontend architecture
- Error handling best practices
- Role-based access control
- Image upload and handling
- Real-time data synchronization
- Production-ready code structure

## 🤝 Contributing

This is a demonstration project. Feel free to:
- Use it as a learning resource
- Adapt it for your own projects
- Improve the code and submit suggestions

## 📝 License

This project is open source and available for educational and commercial use.

## 🔗 Backend API

The frontend is designed to work with a RESTful backend API. Currently configured to use `https://kc-mart-api.onrender.com` (my bootcamp backend API project). The backend should be deployed and accessible via the URL specified in `API_BASE` in `frontend/app.js` (line 2).

**Current API**: `https://kc-mart-api.onrender.com`

To use a different backend, simply update the `API_BASE` constant in `frontend/app.js`.

## 💡 Notes

- All data is fetched from the backend - no hardcoded values
- The frontend is framework-agnostic and can work with any compatible backend
- Image uploads are converted to base64 for API transmission
- The application handles network errors gracefully
- Role-based filtering is handled through API query parameters

## 📞 Support

For questions about API integration, check the API endpoints section above or examine the code in `frontend/app.js` where all API calls are documented with comments.

---

**Built with ❤️ to demonstrate frontend-backend integration**

