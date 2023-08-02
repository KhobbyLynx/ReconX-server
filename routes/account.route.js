import express from 'express'
import {
  createAccount,
  deleteAccount,
  getAccounts,
  singleAccount,
  updateReconciliationStatus,
} from '../controllers/account.controller.js'

const router = express.Router()

router
  .route('/')
  .get(getAccounts)
  .post(createAccount)
  .delete(deleteAccount)
  .put(updateReconciliationStatus)
router.route('/:id').get(singleAccount)
export default router
