import express from 'express'
import {
  getAccountToReconcile,
  getOtherAccounts,
} from '../controllers/account.controller.js'

const router = express.Router()

router.route('/').get(getOtherAccounts)
router.route('/:id').get(getAccountToReconcile)
export default router
