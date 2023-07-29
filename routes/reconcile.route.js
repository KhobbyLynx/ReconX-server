import express from 'express'
import { getAccountToReconcile } from '../controllers/account.controller.js'

const router = express.Router()

router.route('/').get(getAccountToReconcile)
export default router
