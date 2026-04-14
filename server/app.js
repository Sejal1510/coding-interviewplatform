const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const sessionRoutes = require('./routes/sessions')
const questionRoutes = require('./routes/questions')
const { setupCollabSockets } = require('./sockets/collab')

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
})

app.use(cors({
  origin: "*"
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/questions', questionRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  setupCollabSockets(io, socket)
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

const submissionRoutes = require('./routes/submissions')
// ...
app.use('/api/submissions', submissionRoutes)