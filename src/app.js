import express from 'express'

const app = express()

// Routes Connect

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));

export default app