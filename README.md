# Physicality

Physicality is an online shop for printed game posters, custom artwork posters, and custom DVD cover boxes. Customers can browse products, create an account, pay for an order, and follow its delivery. Staff can manage the catalogue and update orders from the press office.

## What the website does

### For customers

- Browse the poster catalogue and choose a poster size and frame.
- Upload an image to order a custom poster.
- Create custom DVD cover artwork for a chosen game platform.
- Add products to a cart, enter a press code when applicable, and see the total before checkout.
- Enter delivery details and pay through Razorpay.
- View past orders in an account or look up an order with its order number and checkout email.
- See order progress and, when staff add them, the courier, tracking number, and partner tracking link.

Poster offers include a free poster when the cart reaches the qualifying quantity. The product added that reaches the offer threshold is the free one, and its own price is deducted.

### For staff

- Add, edit, and remove catalogue editions.
- Review paid orders, customer delivery details, items, and discounts.
- View the image uploaded for each custom poster order.
- Update order status, delivery method, courier, tracking number, and partner tracking link. Customers can see saved delivery details in their account or order lookup.

## How the project is organized

- `frontend/` contains the React website.
- `backend/` contains the FastAPI service and MongoDB data access.
- `backend/server.py` provides the API for products, orders, payments, uploads, customer accounts, and admin actions.

## Run it locally

You need Node.js, Python, and access to a MongoDB database.

1. Configure the backend:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   ```

   Edit `backend/.env` and set `MONGO_URL`, `DB_NAME`, and a private `JWT_SECRET`. Razorpay keys are needed for real checkout. For local testing only, mock payments can be enabled with `ALLOW_MOCK_PAYMENTS=true`.

2. Start the API in a terminal:

   ```powershell
   cd backend
   python -m pip install -r requirements.txt
   python -m uvicorn server:app --reload
   ```

3. Configure and start the website in another terminal:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm start
   ```

   The website opens at `http://localhost:3000`. Its local API address is set by `REACT_APP_BACKEND_URL` in `frontend/.env`.

## Check the project

Run backend tests from the `backend/` folder:

```powershell
python -m unittest test_pricing test_orders test_payments test_uploads
```

Build the website from the `frontend/` folder:

```powershell
npm run build
```

## Configuration and safety

- Keep real credentials in local environment files, not in source control.
- Use Razorpay test keys for development. Do not enable mock payments in production.
- Set `FRONTEND_URL` on the backend to the website's URL when deploying.
- Set `REACT_APP_BACKEND_URL` on the frontend build to the backend's origin.
