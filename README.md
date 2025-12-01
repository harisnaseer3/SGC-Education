# SGCEducation - MERN Stack Application

A full-stack web application built with MongoDB, Express, React, and Node.js.

## Project Structure

```
SGCEducation/
├── client/          # React.js frontend application
├── server/          # Node.js/Express backend application
└── README.md        # Project documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

## Getting Started

### Backend Setup (Server)

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sgceducation
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup (Client)

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The client will run on `http://localhost:3000`

## Available Scripts

### Server Scripts
- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon

### Client Scripts
- `npm start` - Start the development server
- `npm run build` - Build the app for production
- `npm test` - Run tests

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- CORS
- dotenv

### Frontend
- React.js
- React Scripts

## License

ISC

# SGCEducation
