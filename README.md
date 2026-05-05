Real-Time Coding Interview Platform
A full-stack platform for conducting live technical interviews with real-time collaborative coding, multi-language code execution, and role-based authentication.
🔗 Live Demo: coding-interviewplatform.vercel.app

 Features

 Real-Time Collaborative Coding — Two users can code together simultaneously in the same editor using Socket.IO
 JWT-Based Role Authentication — Separate roles for Student and Interviewer with protected routes
 Multi-Language Code Execution — Supports Java, Python, C++ and JavaScript via Judge0 API
 Instant Test Case Evaluation — Submit code and get instant pass/fail feedback
 Live Sync — Code changes reflect in real-time for both participants


 Tech Stack
Frontend
React.js- UI components and routingSocket.IO - ClientReal-time communication  JWT- Token-based auth on client side
Backend
Node.js - Server runtime   Express.js- REST API framework   Socket.IO- WebSocket server for real-time syncn  JWT- Authentication and role management  Judge0 -APICode execution engine
Database
PostgreSQL  Storing users, sessions, results


Installation
1. Clone the repository
bashgit clone https://github.com/Sejal1510/coding-interviewplatform.git
cd coding-interviewplatform
2. Setup Backend
bashcd server
npm install
Create a .env file in /server:
envPORT=5000
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_postgresql_url
JUDGE0_API_KEY=your_judge0_api_key
bashnpm start
3. Setup Frontend
bashcd client
npm install
npm start
4. Open in browser


 How It Works
Interviewer creates a room
        ↓
Student joins with room code
        ↓
Both see the same code editor (real-time sync via Socket.IO)
        ↓
Student writes code in Java/Python/C++/JavaScript
        ↓
Clicks Submit → Judge0 API evaluates code
        ↓
Instant pass/fail result shown to both!

 User Roles
RoleAccessInterviewerCreate rooms, set problems, view candidate code liveStudentJoin rooms, write and submit code, see test results

 Deployment

Frontend — Deployed on Vercel
Backend — Deployed on Render
