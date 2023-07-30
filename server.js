import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
dotenv.config()
import { connectDB } from './config/db.js'
import accountRoute from './routes/account.route.js'
import reconcileRoute from './routes/reconcile.route.js'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware.js'
import { multerMiddleware } from './middlewares/multer.js'
import { v2 as cloudinary } from 'cloudinary'

const port = process.env.PORT || 5000
const app = express()

cloudinary.config({
  cloud_name: 'khobbylynx',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(
  '/api/accounts',
  multerMiddleware({ limits: 10 * 1024 * 1024 }).single('file'),
  accountRoute
)
app.use('/api/reconcile', reconcileRoute)

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello from Account ReconX' })
})

app.use(errorHandler)

app.listen(port, () => {
  connectDB()
  console.log(`Server running on http://localhost:${port}`)
})
