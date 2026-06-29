const express = require('express');
const {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount
} = require('../../controllers/bankAccount.controller');

const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .get(getBankAccounts)
  .post(authorize('super_admin'), createBankAccount);

router
  .route('/:id')
  .get(getBankAccount)
  .put(authorize('super_admin'), updateBankAccount)
  .delete(authorize('super_admin'), deleteBankAccount);

module.exports = router;
