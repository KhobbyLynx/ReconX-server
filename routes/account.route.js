import express from 'express'
import {
  createAccount,
  deleteAccount,
  getAccounts,
  singleAccount,
} from '../controllers/account.controller.js'

const router = express.Router()

router.route('/').get(getAccounts).post(createAccount).delete(deleteAccount)
router.route('/:id').get(singleAccount)
export default router
