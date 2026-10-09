# Voice Kitchen

A voice food-order page. Press **Start Conversation**, say the order, and the finished order opens in a popup as JSON.

The menu is in `backend/src/data/menu.js`. There is no database. The server checks that file and adds the prices.

## Run

Add your Google key in `backend/.env`:

```
PORT=3002
GEMINI_API_KEY=your_key_here
```

Start the server:

```bash
cd backend
npm install
npm run dev
```

Start the page from the project folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The page calls `/api/...`. Those calls go to the server at `http://localhost:3002`. For another server address, set `SERVER_URL` before starting the page.

## Order flow

1. **Start Conversation** asks the server for a short voice pass (`POST /api/talk/start`). The Google key stays on the server.
2. The page opens the Gemini voice line with that pass, sends the microphone, and plays the spoken reply.
3. When the order is finished, Gemini calls `createOrder` with the food names and amounts.
4. The page sends that list to `POST /api/orders`. The server checks the menu, adds the prices, and the popup shows that JSON.
